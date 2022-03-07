const Router = require('@koa/router');
const log = require('../util/log');

const ONE_HOUR = 60 * 60 * 1000;

module.exports = new Router()
  .get('/view', async (ctx) => {
    ctx.body  = await ctx.conartist.getInventory();
    ctx.status = 200;
  })
  .post('/pull', async (ctx) => {
    const inventory = await ctx.conartist.getInventory();
    await ctx.google.pushInventory('ConArtist', inventory);
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/sync', async (ctx) => {
    const inventory = await ctx.conartist.getInventory();
    await ctx.google.setInventory(inventory);
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/push', async (ctx) => {
    const inventory = await ctx.google.getInventory();
    await ctx.conartist.setInventory(inventory);
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/hook/init', async (ctx) => {
    await ctx.conartist.registerForWebhooks();
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/hook/remove', async (ctx) => {
    await ctx.conartist.unregisterForWebhooks();
    ctx.status = 200;
    ctx.body = 'Ok';
  })
  .post('/hook/orders/create', async (ctx) => {
    const order = ctx.conartist.processOrder(ctx.request.body);
    ctx.status = 200;
    ctx.body = 'Ok';
    ctx.google
      .acceptOrders('ConArtist', 'Created', [[ctx.request.body, order]])
      .catch(log.error('Failed to accept order from ConArtist'));
  })
  .post('/hook/orders/cancelled', async (ctx) => {
    const order = ctx.conartist.processOrder(ctx.request.body);
    ctx.status = 200;
    ctx.body = 'Ok';
    ctx.google
      .logOrders('ConArtist', 'Cancelled', [[ctx.request.body, order]])
      .catch(log.error('Failed to log cancelled order from ConArtist'));
  });
