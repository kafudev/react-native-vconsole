export function throttle(
  delay: any,
  noTrailing: any,
  callback: any,
  debounceMode?: any
) {
  let timeoutID: any;
  let lastExec = 0;
  if (typeof noTrailing !== 'boolean') {
    debounceMode = callback;
    callback = noTrailing;
    noTrailing = undefined;
  }

  function wrapper(...args: []) {
    const elapsed = Number(new Date()) - lastExec;
    function exec() {
      lastExec = Number(new Date());
      // @ts-ignore
      callback.apply(this, args);
    }

    function clear() {
      timeoutID = undefined;
    }

    if (debounceMode && !timeoutID) {
      exec();
    }

    if (timeoutID) {
      clearTimeout(timeoutID);
    }

    if (debounceMode === undefined && elapsed > delay) {
      exec();
    } else if (noTrailing !== true) {
      timeoutID = setTimeout(
        debounceMode ? clear : exec,
        debounceMode === undefined ? delay - elapsed : delay
      );
    }
  }

  return wrapper;
}

export function debounce(delay: any, atBegin: any, callback: any) {
  return callback === undefined
    ? throttle(delay, atBegin, false)
    : throttle(delay, callback, atBegin !== false);
}
