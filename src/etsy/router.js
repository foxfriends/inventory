const Router = require('@koa/router');
const { printAddresses } = require('../util/pdf');

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
    ctx.redirect('/');
  })
  .get('/check', async (ctx) => {
    ctx.body = await ctx.etsy.checkAuth();
    ctx.status = 200;
  })
  .get('/view', async (ctx) => {
    ctx.body  = await ctx.etsy.getInventory();
    ctx.status = 200;
  })
  .post('/pull', async (ctx) => {
    const inventory = await ctx.etsy.getInventory();
    await ctx.google.pushInventory('Etsy', inventory);
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/sync', async (ctx) => {
    const inventory = await ctx.etsy.getInventory();
    await ctx.google.setInventory(inventory);
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/push', async (ctx) => {
    const inventory = await ctx.google.getInventory();
    await ctx.etsy.setInventory(inventory);
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/hook/init', async (ctx) => {
    await ctx.etsy.startWatchingOrders();
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/hook/remove', async (ctx) => {
    await ctx.etsy.stopWatchingOrders();
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/orders', async (ctx) => {
    const orders = await ctx.etsy.checkOrders();
    await ctx.google.acceptOrders('Etsy', 'Created', orders);
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .get('/addresses', async (ctx) => {
    const addresses = await ctx.etsy.getAddresses();
    const pdf = printAddresses(addresses, {
      returnAddress: ctx.settings.returnaddress,
      logo: ctx.settings.logo,
    });
    ctx.status = 200;
    ctx.type = 'application/pdf';
    ctx.body = pdf;
  });
