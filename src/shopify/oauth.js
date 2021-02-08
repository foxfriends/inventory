const { default: formurlencoded } = require('form-urlencoded');
const bent = require('bent');
const log = require('../util/log');
const graphql = require('./queries/tag');

class ShopifyOAuth2 {
  constructor(shop, clientId, clientSecret, redirectUri) {
    this.shop = shop;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  generateAuthUrl(secret, scopes) {
    return `https://${this.shop}.myshopify.com/admin/oauth/authorize?client_id=${this.clientId}&scope=${scopes.join(',')}&state=${secret}&grant_options[]=&redirect_uri=${this.redirectUri}`;
  }

  async getToken(code) {
    return post('/admin/oauth/access_token', log.debug(formurlencoded({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
    })), { 'Content-Type': 'application/x-www-form-urlencoded' });
  }

  setCredentials({ access_token }) {
    this.post = bent('POST', `https://${this.shop}.myshopify.com`, { 'X-Shopify-Access-Token': access_token });
  }

  async graphql(query, variables) {
    return this.post('/admin/api/2021-01/graphql.json', { query, variables });
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
