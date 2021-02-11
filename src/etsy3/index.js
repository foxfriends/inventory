const etsy3 = require('./api');
const router = require('./router');

module.exports = () => async (ctx, next) => {
  ctx.etsy3 = await etsy3;
  await next();
};

module.exports.routes = () => router.routes();
module.exports.allowedMethods = () => router.allowedMethods();
