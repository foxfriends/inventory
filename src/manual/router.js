const Router = require('@koa/router');
const { DateTime } = require('luxon');
const { map, match, nth, pick, pipe, prop, startsWith, when } = require('ramda');
const { Record, String, Array, Number, Unknown, Dictionary } = require('runtypes');
const log = require('../util/log');

const Item = Record({
  sku: String,
  quantity: Number,
});

const Order = Record({
  source: String,
  items: Array(Item),
  data: Dictionary(Unknown, String).optional(),
});

module.exports = new Router()
  .post('/orders/create', async (ctx) => {
    try {
      const body = Order.check(ctx.request.body);
      ctx.status = 200;
      ctx.body = 'Ok';
      ctx.google
        .acceptOrders(body.source, 'Created', [[body.data ?? null, {
          orderedAt: DateTime.now(),
          items: body.items,
        }]])
        .catch(log.error('Failed to accept custom order'));
    } catch (error) {
      ctx.throw(error.message, 400);
    }
  });
