const Koa = require('koa');
const error = require('koa-error');
const Router = require('@koa/router');
const logger = require('koa-logger');
const bodyparser = require('koa-bodyparser');
const { ifElse, path } = require('ramda');

const auth = require('./auth');
const google = require('./google');
const etsy = require('./etsy');
const etsy3 = require('./etsy3');
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
  <button onclick='${service}.hookInit()'>
    Watch orders
  </button>
  <button onclick='${service}.hookRemove()'>
    Stop watching orders
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
      <div>Inventory Spreadsheet ID (open your inventory sheet in Google Drive and paste the URL here)</div>
      <input name='inventory' placeholder='https://docs.google.com/spreadsheets/d/&lt;...&gt;/edit' type='text' value='${λ.google.setting('inventory')}' />
    </label>
    <label>
      <div>Orders Spreadsheet ID (open your orders sheet in Google Drive and paste the URL here)</div>
      <input name='orders' placeholder='https://docs.google.com/spreadsheets/d/&lt;...&gt;/edit' type='text' value='${λ.google.setting('orders')}' />
    </label>
    <input type='submit' value='Save' />
  </form>
`;

const googleSection = ifElse(path(['google', 'ready']), googleSettings, authorize('google'));

const router = new Router()
  .use('/google', google.routes(), google.allowedMethods())
  .use('/etsy', etsy.routes(), etsy.allowedMethods())
  .use('/etsy3', etsy3.routes(), etsy3.allowedMethods())
  .use('/shopify', shopify.routes(), shopify.allowedMethods())
  .post('/settings', async (ctx) => {
    const { name, pass } = ctx.request.body;
    try {
      await ctx.setCredentials(name, pass);
      ctx.redirect('back', '/');
    } catch (error) {
      ctx.throw(400, 'Invalid settings');
    }
  })
  .get('/', template(html`
    <main>
      <section class='shopify'>
        <h1>Shopify</h1>
        ${service('shopify')}
      </section>

      <section class='etsy'>
        <h1>Etsy</h1>
        ${service('etsy')}
        <button onclick='etsy.orders()'>
          Check Orders
        </button>
      </section>

      <section class='google'>
        <h1>Google</h1>
        ${googleSection}
      </section>

      <section class='settings'>
        <h1>Settings</h1>
        <form method='POST' action='/settings'>
          <label>
            <div>Username</div>
            <input type='text' name='name' placeholder='Username' />
          </label>
          <label>
            <div>Password</div>
            <input type='password' name='pass' placeholder='Password' />
          </label>
          <input type='submit' value='Update Credentials' />
        </form>
      </section>
    </main>
  `));

app
  .use(error())
  .use(logger())
  .use(auth())
  .use(bodyparser())
  .use(google())
  .use(etsy())
  .use(etsy3())
  .use(shopify())
  .use(router.routes())
  .use(router.allowedMethods())

const { PORT = 3000 } = process.env;
console.log(`Listening on http://localhost:${PORT}`);
app.listen(PORT);
