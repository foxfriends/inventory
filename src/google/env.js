const { join } = require("path");

const GOOGLE_CONFIG_DIR = process.env.CONFIG_DIR ? join(process.env.CONFIG_DIR, 'google') : __dirname;

module.exports.SETTINGS_PATH = join(GOOGLE_CONFIG_DIR, 'settings.json');
module.exports.TOKEN_PATH = join(GOOGLE_CONFIG_DIR, 'token.json');
module.exports.CREDENTIALS_PATH = join(GOOGLE_CONFIG_DIR, 'credentials.json');
