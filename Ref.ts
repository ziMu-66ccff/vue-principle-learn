import { reactive } from './Reactive';

function ref(val: any) {
  const wrapper = {
    value: val,
  };
  // 给ref添加一个不可以被枚举的独特标识
  Object.defineProperty(wrapper, '_isRef', {
    value: true,
  });
  return reactive(wrapper);
}

function toRef(obj: any, key: string) {
  const wrapper = {
    get value() {
      return obj[key];
    },
    set value(newVal) {
      obj[key] = newVal;
    },
  };
  Object.defineProperty(wrapper, '_isRef', {
    value: true,
  });
  return wrapper;
}

function toRefs(obj: any) {
  const wrapper = {};
  for (let key in obj) {
    wrapper[key] = toRef(obj, key);
  }
  return wrapper;
}

function ProxyRefs(target: any) {
  return new Proxy(target, {
    get(target, key, receiver) {
      // 在getter内部完成取值的默认行为
      const value = Reflect.get(target, key, receiver);
      return value._isRef ? value.value : value;
    },
    set(target, key, newVal, receiver) {
      const value = target[key];
      if (value._isRef) {
        value.value = newVal;
        return true;
      }
      // 在setter内部完成改值的默认行为
      return Reflect.set(target, key, newVal, receiver);
    },
  });
}
