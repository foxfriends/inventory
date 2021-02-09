const PATH = Symbol('PATH'), DEREF = Symbol('DEREF');
const log = require('./log');

class Keypath extends Function {
  constructor(...path) {
    super();
    this[PATH] = path;
  }

  [DEREF](object) {
    for (const key of this) {
      if (typeof object[key] === 'function') {
        object = object[key].bind(object);
      } else {
        object = object[key];
      }
    }
    return object;
  }

  * [Symbol.iterator]() { yield * this[PATH]; }
}

function keypath(base) {
  return new Proxy(base, {
    get(target, prop) {
      if (prop !== Symbol.iterator) {
        return keypath(new Keypath(...target, prop));
      } else {
        return target[prop];
      }
    },

    apply(target, thisArg, args) {
      return target[DEREF](...args);
    }
  });
}

function fnKeypath(base) {
  return new Proxy(base, {
    get(target, prop) {
      if (prop !== Symbol.iterator) {
        return fnKeypath(new Keypath(...target, prop));
      } else {
        return target[prop];
      }
    },

    apply(target, thisArg, args) {
      return object => target[DEREF](object)(...args);
    }
  });
}

const _ = keypath(new Keypath);
const λ = fnKeypath(new Keypath);

module.exports = { _, λ };
