const Koa = require('koa');
const error = require('koa-error');
const Router = require('@koa/router');
const logger = require('koa-logger');

const google = require('./google');
const etsy = require('./etsy');
const shopify = require('./shopify');

const app = new Koa();

const ONE_HOUR = 60 * 60 * 1000;

const router = new Router()
  .get('/google/setup', async (ctx) => {
    if (ctx.google.ready) {
      ctx.throw(409, 'Already in use. This server only supports a single user. If you would like to use this app too, contact me.');
    }
    ctx.redirect(await ctx.google.generateAuthUrl());
  })
  .get('/google/oauth', async (ctx) => {
    ctx.google.auth(ctx.query.code);
    ctx.status = 200;
    ctx.body = 'Google setup complete';
  })
  .get('/etsy/setup', async (ctx) => {
    if (ctx.etsy.ready) {
      ctx.throw(409, 'Already in use. This server only supports a single user. If you would like to use this app too, contact me.');
    }
    const { url, secret } = await ctx.etsy.generateAuthUrl();
    ctx.cookies.set('etsy_oauth_secret', secret, { overwrite: true, maxAge: ONE_HOUR });
    ctx.redirect(url);
  })
  .get('/etsy/oauth', async (ctx) => {
    const secret = ctx.cookies.get('etsy_oauth_secret');
    if (!secret) { ctx.throw(401); }
    const { oauth_verifier: code, oauth_token: token } = ctx.query;
    await ctx.etsy.auth(code, token, secret);
    ctx.status = 200;
    ctx.body = 'Etsy setup complete';
  })
  .get('/shopify/setup', async (ctx) => {
    // TODO: should verify hmac here...
    if (ctx.shopify.ready) {
      ctx.throw(409, 'Already in use. This server only supports a single user. If you would like to use this app too, contact me.');
    }
    const { url, secret } = await ctx.shopify.generateAuthUrl();
    ctx.cookies.set('shopify_oauth_secret', secret, { overwrite: true, maxAge: ONE_HOUR });
    ctx.redirect(url);
  })
  .get('/shopify/oauth', async (ctx) => {
    const secret = ctx.cookies.get('shopify_oauth_secret');
    const { code, state } = ctx.query;
    if (secret !== state) { ctx.throw(401); }
    await ctx.shopify.auth(code);
    ctx.status = 200;
    ctx.body = 'Shopify setup complete';
  })

app
  .use(error())
  .use(logger())
  .use(google())
  .use(etsy())
  .use(shopify())
  .use(router.routes())
  .use(router.allowedMethods())

const { PORT = 3000 } = process.env;
console.log(`Listening on http://localhost:${PORT}`);
app.listen(PORT);
