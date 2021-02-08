const { join } = require('path');
const { promises: fs } = require('fs');
const { __, always, apply, compose, construct, converge, map, prop } = require('ramda');
const { and, all } = require('../util/promise');
const log = require('../util/log');
const EtsyOAuth = require('./oauth');

const API_URL = 'https://openapi.etsy.com/v2';
const TOKEN_PATH = join(__dirname, 'token.json');
const CREDENTIALS_PATH = join(__dirname, 'credentials.json');

const constructClient = converge(construct(EtsyOAuth), [prop('keystring'), prop('shared_secret'), prop('redirect_uri')]);

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
    const auth = await this.#client.auth(code, token, secret);
    fs.writeFile(TOKEN_PATH, JSON.stringify(authtoken))
      .catch(log.error('Failed to save token'));
    this.#setCredentials(authtoken);
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
  .then(and(token, credentials))
  .then(apply(construct(Etsy)));
