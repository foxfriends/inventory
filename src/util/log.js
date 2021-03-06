const { curry } = require('ramda');

const error = curry((msg, error) => console.error(`${DateTime.local().toString()}: ${msg}`, error));
const debug = (tag) => (val) => (console.log(`DEBUG (${tag}):`, val), val);

module.exports = { error, debug };
