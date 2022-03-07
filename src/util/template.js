const { append, applyTo, is, when, zip } = require('ramda');
const tidy = require('tidy-template');

const html = (strings, ...interpolations) => {
  return async (ctx) => {
    const values = await Promise.all(interpolations.map(when(is(Function), applyTo(ctx))));
    return zip(strings, append('', values))
      .flat()
      .join('');
  };
};

const text = (strings, ...interpolations) => {
  return (input) => {
    const values = interpolations.map(when(is(Function), applyTo(input)));
    return zip(strings, append('', values))
      .flat()
      .join('');
  };
};

const template = (formatter) => async (ctx) => {
  const body = await formatter(ctx);
  ctx.status = 200;
  ctx.body = `
    <!DOCTYPE HTML>
    <html lang='en'>
      <head>
        <meta charset='utf-8' />
        <title>Inventory</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'San Francisco', 'Helvetica', sans-serif;
            font-size: 14pt;
          }

          section {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            margin: 100px auto;
            width: 800px;
            padding: 50px;
            border: 1px solid rgba(0, 0, 0, 0.12);
            box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.25);
            border-radius: 3px;
          }

          button,
          input[type='submit'] {
            margin: 10px;
            padding: 10px;
            border-radius: 4px;
            background-image: linear-gradient(to bottom, #ECE9E6 0%, #EEEEEE  35%, #ECE9E6  100%);
            border: 1px solid rgba(0, 0, 0, 0.12);
            cursor: pointer;
          }

          form { width: 100%; }

          label {
            width: 100%;
            margin: 10px 0;
          }

          input[type='text'],
          input[type='password'] {
            font-family: monospace;
            box-sizing: border-box;
            display: block;
            width: 100%;
            margin: 5px 0;
          }

          input[type='submit'] {
            align-self: flex-end;
          }

          .overlay {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            font-size: 18pt;
            text-align: center;
          }

          .hidden { display: none; }
        </style>
      </head>
      <body>
        ${body}

        <div id='overlay' class='overlay hidden'>
          Processing...
        </div>

        <script>
          const overlay = document.querySelector('#overlay');
          const show = () => overlay.classList.remove('hidden');
          const hide = () => overlay.classList.add('hidden');
        
          const post = (url) => {
            show();
            fetch(url, { method: 'POST', headers: { Accept: 'text/plain' } })
              .then(res => res.text())
              .then(alert)
              .then(hide)
          };

          var shopify = {
            sync: () => post('/shopify/sync'),
            pull: () => post('/shopify/pull'),
            push: () => post('/shopify/push'),
            hookInit: () => post('/shopify/hook/init'),
            hookRemove: () => post('/shopify/hook/remove'),
          };

          var etsy = {
            sync: () => post('/etsy/sync'),
            pull: () => post('/etsy/pull'),
            push: () => post('/etsy/push'),
            hookInit: () => post('/etsy/hook/init'),
            hookRemove: () => post('/etsy/hook/remove'),
            orders: () => post('/etsy/orders'),
          };

          var etsy3 = {
            sync: () => post('/etsy3/sync'),
            pull: () => post('/etsy3/pull'),
            push: () => post('/etsy3/push'),
          };

          var conartist = {
            sync: () => post('/conartist/sync'),
            pull: () => post('/conartist/pull'),
            push: () => post('/conartist/push'),
            hookInit: () => post('/conartist/hook/init'),
            hookRemove: () => post('/conartist/hook/remove'),
          };
        </script>
      </body>
    </html>
  `;
};

module.exports = { html, text, template };
