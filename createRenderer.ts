interface Options {
  createElement: (type: any) => VElement;
  setElementText: (el: VElement, text: string) => void;
  insert: (el: VElement, parent: VElement, anchor?: any) => void;
  patchProps: (
    el: VElement,
    key: string,
    prevValue: any,
    nextValue: any
  ) => void;
}

interface Vnode {
  type: any;
  props?: any;
  children?: any;
  el?: VElement;
}

interface VElement extends Element {
  _vnode?: Vnode | null;
  vei?: any;
}

// 创建适用于不同环境的渲染器
function createRenderer(options: Options) {
  // 获取浏览器环境的相关操作API
  const { createElement, setElementText, insert, patchProps } = options;

  function mountElement(vnode: Vnode, container: VElement) {
    // 在虚拟dom和对应的真实dom中建立一个联系
    const el = (vnode.el = createElement(vnode.type));
    // 添加属性
    if (vnode.props) {
      for (const key in vnode.props) {
        patchProps(el, key, null, vnode.props[key]);
      }
    }
    // 处理子节点
    if (typeof vnode.children === 'string') {
      setElementText(el, vnode.children);
    }
    if (Array.isArray(vnode.children)) {
      vnode.children.forEach((child) => patch(null, child, el));
    }
    // 执行挂载操作
    insert(el, container);
  }

  function patch(
    oldVnode: Vnode | undefined | null,
    newVnode: Vnode,
    container: VElement
  ) {
    if (oldVnode && oldVnode.type != newVnode.type) {
      unmount(oldVnode);
      oldVnode = null;
    }
    // 获取type属性, 用来判断vnode类型
    const { type } = newVnode;

    // 处理普通标签
    if (typeof type === 'string') {
      if (!oldVnode) {
        mountElement(newVnode, container);
      } else {
        patchElement();
      }
    }
    // 处理组件
    // if (typeof type === 'object') {
    // }
    // 处理其他类型的vnode
    // if (typeof type === 'xxx') {
    // }
  }

  // 更新元素
  function patchElement() {}

  function render(vnode: Vnode | null, container: VElement) {
    if (vnode) {
      patch(container._vnode, vnode, container);
    } else {
      if (container._vnode) {
        unmount(container._vnode);
      }
    }
    container._vnode = vnode;
  }

  function unmount(vnode: Vnode) {
    const parent = vnode.el?.parentNode;
    if (parent) {
      parent.removeChild(vnode.el as VElement);
    }
  }

  return {
    render,
  };
}

// 设置DOMPropties
function shouldSetAsProps(el: VElement, key: string, value: string) {
  // 只读属性特殊处理
  if (key === 'form' && el.tagName === 'INPUT') return false;
  // 判断el中是否有key这个DOM属性
  return key in el;
}

// 将class的多种类型（字符串，对象，数组）的值转换为字符串
function normalizeClass(oldClass: any) {
  let newClass: string = '';
  const type = typeof oldClass;

  function handleObeject(value: any) {
    for (const key in value) {
      if (value[key]) {
        newClass += key + '';
      }
    }
  }

  function handleArray(value: any) {
    value.forEach((child: any) => {
      const type = typeof child;
      if (type === 'object') handleObeject(child);
      if (type === 'string') newClass += child + '';
    });
  }

  if (type === 'object') handleObeject(oldClass);
  if (type === 'string') newClass += oldClass;
  if (Array.isArray(oldClass)) handleArray(oldClass);
  return newClass;
}

// 用于浏览器环境的渲染器
export const DOMRender = createRenderer({
  createElement(type: any) {
    return document.createElement(type);
  },
  setElementText(el: VElement, text: string) {
    el.innerHTML = text;
  },
  insert(el: VElement, parent: VElement, anchor = null) {
    parent.insertBefore(el, anchor);
  },
  patchProps(el, key, prevValue, nextValue) {
    // 绑定事件
    if (/^on/.test(key)) {
      const invokers = el.vei ?? (el.vei = {});
      let invoker: any = el.vei[key];
      const name = key.slice(2).toLowerCase();
      if (nextValue) {
        if (!invoker) {
          invoker = el.vei[key] = (e: any) => {
            // 如果事件被触发的事件早于事件处理函数被绑定的事件，则不执行事件处理函数
            if (e.timeStamp < invoker.attached) return;
            if (Array.isArray(invoker.value)) {
              invoker.value.forEach((fn: any) => fn(e));
            } else {
              invoker.value(e);
            }
          };
          invoker.value = nextValue;
          // attached属性存储事件处理函数被绑定的时间
          invoker.attached = performance.now();
          el.addEventListener(name, invoker);
        } else {
          invoker.value = nextValue;
        }
      } else if (invoker) {
        el.removeEventListener(name, invoker);
      }
    }
    // 绑定属性
    // 为了性能，对class属性特殊处理
    else if (key === 'class') {
      el.className = nextValue ?? '';
    } else if (shouldSetAsProps(el, key, nextValue)) {
      const type = typeof el[key];
      // 特殊处理
      if (type === 'boolean' && nextValue === '') {
        el[key] = true;
      } else {
        el[key] = nextValue;
      }
    } else {
      el.setAttribute(key, nextValue);
    }
  },
});
