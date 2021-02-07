const { curryN } = require('ramda');

const error = curryN(2, console.error);
const debug = (val) => (console.log('DEBUG:', val), val);

module.exports = { error, debug };
