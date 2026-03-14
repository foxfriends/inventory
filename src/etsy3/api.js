const crypto = require("crypto");
const { promises: fs } = require("fs");
const { DateTime } = require("luxon");
const { always, apply, construct, converge, map, pluck, prop, split } = require("ramda");
const { decode } = require("html-entities");
const { and, all } = require("../util/promise");
const log = require("../util/log");
const base64url = require("../util/base64url");
const EtsyOauth2 = require("./oauth");
const { TOKEN_PATH, SETTINGS_PATH, CREDENTIALS_PATH } = require('./env');

const SCOPES = ["listings_r", "listings_w", "transactions_r"];

const constructClient = converge(construct(EtsyOauth2), [
  prop("keystring"),
  prop("shared_secret"),
  prop("redirect_uri"),
]);

class Etsy3 {
  #shop;
  #client;
  #ordersCron;

  constructor(client, token, credentials) {
    this.#shop = credentials.shop;
    this.#client = client;
    this.#setCredentials(token);
    this.#client.on("authenticate", (credentials) => {
      fs.writeFile(TOKEN_PATH, JSON.stringify(credentials)).catch(
        log.error("Failed to save token"),
      );
      this.#setCredentials(credentials);
    });
  }

  #ready = false;
  get ready() {
    return this.#ready;
  }

  #setCredentials(credentials) {
    if (credentials) {
      this.#client.setCredentials(credentials);
    }
    this.#ready = !!credentials;
  }

  async generateAuthUrl() {
    const state = crypto.randomBytes(20).toString("hex");
    const challenge = base64url(crypto.randomBytes(32).toString("base64"));
    const url = this.#client.generateAuthUrl(state, challenge, SCOPES);
    return { state, challenge, url };
  }

  async auth(code, challenge) {
    await this.#client.getToken(code, challenge);
  }

  async setting(name) {
    return this.settings().then(prop(name));
  }

  #settings;
  async settings(newSettings) {
    this.#settings =
      this.#settings ||
      (await fs.readFile(SETTINGS_PATH).then(JSON.parse).catch(always({})));
    if (newSettings) {
      Object.assign(this.#settings, newSettings);
      await fs.writeFile(SETTINGS_PATH, JSON.stringify(this.#settings));
    }
    return this.#settings;
  }

  async getAddresses() {
    return this.#client
      .getAll(`/application/shops/${this.#shop}/receipts`, {
        was_paid: true,
        was_shipped: false,
        was_canceled: false,
      })
      .then(pluck("formatted_address"))
      .then(map(decode))
      .then(map(split("\n")));
  }
}

const token = fs.readFile(TOKEN_PATH).then(JSON.parse).catch(always(undefined));

const credentials = fs.readFile(CREDENTIALS_PATH).then(JSON.parse);

module.exports = credentials
  .then(constructClient)
  .then(and(always(token), always(credentials)))
  .then(apply(construct(Etsy3)));
