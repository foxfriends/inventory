const and = (promise) => async (value) => [value, await promise];

module.exports = { and };
