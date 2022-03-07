const crypto = require('crypto');
const { join: joinPath } = require('path');
const { promises: fs } = require('fs');
const { DateTime } = require('luxon');
const {
  __,
  always,
  apply,
  applySpec,
  assocPath,
  chain,
  complement,
  compose,
  concat,
  construct,
  converge,
  equals,
  evolve,
  find,
  identity,
  join,
  map,
  nth,
  o,
  omit,
  path,
  pick,
  pipe,
  pluck,
  prop,
  propEq,
  split,
  when,
  whereEq,
} = require('ramda');
const { decode } = require('html-entities');
const { and, all } = require('../util/promise');
const { text } = require('../util/template');
const log = require('../util/log');
const base64url = require('../util/base64url');
const EtsyOauth2 = require('./oauth');

const SCOPES = ['listings_r', 'listings_w', 'transactions_r'];
const TOKEN_PATH = joinPath(__dirname, 'token.json');
const CREDENTIALS_PATH = joinPath(__dirname, 'credentials.json');
const SETTINGS_PATH = joinPath(__dirname, 'settings.json');

const constructClient = converge(construct(EtsyOauth2), [prop('keystring'), prop('shared_secret'), prop('redirect_uri')]);

class Etsy3 {
  #shop;
  #client;

  constructor(client, token, credentials) {
    this.#shop = credentials.shop;
    this.#client = client;
    this.#setCredentials(token);
    this.#client.on('authenticate', (credentials) => {
      fs
        .writeFile(TOKEN_PATH, JSON.stringify(credentials))
        .catch(log.error('Failed to save token'))
      this.#setCredentials(credentials);
    });
  }

  #ready = false;
  get ready() { return this.#ready; }

  #setCredentials(credentials) {
    if (credentials) {
      this.#client.setCredentials(credentials);
    }
    this.#ready = !!credentials;
  }

  async generateAuthUrl() {
    const state = crypto.randomBytes(20).toString('hex');
    const challenge = base64url(crypto.randomBytes(32).toString('base64'));
    const url = this.#client.generateAuthUrl(state, challenge, SCOPES);
    return { state, challenge, url }
  }

  async auth(code, challenge) {
    await this.#client.getToken(code, challenge);
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

  async #getListings() {
    return this.#client.getAll(`/application/shops/${this.#shop}/listings/active`);
  }

  async #getListing({ listing_id }) {
    return this.#client.get(`/application/listings/${listing_id}/inventory`)
  }

  async getInventory() {
    const listings = await this.#getListings();
    return Promise
      .all(listings
        .map(and((listing) => this.#getListing(listing)
          .then(prop('products'))
          .then(map(applySpec({
            name: pipe(
              prop('property_values'),
              map(text` (${prop('property_name')}: ${o(join(', '), prop('values'))})`),
              join(''),
            ),
            sku: prop('sku'),
            quantity: path(['offerings', 0, 'quantity']),
          }))))))
      .then(chain(([listing, products]) => products.map(evolve({ name: concat(listing.title) }))));
  }

  async setInventory(inventory) {
    try {
      const listings = await this.#getListings();
      await Promise
        .all(listings
          .map((listing) => this.#getListing(listing)
            .then(and(evolve({
              products: map(converge((inv, prod) => inv && prod.sku ? assocPath(['offerings', 0, 'quantity'], inv.quantity, prod) : prod, [
                compose(find(__, inventory), propEq('sku'), prop('sku')),
                identity,
              ])),
            })))
            .then(when(apply(complement(equals)), pipe(
              nth(1),
              evolve({
                products:  map(pipe(
                  pick(['sku', 'offerings', 'property_values']),
                  evolve({
                    property_values: map(pick(['property_id', 'value_ids', 'scale_id', 'property_name', 'values'])),
                    offerings: map(pipe(
                      pick(['price', 'quantity', 'is_enabled']),
                      evolve({ price: ({ amount, divisor }) => amount / divisor }),
                    )),
                  }),
                )),
              }),
              omit(['listing']),
              (updated) => this.#client.put(`/application/listings/${listing.listing_id}/inventory`, updated),
            )))));
    } catch (error) {
      console.error(await error.text());
      throw error;
    }
  }

  async getAddresses() {
    return this.#client
      .getAll(`/application/shops/${this.#shop}/receipts`, { was_paid: true, was_shipped: false })
      .then(pluck('formatted_address'))
      .then(map(decode))
      .then(map(split('\n')));
  }

  async checkOrders() {
    const lastCheck = await this.setting('watchOrders');
    if (lastCheck) {
      await this.settings({ watchOrders: DateTime.local().toISO() });
    }

    return this.#client
      .getAll(`/application/shops/${this.#shop}/receipts`, {
        min_created: Math.floor(((lastCheck && DateTime.fromISO(lastCheck)) ?? DateTime.local().minus({ days: 1 })).toSeconds()),
      })
      .then(map(async (receipt) => {
        const { results } = await this.#client.get(`/application/shops/${this.#shop}/receipts/${receipt.receipt_id}/transactions`);
        receipt.Transactions = await Promise.all(results.map(async (transaction) => {
          const listing = await this.#getListing(transaction);
          transaction.product_data = listing.products.find(whereEq({ product_id: transaction.product_id }));
          return transaction;
        }));
        return receipt;
      }))
      .then(all)
      .then(map(and(applySpec({
        orderedAt: o(DateTime.fromSeconds, prop('create_timestamp')),
        items: pipe(
          prop('Transactions'),
          map(applySpec({
            quantity: prop('quantity'),
            sku: path(['product_data', 'sku']),
          })),
        ),
      }))))
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
  .then(apply(construct(Etsy3)));
