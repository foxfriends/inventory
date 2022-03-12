const { curry } = require('ramda');
const { DateTime } = require('luxon');

async function print(error) {
  if (typeof error.text === 'function') {
    return error.text();
  }
  return error;
}

const error = curry((msg, error) => print(error).then((text) => console.error(`${DateTime.local().toString()}: ${msg}`, text)));
const warn = curry((msg, error) => print(error).then((text) => console.warn(`${DateTime.local().toString()}: ${msg}`, text)));
const debug = (tag) => (val) => (console.log(`DEBUG (${tag}):`, val), val);

module.exports = { error, warn, debug };
