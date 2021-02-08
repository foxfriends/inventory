const Router = require('@koa/router');

const ONE_HOUR = 60 * 60 * 1000;

module.exports = new Router()
  .get('/setup', async (ctx) => {
    // TODO: should verify hmac here...
    if (ctx.shopify.ready) {
      ctx.throw(409, 'Already in use. This server only supports a single user. If you would like to use this app too, contact me.');
    }
    const { url, secret } = await ctx.shopify.generateAuthUrl();
    ctx.cookies.set('shopify_oauth_secret', secret, { overwrite: true, maxAge: ONE_HOUR });
    ctx.redirect(url);
  })
  .get('/oauth', async (ctx) => {
    const secret = ctx.cookies.get('shopify_oauth_secret');
    const { code, state } = ctx.query;
    if (secret !== state) { ctx.throw(401); }
    await ctx.shopify.auth(code);
    ctx.status = 200;
    ctx.body = 'Shopify setup complete';
  })
  .get('/view', async (ctx) => {
    const result = await ctx.shopify.inventory();
    ctx.status = 200;
    ctx.body = result;
  });
