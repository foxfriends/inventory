const { default: formurlencoded } = require('form-urlencoded');
const qs = require('qs');
const bent = require('bent');
const graphql = require('./queries/tag');

class ShopifyOAuth2 {
  #shop;
  #clientId;
  #clientSecret;
  #redirectUri;
  #post;

  constructor(shop, clientId, clientSecret, redirectUri) {
    this.#shop = shop;
    this.#clientId = clientId;
    this.#clientSecret = clientSecret;
    this.#redirectUri = redirectUri;
  }

  generateAuthUrl(secret, scopes) {
    const query = qs.stringify({
      client_id: this.#clientId,
      scope: scopes.join(','),
      grant_options: [],
      redirect_uri: this.#redirectUri,
    });
    return `https://${this.#shop}.myshopify.com/admin/oauth/authorize?${query}`;
  }

  async getToken(code) {
    return bent('POST', 'json', `https://${this.#shop}.myshopify.com`)('/admin/oauth/access_token', formurlencoded({
      client_id: this.#clientId,
      client_secret: this.#clientSecret,
      code,
    }), { 'Content-Type': 'application/x-www-form-urlencoded' });
  }

  setCredentials({ access_token }) {
    this.#post = bent('POST', 'json', `https://${this.#shop}.myshopify.com`, { 'X-Shopify-Access-Token': access_token });
  }

  async graphql(query, variables) {
    const result = await this.#post('/admin/api/2021-01/graphql.json', { query, variables });
    if (result.errors) {
      throw new Error(JSON.stringify(result.errors));
    }
    return result;
  }

  /**
   * NOTE: this function is not fully implemented, just manually paginate the regular API for now.
   */
  async bulkGraphql(query) {
    const bulkQuery = graphql`
      mutation {
        bulkOperationRunQuery(
          query: """
          ${query}
          """
        ) {
          bulkOperation {
            id
            status
            url
          }
        }
      }
    `;
    
    let { data: { bulkOperation: { id, status, url } } } = await this.graphql(bulkQuery);
    while (status !== 'COMPLETED') {
      ({ status, url } = await this.graphql(graphql`
        query {
          currentBulkOperation {
            id
            status
            url
          }
        }
      `));
    }
    if (url === null) { return null; }
    throw new Error('Unimplemented');
    // TODO: Get the file and parse it. We don't operate at a scale that this is worth it yet.
  }
}

module.exports = ShopifyOAuth2;
