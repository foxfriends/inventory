const { join } = require("path");

const CONARTIST_CONFIG_DIR = process.env.CONFIG_DIR ? join(process.env.CONFIG_DIR, 'conartist') : __dirname;

module.exports.CREDENTIALS_PATH = join(CONARTIST_CONFIG_DIR, 'credentials.json');
