// 类型声明
interface Options {
  scheduler?: (fn: EffectFn) => void;
  lazy?: boolean;
}

interface EffectFn {
  (): void;
  deps?: any[];
  options?: Options;
}

// 暂时存储本次注册的副作用函数
let activeEffect: EffectFn;
// effect 栈
const effectStarck: EffectFn[] = [];
// 存储所有注册的对应对象的对应的key的对应的副作用函数的桶
let bucket = new WeakMap();
// 任务队列
const jobQueue: Set<EffectFn> = new Set();
// 用来将任务添加到微任务队列
const p = Promise.resolve();
// 表示是否在刷新的标志
let isFlush = false;

function flushJob() {
  if (isFlush === true) return;
  isFlush = true;
  p.then(() => {
    jobQueue.forEach((job) => job());
  }).finally(() => {
    isFlush = false;
  });
}

// effect函数， 用于注册副作用函数
function effect(fn: () => any, options?: Options) {
  const effectFn: EffectFn = () => {
    clearUp(effectFn);
    // 存储当前的副作用
    activeEffect = effectFn;
    // 将当前（外层）副作用保存到副作用栈里面
    effectStarck.push(effectFn);
    // 执行副作用
    let res = fn();
    // 副作用执行完毕后，将当前（内层）副作用从副作用栈弹出
    effectStarck.pop();
    // 重新指向其外层的副作用
    activeEffect = effectStarck[effectStarck.length - 1];
    return res;
  };
  // 存储保存的有该副作用函数的依赖集合
  effectFn.deps = [];
  effectFn.options = options;
  // 判断副作用是否为懒执行
  if (effectFn.options?.lazy) {
    return effectFn;
  } else {
    effectFn();
  }
}

// clearUp 将副作用函数从其依赖集合中删除
function clearUp(effectFn: any) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    effectFn.deps[i].delete(effectFn);
  }
  effectFn.deps.length = 0;
}

//创建响应式代理
function createProxy(data: any) {
  return new Proxy(data, {
    get(target, key) {
      track(target, key);
      return target[key];
    },
    set(target, key, newVal) {
      target[key] = newVal;
      trigger(target, key);
      return true;
    },
  });
}

// 追踪函数，将对应对象的对应的key的对应的副作用函数存储进bucket
function track(target: any, key: string | symbol) {
  if (!activeEffect) return;
  let depsMap = bucket.get(target);
  if (!depsMap) bucket.set(target, (depsMap = new Map()));
  let deps = depsMap.get(key);
  if (!deps) depsMap.set(key, (deps = new Set()));
  deps.add(activeEffect);
  activeEffect.deps?.push(deps);
}
// 调用bucket里面存储的相应的副作用函数
function trigger(target: any, key: string | symbol) {
  let depsMap = bucket.get(target);
  if (!depsMap) return;
  let effects = depsMap.get(key);
  let effectsToRun = new Set<EffectFn>();
  // 避免无限递归(副作用还没执行完毕就trigger又调用副作用)
  effects.forEach((effect: EffectFn) => {
    if (effect != activeEffect) {
      effectsToRun.add(effect);
    }
  });
  effectsToRun.forEach((effect) => {
    // 支持调度器
    if (effect.options?.scheduler) {
      effect.options.scheduler(effect);
    } else {
      effect();
    }
  });
}

// 测试;
// const obj = createProxy({
//   name: 'wuLuo',
//   age: 19,
// });
// effect(
//   () => {
//     console.log(obj.age);
//   },
//   {
//     // 调度器
//     scheduler(fn) {
//       jobQueue.add(fn);
//       flushJob();
//     },
//   }
// );
// obj.age++;
// obj.age++;
// obj.age++;
// obj.age++;
// obj.age++;
// obj.age++;
// obj.age++;
// obj.age++;
// obj.age++;

export { EffectFn, createProxy, effect, track, trigger, flushJob, jobQueue };
