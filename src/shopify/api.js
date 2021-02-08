const crypto = require('crypto');
const { promises: fs } = require('fs');
const { join } = require('path');
const { OAuth } = require('oauth');
const { always, apply, applySpec, construct, converge, last, map, prop, path } = require('ramda');
const { and } = require('../util/promise');
const log = require('../util/log');

const GET_INVENTORY = require('./queries/getInventory');

const ShopifyOAuth2 = require('./oauth');

const CREDENTIALS_PATH = join(__dirname, 'credentials.json');
const TOKEN_PATH = join(__dirname, 'token.json');
const SCOPES = ['read_products', 'write_inventory'];

const constructClient = converge(construct(ShopifyOAuth2), [prop('shop'), prop('api_key'), prop('secret_key'), prop('redirect_uri')]);

class Shopify {
  constructor(client, token) {
    this.client = client;
    this.setCredentials(token);
  }

  setCredentials(credentials) {
    if (credentials) {
      this.client.setCredentials(credentials);
    }
    this.ready = !!credentials;
  }

  async generateAuthUrl() {
    const secret = crypto.randomBytes(20).toString('hex');
    const url = this.client.generateAuthUrl(secret, SCOPES);
    return { secret, url }
  }

  async auth(code) {
    const token = await this.client.getToken(code);
    fs.writeFile(TOKEN_PATH, JSON.stringify(token))
      .catch(log.error('Failed to save token'));
    this.setCredentials(token);
  }

  async inventory(newInventory) {
    if (newInventory) {
      throw new Error('Not yet implemented');
    }
    // TODO: we only support one location for now.
    const inventoryLevels = await this.client
      .graphql(GET_INVENTORY)
      .then((res) => res.json())
      .then(path(['data', 'locations', 'edges', 0, 'node', 'inventoryLevels']));

    while (inventoryLevels.pageInfo.hasNextPage) {
      const page = await this.client
        .graphql(GET_INVENTORY, { after: last(inventoryLevels.edges).cursor })
        .then((res) => res.json())
        .then(path(['data', 'locations', 'edges', 0, 'node', 'inventoryLevels']));
      inventoryLevels.pageInfo = page.pageInfo;
      inventoryLevels.edges.push(...page.edges);
    }

    return inventoryLevels
      .edges
      .map(applySpec({
        name: path(['node', 'item', 'variant', 'displayName']),
        sku: path(['node', 'item', 'sku']),
        quantity: path(['node', 'available']),
      }));
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
  .then(and(token))
  .then(apply(construct(Shopify)));
