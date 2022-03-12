const koaerror = require('koa-error');
const log = require('./util/log')

module.exports = async function error(ctx, next) {
  try {
    await next();
  } catch (error) {
    if (typeof error.text === 'function') {
      const text = await error.text();
      log.error('External API call encountered an error', text);
      ctx.status = 502;
      ctx.body = text;
    } else {
      throw error;
    }
  }
}
