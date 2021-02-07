const crypto = require('crypto');
const { promises: fs } = require('fs');
const { join } = require('path');
const { OAuth } = require('oauth');
const { always, apply, construct, converge, prop } = require('ramda');
const { and } = require('../util/promise');
const log = require('../util/log');

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
