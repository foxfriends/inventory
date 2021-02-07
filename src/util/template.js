const { append, applyTo, zip } = require('ramda');
const tidy = require('tidy-template');

const html = (strings, ...interpolations) => {
  return async (ctx) => {
    const values = await Promise.all(interpolations.map(applyTo(ctx)));
    const body = zip(strings, append('', values))
      .flat()
      .join('');
    ctx.status = 200;
    ctx.body = tidy`
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

            form {
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

            label {
              width: 100%;
              margin: 10px 0;
            }

            input[type='text'] {
              font-family: monospace;
              box-sizing: border-box;
              display: block;
              width: 100%;
              margin: 5px 0;
            }

            input[type='submit'] {
              align-self: flex-end;
            }
          </style>
        </head>
        <body>
          ${body}
        </body>
      </html>
    `;
  };
};

module.exports = { html };
