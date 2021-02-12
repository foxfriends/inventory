const { always } = require('ramda');
const { promises: fs } = require('fs');
const path = require('path');
const auth = require('basic-auth');
const compare = require('tsscmp');

const CREDENTIALS_PATH = path.join(__dirname, 'settings.json');

module.exports = () => {
  return async (ctx, next) => {
    const settings = await fs.readFile(CREDENTIALS_PATH)
      .then(JSON.parse)
      .catch(always({}));

    ctx.setCredentials = async (name, pass) => {
      if (!name || !pass) {
        throw new TypeError('Both username and password must be supplied');
      }
      Object.assign(settings, { name, pass });
      await fs.writeFile(CREDENTIALS_PATH, JSON.stringify(settings));
    };

    if (!settings.name || !settings.pass) {
      return next();
    }

    const credentials = auth(ctx.request);
    if (!credentials) {
      ctx.set('WWW-Authenticate', 'Basic realm="inventory"');
      ctx.throw(401, 'Authentication required');
    }
    if (!credentials || !compare(credentials.name, settings.name) || !compare(credentials.pass, settings.pass)) {
      ctx.set('WWW-Authenticate', 'Basic realm="inventory"');
      ctx.throw(401, 'Unauthorized');
    } else {
      await next();
    }
  };
};
