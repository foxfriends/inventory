const Router = require('@koa/router');
const { DateTime } = require('luxon');
const { HooksExistError } = require('./errors');

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
    ctx.redirect('/');
  })
  .get('/view', async (ctx) => {
    ctx.body = await ctx.shopify.getInventory();
    ctx.status = 200;
  })
  .post('/pull', async (ctx) => {
    const inventory = await ctx.shopify.getInventory();
    await ctx.google.pushInventory('Shopify', inventory);
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/sync', async (ctx) => {
    const inventory = await ctx.shopify.getInventory();
    await ctx.google.setInventory(inventory);
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/push', async (ctx) => {
    const inventory = await ctx.google.getInventory();
    await ctx.shopify.setInventory(inventory);
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/hook/init', async (ctx) => {
    try {
      await ctx.shopify.registerForWebhooks();
      ctx.status = 200;
      ctx.body = 'Ok';
    } catch (error) {
      if (error instanceof HooksExistError) {
        ctx.throw(409, 'Hooks already set up');
      }
      throw error;
    }
  })
  .post('/hook/remove', async (ctx) => {
    await ctx.shopify.unregisterForWebhooks();
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/hook/orders/create', async (ctx) => {
    try {
      const order = ctx.shopify.processOrder(ctx.request.body);
      await ctx.google.acceptOrders('Shopify', 'Created', [[ctx.request.body, order]]);
      ctx.status = 200;
      ctx.body = 'Ok';
    } catch (error) {
      console.log(error);
      ctx.status = 200;
      ctx.body = 'Fail';
    }
  })
  .post('/hook/orders/cancelled', async (ctx) => {
    try {
      await ctx.google.logOrders('Shopify', 'Cancelled', [[ctx.request.body, { orderedAt: DateTime.local(), items: [] }]]);
      ctx.status = 200;
      ctx.body = 'Ok';
    } catch (error) {
      console.log(error);
      ctx.status = 200;
      ctx.body = 'Fail';
    }
  });
