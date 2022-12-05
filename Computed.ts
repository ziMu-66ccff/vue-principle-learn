import {
  EffectFn,
  createProxy,
  effect,
  track,
  trigger,
  flushJob,
  jobQueue,
} from './Responsive';

// 计算属性computed
function computed(getter: EffectFn) {
  let value: any;
  // 判断是否需要重新计算
  let isDirty: boolean = true;

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      isDirty = true;
      trigger(obj, 'value');
    },
  }) as EffectFn;

  const obj = {
    get value() {
      if (isDirty) {
        isDirty = false;
        value = effectFn();
      }
      track(obj, 'value');
      return value;
    },
  };

  return obj;
}

// 测试;
const obj = createProxy({
  name: 'zimu',
  age: 19,
  num: 2,
});

const sum = computed(() => obj.age + obj.num);

effect(
  () => {
    console.log(sum.value);
  },
  // 配置调度器，多次更新，只更新最后一次
  {
    scheduler(fn) {
      jobQueue.add(fn);
      flushJob();
    },
  }
);

obj.age++;
obj.age++;
obj.age++;
obj.age++;
