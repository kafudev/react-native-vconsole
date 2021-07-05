class Event {
  private eventList: {};
  constructor() {
    this.eventList = {};
  }

  on(eventName: any, callback: any) {
    if (!this.eventList[eventName]) {
      this.eventList[eventName] = [];
    }
    this.eventList[eventName].push(callback);
    return this;
  }

  trigger(...args: []) {
    const key = Array.prototype.shift.call(args);
    const fns = this.eventList[key];
    if (!fns || fns.length === 0) {
      return this;
    }
    for (let i = 0, fn; (fn = fns[i++]); ) {
      fn.apply(this, args);
    }
    return this;
  }

  off(key: any, fn: any) {
    const fns = this.eventList[key];
    if (!fns) {
      return this;
    }
    if (!fn) {
      if (fns) {
        fns.length = 0;
      }
    } else {
      for (let i = fns.length - 1; i >= 0; i--) {
        const _fn = fns[i];
        if (_fn === fn) {
          fns.splice(i, 1);
        }
      }
    }
    return this;
  }
}

const event = new Event();

export default event;
