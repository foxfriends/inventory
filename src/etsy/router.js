const Router = require('@koa/router');

const ONE_HOUR = 60 * 60 * 1000;

module.exports = new Router()
  .get('/setup', async (ctx) => {
    if (ctx.etsy.ready) {
      ctx.throw(409, 'Already in use. This server only supports a single user. If you would like to use this app too, contact me.');
    }
    const { url, secret } = await ctx.etsy.generateAuthUrl();
    ctx.cookies.set('etsy_oauth_secret', secret, { overwrite: true, maxAge: ONE_HOUR });
    ctx.redirect(url);
  })
  .get('/oauth', async (ctx) => {
    const secret = ctx.cookies.get('etsy_oauth_secret');
    if (!secret) { ctx.throw(401); }
    const { oauth_verifier: code, oauth_token: token } = ctx.query;
    await ctx.etsy.auth(code, token, secret);
    ctx.status = 200;
    ctx.body = 'Etsy setup complete';
  })
  .get('/check', async (ctx) => {
    ctx.body = await ctx.etsy.checkAuth();
    ctx.status = 200;
  })
  .get('/view', async (ctx) => {
    ctx.body  = await ctx.etsy.getInventory();
    ctx.status = 200;
  })
  .get('/pull', async (ctx) => {
    const inventory = await ctx.etsy.getInventory();
    await ctx.google.pushInventory('Etsy', inventory);
    ctx.status = 200;
    ctx.body = 'Ok';
  })
