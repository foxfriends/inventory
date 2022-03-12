const Koa = require('koa');
const koaerror = require('koa-error');
const Router = require('@koa/router');
const logger = require('koa-logger');
const body = require('koa-body');
const { promises: fs } = require('fs');
const { ifElse, path } = require('ramda');
const { DateTime } = require('luxon');

const error = require('./error');
const auth = require('./auth');
const settings = require('./settings');
const google = require('./google');
const etsy = require('./etsy');
const etsy3 = require('./etsy3');
const shopify = require('./shopify');
const conartist = require('./conartist');

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
  <button onclick='${service}.orders()'>
    Check Orders
  </button>
  <a href='/${service}/addresses' target='_blank'>
    Print Addresses
  </a>
`;

const authorize = (service) => html`
  <a href='/${service}/setup'>
    Authorize
  </a>
`;

const service = (service) => ifElse(path([service, 'ready']), actions(service), authorize(service));
const setting = (setting) => path(['settings', setting]);

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
  .use('/conartist', conartist.routes(), conartist.allowedMethods())
  .post('/settings', async (ctx) => {
    const { name, pass, returnaddress } = ctx.request.body;
    let logo = ctx.settings.logo;
    if (ctx.request.files?.logo?.size) {
      const { type, path } = ctx.request.files.logo;
      const data = await fs.readFile(path, 'base64');
      logo = `data:${type};base64,${data}`;
    }
    try {
      await ctx.setSettings({ name, pass, returnaddress, logo });
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
      </section>

      <section class='etsy3'>
        <h1>Etsy (V2)</h1>
        ${service('etsy3')}
      </section>

      <section class='conartist'>
        <h1>ConArtist</h1>
        ${service('conartist')}
      </section>

      <section class='google'>
        <h1>Google</h1>
        ${googleSection}
      </section>

      <section class='settings'>
        <h1>Settings</h1>
        <form method='POST' action='/settings' enctype='multipart/form-data'>
          <label>
            <div>Username</div>
            <input type='text' name='name' placeholder='Username' value='${setting("name")}' />
          </label>
          <label>
            <div>Password</div>
            <!-- It sure is sketchy to put the password in here like this, but I don't think anyone's looking... -->
            <input type='password' name='pass' placeholder='Password' value='${setting("pass")}' />
          </label>
          <label>
            <div>Return Address</div>
            <div>
              <textarea name='returnaddress' placeholder='123 Example Street' rows='5'>${setting("returnaddress")}</textarea>
            </div>
          </label>
          <label>
            <div>Logo</div>
            <input type='file' name='logo' id='logo-input' />
            <img src='${setting("logo")}' id='logo-preview' style="max-width: 100%" />
            <script>
              const input = document.querySelector('#logo-input');
              const preview = document.querySelector('#logo-preview');

              input.addEventListener('change', () => {
                const file = input.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.addEventListener('load', () => preview.src = reader.result);
                  reader.readAsDataURL(file);
                }
              }, false);
            </script>
          </label>

          <div>
            <input type='submit' value='Update' />
          </div>
        </form>
      </section>
    </main>
  `));

app
  .use(koaerror())
  .use(error)
  .use(logger())
  .use(settings())
  .use(auth())
  .use(body({
    json: true,
    multipart: true,
    urlencoded: true,
    formLimit: 1024 * 1024,
  }))
  .use(google())
  .use(etsy())
  .use(etsy3())
  .use(shopify())
  .use(conartist())
  .use(router.routes())
  .use(router.allowedMethods())

const { PORT = 3000 } = process.env;
console.log(`The time is ${DateTime.local().toString()}`);
console.log(`Listening on http://localhost:${PORT}`);
app.listen(PORT);
