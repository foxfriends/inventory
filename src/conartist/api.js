const crypto = require('crypto');
const { promises: fs } = require('fs');
const { join } = require('path');
const { DateTime } = require('luxon');
const { always, apply, applySpec, complement, construct, converge, last, map, pick, prop, propEq, path } = require('ramda');
const { all, and } = require('../util/promise');
const log = require('../util/log');
const { CREDENTIALS_PATH } = require('./env');

const GET_INVENTORY = require('./queries/getInventory');
const UPDATE_INVENTORY = require('./queries/updateInventory');
const REGISTER_FOR_WEBHOOKS = require('./queries/registerForWebhooks');
const CHECK_WEBHOOKS = require('./queries/checkWebhooks');
const UNREGISTER_CREATE_RECORD_WEBHOOK = require('./queries/unregisterCreateRecordWebhook');
const UNREGISTER_DELETE_RECORD_WEBHOOK = require('./queries/unregisterDeleteRecordWebhook');

const ConArtistUserAuth = require('./userAuth');

const constructClient = converge(construct(ConArtistUserAuth), [prop('username'), prop('password')]);

class ConArtist {
  #client;
  #orderCancelledCallback;
  #orderCreatedCallback;

  constructor(client, credentials) {
    this.#orderCancelledCallback = credentials.orders_cancelled_url;
    this.#orderCreatedCallback = credentials.orders_created_url;
    this.#client = client;
  }

  get ready() { return true; }

  async getInventory() {
    await this.#client.reauthorize();
    return this.#client
      .graphql(GET_INVENTORY)
      .then(path(['data', 'user', 'products']));
  }

  async setInventory(inventory) {
    await this.#client.reauthorize();
    const originalInventory = await this.#client
      .graphql(GET_INVENTORY)
      .then(path(['data', 'user', 'products']));

    for (const { sku, quantity } of inventory) {
      const found = originalInventory.find(propEq('sku', sku));
      if (!found) { continue; }
      if (found.quantity === quantity) { continue; }
      const update = { productId: found.id, quantity };
      await this.#client.graphql(UPDATE_INVENTORY, { product: update });
    }
  }

  processOrder(data) {
    return {
      orderedAt: DateTime.fromISO(data.sale_time),
      items: data
        .products
        .map(pick(['sku', 'quantity'])),
    };
  }

  async registerForWebhooks() {
    await this.#client.reauthorize();
    const { data, errors } = await this.#client
      .graphql(REGISTER_FOR_WEBHOOKS, {
        createCallback: this.#orderCreatedCallback,
        cancelledCallback: this.#orderCancelledCallback,
      });
    if (errors?.length) {
      throw new Error(errors.map(prop('message')).join('. '));
    }
  }

  async unregisterForWebhooks() {
    await this.#client.reauthorize();
    const { newRecord, deleteRecord } = await this.#client
      .graphql(CHECK_WEBHOOKS)
      .then(path(['data', 'user', 'webhooks']));
    await Promise.all([
      ...newRecord
        .filter(propEq('url', this.#orderCreatedCallback))
        .map(({ id }) => this.#client.graphql(UNREGISTER_CREATE_RECORD_WEBHOOK, { id })),
      ...deleteRecord
        .filter(propEq('url', this.#orderCancelledCallback))
        .map(({ id }) => this.#client.graphql(UNREGISTER_DELETE_RECORD_WEBHOOK, { id })),
    ]);
  }
}

const credentials = fs
  .readFile(CREDENTIALS_PATH)
  .then(JSON.parse);

module.exports = credentials
  .then(constructClient)
  .then(and(always(credentials)))
  .then(apply(construct(ConArtist)));
