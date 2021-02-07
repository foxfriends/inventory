const { default: formurlencoded } = require('form-urlencoded');
const bent = require('bent');
const log = require('../util/log');

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
    return bent('POST', 'json', `https://${this.shop}.myshopify.com`)('/admin/oauth/access_token', log.debug(formurlencoded({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
    })), { 'Content-Type': 'application/x-www-form-urlencoded' });
  }

  setCredentials({ access_token }) {
    this.request = bent({ 'X-Shopify-Access-Token': access_token });
  }
}

module.exports = ShopifyOAuth2;
