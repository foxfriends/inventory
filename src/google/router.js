const Router = require('@koa/router');
const { map, match, nth, pick, pipe, prop, startsWith, when } = require('ramda');

const SHEET_URL_REGEX = /https:\/\/docs.google.com\/spreadsheets\/d\/(\w+)\/.*/i;

module.exports = new Router()
  .get('/setup', async (ctx) => {
    if (ctx.google.ready) {
      ctx.throw(409, 'Already in use. This server only supports a single user. If you would like to use this app too, contact me.');
    }
    ctx.redirect(await ctx.google.generateAuthUrl());
  })
  .get('/oauth', async (ctx) => {
    await ctx.google.auth(ctx.query.code);
    ctx.redirect('/');
  })
  .post('/settings', async (ctx) => {
    const settings = pipe(
      pick(['inventory', 'orders']),
      map(when(startsWith('https://'), pipe(match(SHEET_URL_REGEX), nth(1)))),
    )(ctx.request.body);
    await ctx.google.settings(settings);
    ctx.redirect('back', '/');
  })
  .get('/view', async (ctx) => {
    ctx.body = await ctx.google.getInventory();
    ctx.status = 200;
  });
