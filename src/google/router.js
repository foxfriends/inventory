const Router = require('@koa/router');
const { prop } = require('ramda');
const { html } = require('../util/template');

const setting = (name) => (ctx) => ctx.google.settings().then(prop(name));

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
  })
  .get('/settings', html`
    <form method='POST'>
      <h1>Google Settings</h1>
      <label>
        <div>Spreadsheet ID (open your inventory sheet in Google Drive and paste the URL here)</div>
        <input name='spreadsheet' placeholder='https://docs.google.com/spreadsheets/d/&lt;...&gt;/edit' type='text' value='${setting('spreadsheet')}' />
      </label>
      <input type='submit' value='Save' />
    </form>
  `)
  .post('/settings', async (ctx) => {
    let { spreadsheet } = ctx.request.body;
    if (spreadsheet.startsWith('https://')) {
      [, spreadsheet] = spreadsheet.match(/https:\/\/docs.google.com\/spreadsheets\/d\/(\w+)\/.*/i);
    }
    await ctx.google.settings({ spreadsheet });
    ctx.redirect('/google/settings');
  })
  .get('/view', async (ctx) => {
    const spreadsheet = ctx.google.load();
    if (!spreadsheet) {
      console.log(spreadsheet);
    }
  });
