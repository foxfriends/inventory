const { default: formurlencoded } = require('form-urlencoded');
const qs = require('qs');
const graphql = require('./queries/tag');

const BASE_URL = 'https://conartist.app';

class ConArtistUserAuth {
  #username;
  #password;

  #post;

  constructor(username, password) {
    this.#username = username;
    this.#password = password;
  }

  async #getToken() {
    const response = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usr: this.#username, psw: this.#password }),
    });
    if (!response.ok) throw new Error(await response.text());
    const { status, data, error } = await response.json();
    if (status !== 'Success') {
      throw error;
    }
    return data;
  }

  async reauthorize() {
    const token = await this.#getToken();
    this.#post = async (path, body) => {
      const response = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    }
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
