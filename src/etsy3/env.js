const { join } = require("path");

const ETSY3_CONFIG_DIR = process.env.CONFIG_DIR ? join(process.env.CONFIG_DIR, 'etsy3') : __dirname;

module.exports.TOKEN_PATH = join(ETSY3_CONFIG_DIR, "token.json");
module.exports.CREDENTIALS_PATH = join(ETSY3_CONFIG_DIR, "credentials.json");
module.exports.SETTINGS_PATH = join(ETSY3_CONFIG_DIR, "settings.json");
