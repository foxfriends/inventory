const Router = require('@koa/router');
const { DateTime } = require('luxon');
const { HooksExistError } = require('./errors');
const log = require('../util/log');
const { printAddresses } = require('../util/pdf');

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
  .get('/addresses', async (ctx) => {
    const { name: nameFilter } = ctx.query
    const addresses = await ctx.shopify.getAddresses();
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

