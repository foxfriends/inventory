const Koa = require('koa');
const error = require('koa-error');
const Router = require('@koa/router');
const logger = require('koa-logger');
const bodyparser = require('koa-bodyparser');

const { ifElse, path } = require('ramda');

const google = require('./google');
const etsy = require('./etsy');
const shopify = require('./shopify');

const { html, template } = require('./util/template');
const { λ } = require('./util/keypath');

const app = new Koa();

const actions = (service) => html`
  <button onclick='${service}.pull()'>
    Pull (new spreadsheet)
  </button>
  <button onclick='${service}.push()'>
    Push (to shop)
  </button>
  <button onclick='${service}.sync()'>
    Sync (overwrite spreadsheet)
  </button>
`;

const authorize = (service) => html`
  <a href='/${service}/setup'>
    Authorize
  </a>
`;

const service = (service) => ifElse(path([service, 'ready']), actions(service), authorize(service));

const googleSettings = html`
  <form method='POST' action='/google/settings'>
    <label>
      <div>Spreadsheet ID (open your inventory sheet in Google Drive and paste the URL here)</div>
      <input name='spreadsheet' placeholder='https://docs.google.com/spreadsheets/d/&lt;...&gt;/edit' type='text' value='${λ.google.setting('spreadsheet')}' />
    </label>
    <input type='submit' value='Save' />
  </form>
`;

const googleSection = ifElse(path(['google', 'ready']), googleSettings, authorize('google'));

const router = new Router()
  .use('/google', google.routes(), google.allowedMethods())
  .use('/etsy', etsy.routes(), etsy.allowedMethods())
  .use('/shopify', shopify.routes(), shopify.allowedMethods())
  .get('/', template(html`
    <main>
      <section class='shopify'>
        <h1>Shopify</h1>
        ${service('shopify')}
      </section>

      <section class='etsy'>
        <h1>Etsy</h1>
        ${service('etsy')}
      </section>

      <section class='google'>
        <h1>Google</h1>
        ${googleSection}
      </section>
    </main>
  `));

app
  .use(error())
  .use(logger())
  .use(bodyparser())
  .use(google())
  .use(etsy())
  .use(shopify())
  .use(router.routes())
  .use(router.allowedMethods())

const { PORT = 3000 } = process.env;
console.log(`Listening on http://localhost:${PORT}`);
app.listen(PORT);
