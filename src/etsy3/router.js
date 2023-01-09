const Router = require('@koa/router');
const { printAddresses } = require('../util/pdf');

const ONE_HOUR = 60 * 60 * 1000;

module.exports = new Router()
  .get('/setup', async (ctx) => {
    if (ctx.etsy3.ready) {
      ctx.throw(409, 'Already in use. This server only supports a single user. If you would like to use this app too, contact me.');
    }
    const { url, state, challenge } = await ctx.etsy3.generateAuthUrl();
    ctx.cookies.set('etsy3_oauth_secret', JSON.stringify({ state, challenge }), { overwrite: true, maxAge: ONE_HOUR });
    ctx.redirect(url);
  })
  .get('/oauth', async (ctx) => {
    const { state: secret, challenge } = JSON.parse(ctx.cookies.get('etsy3_oauth_secret'));
    const { code, state } = ctx.query;
    if (secret !== state) { ctx.throw(401); }
    await ctx.etsy3.auth(code, challenge);
    ctx.redirect('/');
  })
  .get('/view', async (ctx) => {
    ctx.body  = await ctx.etsy3.getInventory();
    ctx.status = 200;
  })
  .post('/pull', async (ctx) => {
    const inventory = await ctx.etsy3.getInventory();
    await ctx.google.pushInventory('Etsy V2', inventory);
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/sync', async (ctx) => {
    const inventory = await ctx.etsy3.getInventory();
    await ctx.google.setInventory(inventory);
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/push', async (ctx) => {
    const inventory = await ctx.google.getInventory();
    const responses = await ctx.etsy3.setInventory(inventory);
    const fails = responses.filter((response) => response);
    ctx.status = 200;
    if (fails.length) {
      ctx.body = `${fails.length}/${inventory.length} product(s) may have failed to update:\n${fails.join('\n')}`;
    } else {
      ctx.body = 'Ok';
    }
  })
 .post('/hook/init', async (ctx) => {
   await ctx.etsy3.startWatchingOrders();
   ctx.status = 200;
   ctx.body = 'Ok';
 })
 .post('/hook/remove', async (ctx) => {
   await ctx.etsy3.stopWatchingOrders();
   ctx.status = 200;
   ctx.body = 'Ok';
 })
  .post('/orders', async (ctx) => {
    const orders = await ctx.etsy3.checkOrders();
    await ctx.google.acceptOrders('Etsy', 'Created', orders);
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .get('/addresses', async (ctx) => {
    const { name: nameFilter } = ctx.query
    const addresses = await ctx.etsy3.getAddresses();
    const addressesToPrint = addresses
      .filter((address) => !!address)
      .filter(([name]) => !nameFilter || name.includes(nameFilter))
    const pdf = printAddresses(addressesToPrint, {
      returnAddress: ctx.settings.returnaddress,
      logo: ctx.settings.logo,
    });
    ctx.status = 200;
    ctx.type = 'application/pdf';
    ctx.body = pdf;
  });
