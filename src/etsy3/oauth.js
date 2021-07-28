const crypto = require('crypto');
const { default: formurlencoded } = require('form-urlencoded');
const qs = require('qs');
const bent = require('bent');
const Queue = require('../util/ratelimit');
const base64url = require('../util/base64url');

const API_URL = 'https://api.etsy.com/v3';

class EtsyOAuth2 {
  #clientId;
  #clientSecret;
  #redirectUri;
  #credentials;
  #poster;
  #getter;
  #eventHandlers = {};
  #queue = new Queue(120); // Etsy has a rate limit of 15 requests per second, we give them a bit of a head start

  constructor(clientId, clientSecret, redirectUri) {
    this.#clientId = clientId;
    this.#clientSecret = clientSecret;
    this.#redirectUri = redirectUri;
  }

  on(event, handler) {
    this.#eventHandlers[event] = this.#eventHandlers[event] ?? [];
    this.#eventHandlers[event].push(handler);
  }

  #emit(event, data) {
    this.#eventHandlers[event]?.forEach((f) => f(data));
  }

  async #get(...args) {
    await refreshToken();
    return this.#getter(...args);
  }

  async #post(...args) {
    await refreshToken();
    return this.#poster(...args);
  }

  generateAuthUrl(state, challenge, scopes) {
    const query = qs.stringify({
      response_type: 'code',
      client_id: this.#clientId,
      redirect_uri: this.#redirectUri,
      scope: scopes.join(' '),
      state,
      code_challenge: base64url(crypto.createHash('sha256').update(challenge).digest('base64')),
      code_challenge_method: 'S256',
    });
    return `https://www.etsy.com/oauth/connect?${query}`;
  }

  async getToken(code, challenge) {
    const body = formurlencoded({
      grant_type: 'authorization_code',
      client_id: this.#clientId,
      redirect_uri: this.#redirectUri,
      code,
      code_verifier: challenge,
    });
    console.log(body);
    const requestedAt = Date.now();
    const response = await bent('POST', 'json', API_URL)('/public/oauth/token', body, {
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    response.requested_at = requestedAt;
    this.#emit('authenticate', response);
  }

  async refreshToken() {
    if (!this.#credentials) { return; }
    const { refresh_token, requested_at, expires_in } = this.#credentials;
    if (requested_at + expires_in * 1000 < Date.now() - 60000) { return; }
    const body = formurlencoded({
      grant_type: 'refresh_token',
      client_id: this.#clientId,
      refresh_token,
    });
    const requestedAt = Date.now();
    const response = await bent('POST', 'json', API_URL)('/public/oauth/token', body, {
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    response.requested_at = requestedAt;
    this.#emit('authenticate', response);
  }

  setCredentials(credentials) {
    this.#credentials = credentials;
    const { access_token } = credentials;
    this.#post = bent('POST', 'json', API_URL, {
      'X-Api-Key': this.#clientId,
      'Authorization': `Bearer ${access_token}`,
    });
    this.#get = bent('GET', 'json', API_URL, {
      'X-Api-Key': this.#clientId,
      'Authorization': `Bearer ${access_token}`,
    });
  }

  async get(endpoint, params) {
    const query = qs.stringify(params, { addQueryPrefix: true });
    return this.#queue.schedule(() => this.#get(`${endpoint}${query}`));
  }

  async post(endpoint, body) {
    return this.#queue.schedule(() => this.#post(endpoint, body));
  }

  async getAll(endpoint, args = {}) {
    const STEP = 100;
    let results = [];
    let count = null;
    let offset = 0;
    while (offset !== count) {
      const response = await this.get(endpoint, { ...args, offset, limit: STEP });
      count = response.count;
      results.push(...response.results);
      offset = results.length;
    }
    return results;
  }
}

module.exports = EtsyOAuth2;
