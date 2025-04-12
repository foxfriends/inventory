const { always } = require('ramda');
const { promises: fs } = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(process.env.CONFIG_DIR || __dirname, 'settings.json');

module.exports = () => {
  return async (ctx, next) => {
    const settings = await fs.readFile(SETTINGS_PATH)
      .then(JSON.parse)
      .catch(always({}));

    ctx.setSettings = async (newSettings) => {
      if ((newSettings.name || newSettings.pass) && (!newSettings.name || !newSettings.pass)) {
        throw new TypeError('Both username and password must be supplied');
      }
      Object.assign(settings, newSettings);
      await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings));
    };

    ctx.settings = settings;
    await next();
  }
};
