const crypto = require('crypto');
const { default: formurlencoded } = require('form-urlencoded');
const qs = require('qs');
const bent = require('bent');

const API_URL = 'https://api.etsy.com/v3';

class EtsyOAuth2 {
  #clientId;
  #clientSecret;
  #redirectUri;
  #credentials;
  #post;
  #get;
  #eventHandlers = {};

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

  generateAuthUrl(state, challenge, scopes) {
    const query = qs.stringify({
      response_type: 'code',
      client_id: this.#clientId,
      redirect_uri: this.#redirectUri,
      scope: scopes.join(' '),
      state,
      code_challenge: crypto
        .createHash('sha256')
        .update(challenge)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, ''),
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
      'X-Api-Key': access_token,
      'Authorization': `Bearer ${access_token}`,
    });
    this.#get = bent('GET', 'json', API_URL, {
      'X-Api-Key': access_token,
      'Authorization': `Bearer ${access_token}`,
    });
  }

  async get(endpoint, params) {
    const query = qs.stringify(params, { addQueryPrefix: true });
    return this.#get(`${endpoint}${query}`);
  }

  async post(endpoint, body) {
    return this.#post(endpoint, body);
  }
}

module.exports = EtsyOAuth2;
