const shopify = require('./api');
const router = require('./router');

module.exports = () => async (ctx, next) => {
  ctx.shopify = await shopify;
  await next();
};

module.exports.routes = () => router.routes();
module.exports.allowedMethods = () => router.allowedMethods();
