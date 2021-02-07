const Koa = require('koa');
const error = require('koa-error');
const Router = require('@koa/router');
const logger = require('koa-logger');

const google = require('./google');
const etsy = require('./etsy');
const shopify = require('./shopify');

const app = new Koa();

const router = new Router()
  .use('/google', google.routes(), google.allowedMethods())
  .use('/etsy', etsy.routes(), etsy.allowedMethods())
  .use('/shopify', shopify.routes(), shopify.allowedMethods());

app
  .use(error())
  .use(logger())
  .use(google())
  .use(etsy())
  .use(shopify())
  .use(router.routes())
  .use(router.allowedMethods())

const { PORT = 3000 } = process.env;
console.log(`Listening on http://localhost:${PORT}`);
app.listen(PORT);
