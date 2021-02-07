const { join } = require('path');
const { promises: fs } = require('fs');
const { google: GoogleApi } = require('googleapis');
const { always, apply, construct, converge, path, prop } = require('ramda');
const { and } = require('../util/promise');
const log = require('../util/log');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = join(__dirname, 'token.json');
const CREDENTIALS_PATH = join(__dirname, 'credentials.json');
const AUTH_OPTIONS = { access_type: 'offline', scope: SCOPES, prompt: 'consent' };

const constructClient = converge(construct(GoogleApi.auth.OAuth2), [prop('client_id'), prop('client_secret'), path(['redirect_uris', 0])]);

class Google {
  constructor(client, token) {
    this.client = client;
    this.setCredentials(token);
  }

  setCredentials(token) {
    if (token) {
      this.client.setCredentials(token);
    }
    this.ready = !!token;
  }

  async generateAuthUrl() {
    return this.client.generateAuthUrl(AUTH_OPTIONS)
  }

  async auth(code) {
    const { tokens: token } = await this.client.getToken(code);
    fs.writeFile(TOKEN_PATH, JSON.stringify(token))
      .catch(log.error('Failed to save token'));
    this.setCredentials(token);
  }
}

const token = fs
  .readFile(TOKEN_PATH)
  .then(JSON.parse)
  .catch(always(undefined));

const google = fs
  .readFile(CREDENTIALS_PATH)
  .then(JSON.parse)
  .then(prop('web'))
  .then(constructClient)
  .then(and(token))
  .then(apply(construct(Google)));

module.exports = () => async (ctx, next) => {
  ctx.google = await google;
  await next();
};
