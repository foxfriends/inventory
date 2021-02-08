const and = (...promises) => async (value) => [value, ...await Promise.all(promises)];
const all = Promise.all.bind(Promise);

module.exports = { and, all };
