const { join: joinPath } = require('path');
const { promises: fs } = require('fs');
const {
  __,
  always,
  andThen,
  apply,
  applySpec,
  assocPath,
  chain,
  compose,
  complement,
  concat,
  construct,
  converge,
  equals,
  evolve,
  find,
  identity,
  ifElse,
  join,
  juxt,
  map,
  nth,
  o,
  path,
  pipe,
  prop,
  propEq,
  when,
} = require('ramda');
const { and, all } = require('../util/promise');
const { text } = require('../util/template');
const log = require('../util/log');
const EtsyOAuth = require('./oauth');

const TOKEN_PATH = joinPath(__dirname, 'token.json');
const CREDENTIALS_PATH = joinPath(__dirname, 'credentials.json');

const constructClient = converge(construct(EtsyOAuth), [prop('keystring'), prop('shared_secret'), prop('redirect_uri')]);

const updateListing = (inventory) => evolve({

});

class Etsy {
  #shop;
  #client;
  
  constructor(client, token, credentials) {
    this.#shop = credentials.shop;
    this.#client = client;
    this.#setCredentials(token);
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
    return this.#client.generateAuthUrl();
  }

  async auth(code, token, secret) {
    const authtoken = await this.#client.auth(code, token, secret);
    fs.writeFile(TOKEN_PATH, JSON.stringify(authtoken))
      .catch(log.error('Failed to save token'));
    this.#setCredentials(authtoken);
  }

  async checkAuth() {
    return this.#client.get('/oauth/scopes');
  }

  async #getListings() {
    return this.#client.getAll(`/shops/${this.#shop}/listings/active`, { include_private: true });
  }

  async #getListing({ listing_id }) {
    return this.#client.get(`/listings/${listing_id}/inventory`)
  }

  async getInventory() {
    const listings = await this.#getListings();
    return Promise
      .all(listings
        .map(and((listing) => this.#getListing(listing)
          .then(path(['results', 'products']))
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
    const listings = await this.#getListings();
    await Promise
      .all(listings
        .map((listing) => this.#getListing(listing)
          .then(prop('results'))
          .then(and(evolve({
            products: map(converge((inv, prod) => inv && prod.sku ? assocPath(['offerings', 0, 'quantity'], inv.quantity, prod) : prod, [
              compose(find(__, inventory), propEq('sku'), prop('sku')),
              identity,
            ])),
          })))
          .then(when(apply(complement(equals)), pipe(
            nth(1),
            evolve({ products: JSON.stringify }),
            (updated) => this.#client.put(`/listings/${listing.listing_id}/inventory`, updated),
          )))));
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
  .then(apply(construct(Etsy)));
