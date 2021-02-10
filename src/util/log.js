const { curryN } = require('ramda');

const error = curryN(2, console.error);
const debug = (tag) => (val) => (console.log(`DEBUG (${tag}):`, val), val);

module.exports = { error, debug };
