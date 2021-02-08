const and = (...promises) => async (value) => [value, ...await Promise.all(promises)];
const all = Promise.all.bind(Promise);
const defer = (task) => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => (resolve = res, reject = rej)).then(task);
  promise.start = resolve;
  promise.cancel = reject;
  return promise;
};

module.exports = { and, all };
