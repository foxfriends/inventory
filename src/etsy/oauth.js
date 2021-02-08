const { OAuth } = require('oauth');

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
    return new Promise((resolve, reject) => {
      this.#oauth.get(url(endpoint, args), this.#token, this.#secret, (error, result) => {
        if (error) { return reject(error); }
        resolve(JSON.parse(result));
      });
    })
  }
}

module.exports = EtsyOAuth;
