const { append, zip } = require('ramda');

// This is just the identity template tag so I can tag the strings and get syntax highlighting.
module.exports = (strings, ...values) => zip(strings, append('', values)).flat().join('');
