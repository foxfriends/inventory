const crypto = require('crypto');
const { promises: fs } = require('fs');
const { join } = require('path');
const { DateTime } = require('luxon');
const { OAuth } = require('oauth');
const { always, apply, applySpec, complement, construct, converge, last, map, pick, prop, propEq, path } = require('ramda');
const { all, and } = require('../util/promise');
const log = require('../util/log');
const { HooksExistError } = require('./errors');
const { TOKEN_PATH, CREDENTIALS_PATH } = require('./env');

const ORDER_ADDRESSES = require('./queries/orderAddresses');
const GET_INVENTORY = require('./queries/getInventory');
const UPDATE_INVENTORY = require('./queries/updateInventory');
const REGISTER_FOR_WEBHOOKS = require('./queries/registerForWebhooks');
const CHECK_WEBHOOKS = require('./queries/checkWebhooks');
const UNREGISTER_WEBHOOK = require('./queries/unregisterWebhook');

const ShopifyOAuth2 = require('./oauth');

const SCOPES = ['read_products', 'write_inventory', 'read_orders'];

const constructClient = converge(construct(ShopifyOAuth2), [prop('shop'), prop('api_key'), prop('secret_key'), prop('redirect_uri')]);

class Shopify {
  #client;

  constructor(client, token, credentials) {
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

  async getAddresses() {
    const addresses = [];
    for (let after = null;;) {
      const page = await this.#client
        .graphql(ORDER_ADDRESSES, { after })
        .then(path(['data', 'orders']));
      addresses.push(...page.edges.map(path(['node', 'shippingAddress', 'formatted'])))
      if (!page.pageInfo.hasNextPage) { break; }
      after = last(page.edges)?.cursor;
      if (!after) { break; }
    }
    return addresses;
  }
}

const token = fs
  .readFile(TOKEN_PATH)
  .then(JSON.parse)
  .catch(always(undefined));

const credentials = fs
  .readFile(CREDENTIALS_PATH)
  .then(JSON.parse);

module.exports = credentials
  .then(constructClient)
  .then(and(always(token), always(credentials)))
  .then(apply(construct(Shopify)));
