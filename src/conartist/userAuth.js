const { default: formurlencoded } = require('form-urlencoded');
const qs = require('qs');
const bent = require('bent');
const graphql = require('./queries/tag');

const BASE_URL = "https://conartist.app";

class ConArtistUserAuth {
  #username;
  #password;

  #post;

  constructor(username, password) {
    this.#username = username;
    this.#password = password;
  }

  async #getToken() {
    const { status, data, error } = await bent('POST', 'json', BASE_URL)('/api/auth', {
      usr: this.#username,
      psw: this.#password,
    });
    if (status !== "Success") {
      throw error;
    }
    return data;
  }

  async reauthorize() {
    const token = await this.#getToken();
    this.#post = bent('POST', 'json', BASE_URL, { 'Authorization': `Bearer ${token}` });
  }

  async graphql(query, variables) {
    const result = await this.#post('/api/v2', { query, variables });
    if (result.errors) {
      throw new Error(JSON.stringify(result.errors));
    }
    return result;
  }
}

module.exports = ConArtistUserAuth;
