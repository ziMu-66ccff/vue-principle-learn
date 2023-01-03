import type { EffectFn } from './Reactive';
import { effect, reactive } from './Reactive';

interface WatchOptions {
  immediate: boolean;
  // 暂不支持pre，post，等待后续更新
  flush: 'flush';
}

function watch(
  source: any,
  cb: (
    oldValue?: any,
    newValue?: any,
    onInvalidate?: (fn: () => void) => void
  ) => any,
  options?: WatchOptions
) {
  let getter: any;
  let oldValue: any;
  let newValue: any;
  // 存储注册的过期回调
  let clearUp: (() => void) | undefined = undefined;
  // 监视的是getter函数
  if (typeof source === 'function') {
    getter = source;
  } else {
    // 监视的是响应式对象
    getter = () => traverse(source);
  }

  function onInvalidate(fn: () => void) {
    clearUp = fn;
  }
  const job = (fn?: EffectFn) => {
    newValue = effectFn();
    // 在cb()执行前检查是否有过期回调函数
    if (clearUp) {
      clearUp();
    }
    // 当监视的响应式数据发生变化时调用cb()
    cb(oldValue, newValue, onInvalidate);
    // 修改旧值，此时的新值是以后的旧值
    oldValue = newValue;
  };

  const effectFn = effect(
    // 执行getter()
    () => getter(),
    {
      lazy: true,
      scheduler: () => {
        if (options?.flush) {
          const p = Promise.resolve();
          p.then(() => {
            job();
          });
        } else {
          job();
        }
      },
    }
  ) as EffectFn;
  if (options?.immediate) {
    // 立即执行回调函数，并获取newValue， oldValue，此时oldValue为undifined
    job();
  } else {
    // 手动调用effectFn函数，得到的是最开始的值（此时值还没有被修改过），是最初的原值
    oldValue = effectFn();
  }
}

// 遍历响应式对象，获取对象身上的所有属性，以便于触发track追踪函数，绑定副作用
function traverse(value: any, seen: Set<any> = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) return;
  seen.add(value);
  for (let k in value) {
    traverse(value[k], seen);
  }
  return value;
}

//测试1
// const obj = reactive({
//   name: 'wuLuo',
//   age: 19,
// });

// watch(obj, () => {
//   console.log(obj.name);
// });

// obj.name = 'ziMu';
// obj.name = '66ccff';
// obj.age = 6;

//测试2
// const obj = reactive({
//   num: 1,
// });
// watch(
//   () => obj.num,
//   (oldValue, newValue) => {
//     console.log(oldValue, newValue);
//   }
// );
// obj.num++;
