const crypto = require('crypto');
const { promises: fs } = require('fs');
const { join } = require('path');
const { OAuth } = require('oauth');
const { always, apply, applySpec, construct, converge, last, map, prop, propEq, path } = require('ramda');
const { and } = require('../util/promise');
const log = require('../util/log');

const GET_INVENTORY = require('./queries/getInventory');

const ShopifyOAuth2 = require('./oauth');

const CREDENTIALS_PATH = join(__dirname, 'credentials.json');
const TOKEN_PATH = join(__dirname, 'token.json');
const SCOPES = ['read_products', 'write_inventory'];

const constructClient = converge(construct(ShopifyOAuth2), [prop('shop'), prop('api_key'), prop('secret_key'), prop('redirect_uri')]);

class Shopify {
  #client;

  constructor(client, token) {
    this.#client = client;
    this.#setCredentials(token);
  }

  #setCredentials(credentials) {
    if (credentials) {
      this.#client.setCredentials(credentials);
    }
    this.#ready = !!credentials;
  }

  #ready = false;
  get ready() { return this.#ready; }

  async generateAuthUrl() {
    const secret = crypto.randomBytes(20).toString('hex');
    const url = this.#client.generateAuthUrl(secret, SCOPES);
    return { secret, url }
  }

  async auth(code) {
    const token = await this.#client.getToken(code);
    fs.writeFile(TOKEN_PATH, JSON.stringify(token))
      .catch(log.error('Failed to save token'));
    this.#setCredentials(token);
  }

  async getInventory() {
    const inventoryLevels = [];

    for (let after = null;;) {
      // TODO: we only support one location for now.
      const page = await this.#client
        .graphql(GET_INVENTORY, { after })
        .then(path(['data', 'locations', 'edges', 0, 'node', 'inventoryLevels']));
      inventoryLevels.push(...page.edges);
      if (!page.pageInfo.hasNextPage) { break; }
      after = last(inventoryLevels).cursor;
    }

    return inventoryLevels
      .map(applySpec({
        name: path(['node', 'item', 'variant', 'displayName']),
        sku: path(['node', 'item', 'sku']),
        quantity: path(['node', 'available']),
      }));
  }

  async setInventory(inventory) {
    for (let after = null;;) {
      const location = await this.#client
        .graphql(GET_INVENTORY, { after })
        .then(path(['data', 'locations', 'edges', 0, 'node']));

      const adjustments = location
        .inventoryLevels
        .edges
        .map(applySpec({
          id: path(['node', 'id']),
          sku: path(['node', 'item', 'sku']),
          available: path(['node', 'available']),
        }))
        .map(({ id, sku, available }) => ({
          inventoryItemId: id,
          availableDelta: (inventory.find(propEq('sku', sku))?.quantity ?? available) - available,
        }))
        .filter(prop('availableDelta'));
      // await this.#client.graphql(UPDATE_INVENTORY, { location: location.id, adjustments });

      if (!location.inventoryLevels.pageInfo.hasNextPage) { return; }
      after = last(location.inventoryLevels.edges).cursor;
    }
  }
}

const token = fs
  .readFile(TOKEN_PATH)
  .then(JSON.parse)
  .catch(always(undefined));

module.exports = fs
  .readFile(CREDENTIALS_PATH)
  .then(JSON.parse)
  .then(constructClient)
  .then(and(always(token)))
  .then(apply(construct(Shopify)));
