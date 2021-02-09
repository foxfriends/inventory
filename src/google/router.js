const Router = require('@koa/router');
const { prop } = require('ramda');
const { html } = require('../util/template');

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
    let { spreadsheet } = ctx.request.body;
    if (spreadsheet.startsWith('https://')) {
      [, spreadsheet] = spreadsheet.match(/https:\/\/docs.google.com\/spreadsheets\/d\/(\w+)\/.*/i);
    }
    await ctx.google.settings({ spreadsheet });
    ctx.redirect('back', '/');
  })
  .get('/view', async (ctx) => {
    ctx.body = await ctx.google.getInventory();
    ctx.status = 200;
  });
