const etsy = require('./api');
const router = require('./router');

module.exports = () => async (ctx, next) => {
  ctx.etsy = await etsy;
  await next();
};

module.exports.routes = () => router.routes();
module.exports.allowedMethods = () => router.allowedMethods();
