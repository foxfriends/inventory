const { OAuth } = require('oauth');
const qs = require('qs');
const Queue = require('../util/ratelimit');

const API_URL = 'https://openapi.etsy.com/v2';
const url = (endpoint, args = {}) => `${API_URL}${endpoint}${qs.stringify(args, { addQueryPrefix: true })}`;

class EtsyOAuth {
  #oauth;
  #clientId;
  #clientSecret;
  #redirectUri;
  #token;
  #secret;
  #queue = new Queue(120); // Etsy has a rate limit of 14 requests per second, we give them a bit of a head start

  constructor(clientId, clientSecret, redirectUri) {
    this.#oauth = new OAuth(
      'https://openapi.etsy.com/v2/oauth/request_token?scope=listings_r%20listings_w%20transactions_r',
      'https://openapi.etsy.com/v2/oauth/access_token',
      clientId,
      clientSecret,
      '1.0A',
      redirectUri,
      'HMAC-SHA1',
    );
    this.#oauth.setClientOptions({ accessTokenHttpMethod: 'GET' });
  }

  async setCredentials(credentials) {
    this.#token = credentials.token;
    this.#secret = credentials.secret;
  }

  async generateAuthUrl() {
    const { secret, login_url: url } = await new Promise((resolve, reject) => {
      this.#oauth.getOAuthRequestToken((error, token, secret, results) => {
        if (error) { return reject(error); }
        resolve({ token, secret, ...results });
      });
    });
    return { url, secret };
  }

  async auth(code, token, secret) {
    return new Promise((resolve, reject) => {
      this.#oauth.getOAuthAccessToken(token, secret, code, (error, token, secret) => {
        if (error) { return reject(error); }
        resolve({ token, secret });
      });
    });
  }

  async get(endpoint, args = {}) {
    return this.#queue.schedule(() => new Promise((resolve, reject) => {
      this.#oauth.get(url(endpoint, args), this.#token, this.#secret, (error, result) => {
        if (error) { return reject(error); }
        resolve(JSON.parse(result));
      });
    }));
  }

  async put(endpoint, body) {
    return this.#queue.schedule(() => new Promise((resolve, reject) => {
      this.#oauth.put(url(endpoint), this.#token, this.#secret, body, 'application/x-www-form-urlencoded', (error, result, response) => {
        if (error) { return reject(error); }
        console.log(response);
        resolve(JSON.parse(result));
      });
    }));
  }

  async getAll(endpoint, args = {}) {
    const STEP = 100;
    let results = [];
    let count = null;
    let offset = 0;
    while (offset !== null) {
      const response = await this.get(endpoint, { ...args, offset, limit: STEP });
      count = response.count;
      results.push(...response.results);
      offset = response.pagination.next_offset;
    }
    return results;
  }
}

module.exports = EtsyOAuth;
