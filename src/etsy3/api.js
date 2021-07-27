const crypto = require('crypto');
const { join: joinPath } = require('path');
const { promises: fs } = require('fs');
const { always, apply, construct, converge, prop } = require('ramda');
const { and, all } = require('../util/promise');
const { text } = require('../util/template');
const log = require('../util/log');
const EtsyOauth2 = require('./oauth');

const SCOPES = ['listings_r', 'listings_w', 'transactions_r'];
const TOKEN_PATH = joinPath(__dirname, 'token.json');
const CREDENTIALS_PATH = joinPath(__dirname, 'credentials.json');

const constructClient = converge(construct(EtsyOauth2), [prop('keystring'), prop('shared_secret'), prop('redirect_uri')]);

class Etsy3 {
  #shop;
  #client;
  
  constructor(client, token, credentials) {
    this.#shop = credentials.shop;
    this.#client = client;
    this.#setCredentials(token);
    this.#client.on('authenticate', (authtoken) => {
      fs
        .writeFile(TOKEN_PATH, JSON.stringify(authtoken))
        .catch(log.error('Failed to save token'))
      this.#setCredentials(authtoken);
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
    const challenge = crypto
      .randomBytes(32)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const url = this.#client.generateAuthUrl(state, challenge, SCOPES);
    return { state, challenge, url }
  }

  async auth(code, challenge) {
    await this.#client.getToken(code, challenge);
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
