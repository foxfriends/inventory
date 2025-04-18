const A1 = require('@flighter/a1-notation');
const { join } = require('path');
const { promises: fs } = require('fs');
const { DateTime } = require('luxon');
const { google } = require('googleapis');
const { add, always, apply, construct, converge, indexOf, juxt, map, path, prop, propEq, when, zipWith } = require('ramda');
const { and } = require('../util/promise');
const { λ } = require('../util/keypath');
const log = require('../util/log');
const { TOKEN_PATH, SETTINGS_PATH, CREDENTIALS_PATH } = require('./env');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const AUTH_OPTIONS = { access_type: 'offline', scope: SCOPES, prompt: 'consent' };

const sheets = google.sheets('v4');

const constructClient = converge(construct(google.auth.OAuth2), [prop('client_id'), prop('client_secret'), path(['redirect_uris', 0])]);

class Google {
  #client;

  constructor(client, token) {
    this.#client = client;
    this.#setCredentials(token);
  }

  #setCredentials(token) {
    if (token) {
      this.#client.setCredentials(token);
    }
    this.#ready = !!token;
  }

  #ready = false;
  get ready() { return this.#ready; }

  async generateAuthUrl() {
    return this.#client.generateAuthUrl(AUTH_OPTIONS)
  }

  async auth(code) {
    const { tokens: token } = await this.#client.getToken(code);
    fs.writeFile(TOKEN_PATH, JSON.stringify(token))
      .catch(log.error('Failed to save token'));
    this.#setCredentials(token);
  }

  async setting(name) {
    return this
      .settings()
      .then(prop(name));
  }

  #settings;
  async settings(newSettings) {
    this.#settings = this.#settings || await fs
      .readFile(SETTINGS_PATH)
      .then(JSON.parse)
      .catch(always({}));
    if (newSettings) {
      Object.assign(this.#settings, newSettings);
      await fs.writeFile(SETTINGS_PATH, JSON.stringify(this.#settings));
    }
    return this.#settings;
  }

  async #columnIndexes() {
    const spreadsheetId = await this.setting('inventory');
    const spreadsheet = await sheets.spreadsheets
      .get({ spreadsheetId, auth: this.#client })
      .then(prop('data'));
    const { rowCount, columnCount } = spreadsheet.sheets[0].properties.gridProperties;
    const [skuColumn, quantityColumn] = await sheets.spreadsheets.values
      .get({
        spreadsheetId,
        range: new A1(1, 1, 1, columnCount).toString(),
        majorDimension: 'ROWS',
        valueRenderOption: 'UNFORMATTED_VALUE',
        auth: this.#client,
      })
      .then(path(['data', 'values', 0]))
      .then(juxt([indexOf('SKU'), indexOf('Quantity')]))
      .then(map(add(1)));
    return { skuColumn, quantityColumn, rowCount };
  }

  async getInventory() {
    const spreadsheetId = await this.setting('inventory');
    const GET_PARAMS = {
      spreadsheetId,
      valueRenderOption: 'UNFORMATTED_VALUE',
      auth: this.#client,
    };
    const { skuColumn, quantityColumn, rowCount } = await this.#columnIndexes();
    const [skus, quantities] = await sheets.spreadsheets.values
      .batchGet({
        ranges: [
          new A1(skuColumn, 2, rowCount, 1).toString(),
          new A1(quantityColumn, 2, rowCount, 1).toString(),
        ],
        majorDimension: 'COLUMNS',
        ...GET_PARAMS,
      })
      .then(path(['data', 'valueRanges']))
      .then(map(path(['values', 0])));
    return zipWith((sku, quantity) => ({ sku, quantity }), skus, quantities);
  }

  async pushInventory(source, inventory) {
    const spreadsheetId = await this.setting('inventory');
    const title = `${source} ${DateTime.local().toFormat('yyyy-MM-dd HH:mm:ss')}`;
    const PARAMS = {
      spreadsheetId,
      auth: this.#client,
    };
    const updated = await sheets.spreadsheets
      .batchUpdate({
        resource: {
          requests: [{ addSheet: { properties: { title } } }],
        },
        ...PARAMS,
      })
      .then(prop('data'));
    const headings = Object.keys(inventory[0]);
    const range = `'${title}'!${new A1(1, 1, inventory.length + 1, Object.keys(inventory[0]).length).toString()}`;
    await sheets.spreadsheets.values
      .update({
        range,
        valueInputOption: 'RAW',
        resource: {
          range,
          majorDimension: 'ROWS',
          values: [
            headings,
            ...inventory.map((entry) => headings.map((heading) => entry[heading])),
          ],
        },
        ...PARAMS,
      });
    return updated;
  }

  async setInventory(inventory, force = false) {
    const newInventory = force
      ? inventory
      : await this
        .getInventory()
        .then(map(({ sku, quantity }) => ({
          sku,
          quantity: sku
            ? inventory.find(propEq('sku', sku))?.quantity ?? quantity
            : '',
        })));
    const { skuColumn, quantityColumn } = await this.#columnIndexes();

    const spreadsheetId = await this.setting('inventory');
    const PARAMS = {
      spreadsheetId,
      auth: this.#client,
    };
    await sheets.spreadsheets.values
      .batchUpdate({
        resource: {
          valueInputOption: 'RAW',
          data: [
            {
              range: new A1(skuColumn, 2, newInventory.length, 1).toString(),
              majorDimension: 'COLUMNS',
              values: [newInventory.map(prop('sku'))],
            },
            {
              range: new A1(quantityColumn, 2, newInventory.length, 1).toString(),
              majorDimension: 'COLUMNS',
              values: [newInventory.map(prop('quantity'))],
            },
          ]
        },
        ...PARAMS,
      });
  }

  async acceptOrders(source, action, orders) {
    await this.logOrders(source, action, orders);
    const inventory = await this.getInventory();
    const orderItems = orders
      .flatMap(path([1, 'items']))
      .filter(prop('sku'));
    for (const { sku, quantity } of orderItems) {
      const index = inventory.findIndex(propEq('sku', sku));
      if (index !== -1) {
        inventory[index].quantity = Math.max(0, inventory[index].quantity - quantity);
      }
    }
    await this.setInventory(inventory, true);
    await Promise.allSettled([
      require('../etsy3/api').then(when(prop('ready'), λ.setInventory(inventory))),
      require('../shopify/api').then(when(prop('ready'), λ.setInventory(inventory))),
      require('../conartist/api').then(when(prop('ready'), λ.setInventory(inventory))),
    ]);
  }

  async logOrders(source, action, orders) {
    const spreadsheetId = await this.setting('orders');
    const values = orders.map(([raw, { orderedAt, items }]) => ([
      source,
      action,
      orderedAt.toISO(),
      JSON.stringify(items),
      JSON.stringify(raw),
    ]));
    const range = new A1(1, 1, 1, 5).toString();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      auth: this.#client,
      resource: {
        range,
        majorDimension: 'ROWS',
        values,
      },
    });
  }
}

const token = fs
  .readFile(TOKEN_PATH)
  .then(JSON.parse)
  .catch(always(undefined));

module.exports = fs
  .readFile(CREDENTIALS_PATH)
  .then(JSON.parse)
  .then(prop('web'))
  .then(constructClient)
  .then(and(always(token)))
  .then(apply(construct(Google)));
