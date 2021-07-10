import type { Constructor } from 'lit-element';

interface ClassElement {
  kind: 'field' | 'method';
  key: PropertyKey;
  placement: 'static' | 'prototype' | 'own';
  initializer?: Function;
  extras?: ClassElement[];
  finisher?: <T>(clazz: Constructor<T>) => undefined | Constructor<T>;
  descriptor?: PropertyDescriptor;
}

export function debounce(time = 250, callFirst = false): any {
  return function (descriptor: ClassElement) {
    const map = new WeakMap();
    const originalMethod = descriptor.descriptor!.value;

    descriptor.descriptor!.value = function (
      ...params: Parameters<typeof originalMethod>
    ) {
      let debounced = map.get(this);
      if (!debounced) {
        debounced = debounceFn(originalMethod, time, callFirst).bind(this);
        map.set(this, debounced);
      }
      debounced(...params);
    };
    return descriptor;
  };
}

export function throttle(time = 250, callFirst = false): any {
  return function (descriptor: ClassElement) {
    const map = new WeakMap();
    const originalMethod = descriptor.descriptor!.value;
    descriptor.descriptor!.value = function (
      ...params: Parameters<typeof originalMethod>
    ) {
      let throttled = map.get(this);
      if (!throttled) {
        throttled = throttleFn(originalMethod, time, callFirst).bind(this);
        map.set(this, throttled);
      }
      throttled(...params);
    };
    return descriptor;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounceFn<T extends (...args: any) => any>(
  fn: T,
  wait: number,
  callFirst?: boolean,
) {
  let timeout: undefined | ReturnType<typeof setTimeout>;
  return function <F>(this: F, ...args: Parameters<T>) {
    const apply = () => fn.apply(this, args);
    if (!wait) return apply();

    const callNow = callFirst && !timeout;
    timeout ?? clearTimeout(timeout);

    timeout = setTimeout(() => {
      timeout = undefined;
      if (!callNow) return apply();
    }, wait);

    if (callNow) return apply();
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttleFn<T extends (...args: any) => any>(
  fn: T,
  interval: number,
  callFirst: boolean,
) {
  let wait = false;
  let callNow = false;
  return function <F>(this: F, ...args: Parameters<T>) {
    callNow = callFirst && !wait;
    if (!wait) {
      wait = true;
      setTimeout(() => {
        wait = false;
        if (!callFirst) return fn.apply(this, args);
      }, interval);
    }
    if (callNow) {
      callNow = false;
      return fn.apply(this, args);
    }
  };
}
