const crypto = require('crypto');
const { default: formurlencoded } = require('form-urlencoded');
const qs = require('qs');
const bent = require('bent');

const API_URL = 'https://api.etsy.com/v3';

class EtsyOAuth2 {
  #clientId;
  #clientSecret;
  #redirectUri;
  #post;
  #get;

  constructor(clientId, clientSecret, redirectUri) {
    this.#clientId = clientId;
    this.#clientSecret = clientSecret;
    this.#redirectUri = redirectUri;
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
        .replace(/\//g, '_'),
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
    return bent('POST', 'json', API_URL)(`/public/oauth/token`, body, {
      'Content-Type': 'application/x-www-form-urlencoded',
    });
  }

  setCredentials({ access_token }) {
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
