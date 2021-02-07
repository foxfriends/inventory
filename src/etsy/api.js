const { join } = require('path');
const { promises: fs } = require('fs');
const { OAuth } = require('oauth');
const { __, always, apply, construct, constructN, converge, prop } = require('ramda');
const { and } = require('../util/promise');
const log = require('../util/log');

const API_URL = 'https://openapi.etsy.com/v2/';
const TOKEN_PATH = join(__dirname, 'token.json');
const CREDENTIALS_PATH = join(__dirname, 'credentials.json');

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
  constructor(client, token) {
    this.client = client;
    this.client.setClientOptions({ accessTokenHttpMethod: 'GET' });
    this.setCredentials(token);
  }

  setCredentials(credentials) {
    if (credentials) {
      this.token = credentials.token;
      this.secret = credentials.secret;
    }
    this.ready = !!credentials;
  }

  async generateAuthUrl() {
    const { secret, login_url: url } = await new Promise((resolve, reject) => {
      this.client.getOAuthRequestToken((error, token, secret, results) => {
        if (error) { return reject(error); }
        resolve({ token, secret, ...results });
      });
    });
    return { url, secret };
  }

  async auth(code, token, secret) {
    const authtoken = await new Promise((resolve, reject) => {
      this.client.getOAuthAccessToken(token, secret, code, (error, token, secret) => {
        if (error) { return reject(error); }
        resolve({ token, secret });
      });
    });
    fs.writeFile(TOKEN_PATH, JSON.stringify(authtoken))
      .catch(log.error('Failed to save token'));
    this.setCredentials(authtoken);
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
  .then(apply(construct(Etsy)));
