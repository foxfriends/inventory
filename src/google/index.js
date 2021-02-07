const google = require('./api');
const router = require('./router');

module.exports = () => async (ctx, next) => {
  ctx.google = await google;
  await next();
};

module.exports.routes = () => router.routes();
module.exports.allowedMethods = () => router.allowedMethods();
