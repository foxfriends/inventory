const crypto = require('crypto');
const { promises: fs } = require('fs');
const { join } = require('path');
const { DateTime } = require('luxon');
const { OAuth } = require('oauth');
const { always, apply, applySpec, complement, construct, converge, last, map, pick, prop, propEq, path } = require('ramda');
const { all, and } = require('../util/promise');
const log = require('../util/log');
const { HooksExistError } = require('./errors');

const ORDER_ADDRESSES = require('./queries/orderAddresses');
const GET_INVENTORY = require('./queries/getInventory');
const UPDATE_INVENTORY = require('./queries/updateInventory');
const REGISTER_FOR_WEBHOOKS = require('./queries/registerForWebhooks');
const CHECK_WEBHOOKS = require('./queries/checkWebhooks');
const UNREGISTER_WEBHOOK = require('./queries/unregisterWebhook');

const ShopifyOAuth2 = require('./oauth');

const CREDENTIALS_PATH = join(__dirname, 'credentials.json');
const TOKEN_PATH = join(__dirname, 'token.json');
const SCOPES = ['read_products', 'write_inventory', 'read_orders'];

const constructClient = converge(construct(ShopifyOAuth2), [prop('shop'), prop('api_key'), prop('secret_key'), prop('redirect_uri')]);

class Shopify {
  #client;
  #orderCancelledCallback;
  #orderCreatedCallback;

  constructor(client, token, credentials) {
    this.#orderCancelledCallback = credentials.orders_cancelled_url;
    this.#orderCreatedCallback = credentials.orders_created_url;
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
          id: path(['node', 'item', 'id']),
          sku: path(['node', 'item', 'sku']),
          available: path(['node', 'available']),
        }))
        .filter(prop('sku'))
        .map(({ id, sku, available }) => ({
          inventoryItemId: id,
          availableDelta: (inventory.find(propEq('sku', sku))?.quantity ?? available) - available,
        }))
        .filter(prop('availableDelta'));

      if (adjustments.length) {
        const response = await this.#client.graphql(UPDATE_INVENTORY, { location: location.id, adjustments });
        if (response.errors) {
          log.error('shopify push')(JSON.stringify(response))
        }
      }

      if (!location.inventoryLevels.pageInfo.hasNextPage) { return; }
      after = last(location.inventoryLevels.edges).cursor;
    }
  }

  processOrder(data) {
    return {
      orderedAt: DateTime.fromISO(data.created_at),
      items: data
        .line_items
        .filter(complement(prop('tip')))
        .map(pick(['sku', 'quantity'])),
    };
  }

  async getAddresses() {
    const addresses = [];
    for (let after = null;;) {
      const page = await this.#client
        .graphql(ORDER_ADDRESSES, { after })
        .then(path(['data', 'orders']));
      console.log(page.edges.map(prop('node')));
      addresses.push(...page.edges.map(path(['node', 'shippingAddress', 'formatted'])))
      if (!page.pageInfo.hasNextPage) { break; }
      after = last(page.edges)?.cursor;
      if (!after) { break; }
    }
    return addresses;
  }

  async registerForWebhooks() {
    const { data, errors } = await this.#client
      .graphql(REGISTER_FOR_WEBHOOKS, {
        createCallback: this.#orderCreatedCallback,
        cancelledCallback: this.#orderCancelledCallback,
      });
    if (errors?.length) {
      throw new Error(errors.map(prop('message')).join('. '));
    }
    const { createOrdersHook, cancelOrdersHook } = data;
    if (createOrdersHook.userErrors?.length || cancelOrdersHook.userErrors?.length) {
      throw new HooksExistError;
    }
  }

  async unregisterForWebhooks() {
    await this.#client.graphql(CHECK_WEBHOOKS)
      .then(path(['data', 'webhookSubscriptions', 'edges']))
      .then(map(path(['node', 'id'])))
      .then(map((id) => this.#client.graphql(UNREGISTER_WEBHOOK, { id })))
      .then(all);
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
