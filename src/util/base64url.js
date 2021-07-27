module.exports = (str) => str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
