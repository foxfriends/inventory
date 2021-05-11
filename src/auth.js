const auth = require('basic-auth');
const compare = require('tsscmp');

module.exports = () => {
  return async (ctx, next) => {
    if (!ctx.settings.name || !ctx.settings.pass) {
      return next();
    }

    const credentials = auth(ctx.request);
    if (!credentials) {
      ctx.set('WWW-Authenticate', 'Basic realm="inventory"');
      ctx.throw(401, 'Authentication required');
    }
    if (!credentials || !compare(credentials.name, ctx.settings.name) || !compare(credentials.pass, ctx.settings.pass)) {
      ctx.set('WWW-Authenticate', 'Basic realm="inventory"');
      ctx.throw(401, 'Unauthorized');
    } else {
      await next();
    }
  };
};
