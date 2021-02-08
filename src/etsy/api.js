const { join } = require('path');
const { promises: fs } = require('fs');
const { OAuth } = require('oauth');
const { __, always, apply, compose, construct, constructN, converge, map, prop } = require('ramda');
const { and, all } = require('../util/promise');
const log = require('../util/log');

const API_URL = 'https://openapi.etsy.com/v2';
const TOKEN_PATH = join(__dirname, 'token.json');
const CREDENTIALS_PATH = join(__dirname, 'credentials.json');

const uri = (strings, ...args) => {
  return strings.reduce((out, s, i) => out + s + (args[i] !== undefined ? encodeURIComponent(args[i]) : ''), '');
};

const query = (args) => {
  const entries = Object.entries(args);
  if (entries.length === 0) { return ''; }
  return '?' + entries
    .map(([key, value]) => uri`${key}=${value}`)
    .join('&');
};

const url = (endpoint, args = {}) => `${API_URL}${endpoint}${query(args)}`;

const constructClient = converge(
  constructN(7, OAuth)(
    'https://openapi.etsy.com/v2/oauth/request_token?scope=listings_w',
    'https://openapi.etsy.com/v2/oauth/access_token',
    __,
    __,
    '1.0A',
    __,
    'HMAC-SHA1',
  ),
  [prop('keystring'), prop('shared_secret'), prop('redirect_uri')],
);

class Etsy {
  #shop;
  #client;
  #token;
  #secret;
  
  constructor(client, token, credentials) {
    this.#shop = credentials.shop;
    this.#client = client;
    this.#client.setClientOptions({ accessTokenHttpMethod: 'GET' });
    this.#setCredentials(token);
  }

  #ready = false;
  get ready() { return this.#ready; }

  #setCredentials(credentials) {
    if (credentials) {
      this.#token = credentials.token;
      this.#secret = credentials.secret;
    }
    this.#ready = !!credentials;
  }

  async generateAuthUrl() {
    const { secret, login_url: url } = await new Promise((resolve, reject) => {
      this.#client.getOAuthRequestToken((error, token, secret, results) => {
        if (error) { return reject(error); }
        resolve({ token, secret, ...results });
      });
    });
    return { url, secret };
  }

  async auth(code, token, secret) {
    const authtoken = await new Promise((resolve, reject) => {
      this.#client.getOAuthAccessToken(token, secret, code, (error, token, secret) => {
        if (error) { return reject(error); }
        resolve({ token, secret });
      });
    });
    fs.writeFile(TOKEN_PATH, JSON.stringify(authtoken))
      .catch(log.error('Failed to save token'));
    this.#setCredentials(authtoken);
  }

  async #get(endpoint, args = {}) {
    return new Promise((resolve, reject) => {
      this.#client.get(log.debug(url(endpoint, args)), this.#token, this.#secret, (error, result) => {
        if (error) { return reject(error); }
        resolve(JSON.parse(result));
      });
    })
  }

  async #getAll(endpoint, args = {}) {
    const STEP = 100;
    let results = [];
    let count = null;
    let offset = 0;
    while (offset !== null) {
      const response = await this.#get(endpoint, { ...args, offset, limit: STEP });
      count = response.count;
      results.push(...response.results);
      offset = response.pagination.next_offset;
    }
    return results;
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
