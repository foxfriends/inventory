const A1 = require('@flighter/a1-notation');
const { join } = require('path');
const { promises: fs } = require('fs');
const { google } = require('googleapis');
const { add, always, apply, construct, converge, indexOf, juxt, path, prop, map, zipWith } = require('ramda');
const { and } = require('../util/promise');
const log = require('../util/log');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SETTINGS_PATH = join(__dirname, 'settings.json');
const TOKEN_PATH = join(__dirname, 'token.json');
const CREDENTIALS_PATH = join(__dirname, 'credentials.json');
const AUTH_OPTIONS = { access_type: 'offline', scope: SCOPES, prompt: 'consent' };

const sheets = google.sheets('v4');

const constructClient = converge(construct(google.auth.OAuth2), [prop('client_id'), prop('client_secret'), path(['redirect_uris', 0])]);

class Google {
  constructor(client, token) {
    this.client = client;
    this.setCredentials(token);
  }

  setCredentials(token) {
    if (token) {
      this.client.setCredentials(token);
    }
    this.ready = !!token;
  }

  async generateAuthUrl() {
    return this.client.generateAuthUrl(AUTH_OPTIONS)
  }

  async auth(code) {
    const { tokens: token } = await this.client.getToken(code);
    fs.writeFile(TOKEN_PATH, JSON.stringify(token))
      .catch(log.error('Failed to save token'));
    this.setCredentials(token);
  }

  async setting(name) {
    return this
      .settings()
      .then(prop(name));
  }

  async settings(newSettings) {
    this._settings = this._settings || await fs
      .readFile(SETTINGS_PATH)
      .then(JSON.parse)
      .catch(always({}));
    if (newSettings) {
      Object.assign(this._settings, newSettings);
      await fs.writeFile(SETTINGS_PATH, JSON.stringify(this._settings));
    }
    return this._settings;
  }

  async inventory(newInventory) {
    const spreadsheetId = await this.setting('spreadsheet');
    if (newInventory) {
      throw new Error('Not yet implemented');
    }
    const spreadsheet = await sheets.spreadsheets
      .get({ spreadsheetId, auth: this.client })
      .then(prop('data'));
    const { rowCount, columnCount } = spreadsheet.sheets[0].properties.gridProperties;
    const GET_PARAMS = {
      spreadsheetId,
      valueRenderOption: 'UNFORMATTED_VALUE',
      auth: this.client,
    };
    const [skuColumn, quantityColumn] = await sheets.spreadsheets.values
      .get({
        range: new A1(1, 1, 1, columnCount).toString(),
        majorDimension: 'ROWS',
        ...GET_PARAMS,
      })
      .then(path(['data', 'values', 0]))
      .then(juxt([indexOf('SKU'), indexOf('Quantity')]))
      .then(map(add(1)));
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
  .then(and(token))
  .then(apply(construct(Google)));
