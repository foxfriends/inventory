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
