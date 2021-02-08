const { OAuth } = require('oauth');
const Queue = require('../util/ratelimit');

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

class EtsyOAuth {
  #oauth;
  #clientId;
  #clientSecret;
  #redirectUri;
  #token;
  #secret;
  #queue = new Queue(100); // Etsy has a rate limit of 10 requests per second

  constructor(clientId, clientSecret, redirectUri) {
    this.#oauth = new OAuth(
      'https://openapi.etsy.com/v2/oauth/request_token?scope=listings_w',
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

  async getAll(endpoint, args = {}) {
    const STEP = 100;
    let results = [];
    let count = null;
    let offset = 0;
    while (offset !== null) {
      const response = await this.#oauth.get(endpoint, { ...args, offset, limit: STEP });
      count = response.count;
      results.push(...response.results);
      offset = response.pagination.next_offset;
    }
    return results;
  }
}

module.exports = EtsyOAuth;
