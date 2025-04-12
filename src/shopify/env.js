const { join } = require("path");

const SHOPIFY_CONFIG_DIR = process.env.CONFIG_DIR ? join(process.env.CONFIG_DIR, 'shopify') : __dirname;

module.exports.CREDENTIALS_PATH = join(SHOPIFY_CONFIG_DIR, 'credentials.json');
module.exports.TOKEN_PATH = join(SHOPIFY_CONFIG_DIR, 'token.json');
