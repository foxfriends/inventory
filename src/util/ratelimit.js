const { defer } = require('./promise');

class Queue {
  #running = false;
  #queue = [];
  #rate;

  constructor(rate) {
    this.#rate = rate;
  }

  #timeout;
  #startQueue() {
    if (this.#running && !this.#timeout) {
      this.#timeout = setTimeout(() => {
        if (this.#queue.length) {
          this.#queue.shift().start();
          this.#running = true;
        } else {
          this.#running = false;
        }
        this.#timeout = undefined;
        this.#startQueue();
      }, this.#rate);
    }
  }

  async schedule(callback) {
    const task = defer(callback);
    if (!this.#running) {
      this.#running = true;
      task.start();
    } else {
      this.#queue.push(task);
    }
    this.#startQueue();
    return task;
  }
}

module.exports = Queue;
