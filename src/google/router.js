const Router = require('@koa/router');

module.exports = new Router()
  .get('/setup', async (ctx) => {
    if (ctx.google.ready) {
      ctx.throw(409, 'Already in use. This server only supports a single user. If you would like to use this app too, contact me.');
    }
    ctx.redirect(await ctx.google.generateAuthUrl());
  })
  .get('/oauth', async (ctx) => {
    ctx.google.auth(ctx.query.code);
    ctx.status = 200;
    ctx.body = 'Google setup complete';
  });
