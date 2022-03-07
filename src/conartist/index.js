const conartist = require('./api');
const router = require('./router');

module.exports = () => async (ctx, next) => {
  ctx.conartist = await conartist;
  await next();
};

module.exports.routes = () => router.routes();
module.exports.allowedMethods = () => router.allowedMethods();
