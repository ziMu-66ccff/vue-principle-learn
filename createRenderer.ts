interface Options {
  createElement: (tag: string) => VElement;
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
  tag: string;
  props?: any;
  children?: any;
}

interface VElement extends Element {
  _vnode?: Vnode | null;
}

// 创建适用于不同环境的渲染器
function createRenderer(options: Options) {
  // 获取浏览器环境的相关操作API
  const { createElement, setElementText, insert, patchProps } = options;

  function mountElement(vnode: Vnode, container: VElement) {
    const el = createElement(vnode.tag);
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
    if (!oldVnode) {
      mountElement(newVnode, container);
    } else {
      // 需要更新
    }
  }

  function render(vnode: Vnode | null, container: VElement) {
    if (vnode) {
      patch(container._vnode, vnode, container);
    } else {
      if (container._vnode) {
        container.innerHTML = '';
      }
    }
    container._vnode = vnode;
  }

  return {
    render,
  };
}

// 设置DOMPropties
function shouldSetAsProps(el: VElement, key: string, value: string) {
  // 只读属性特殊处理
  if (key === 'form' && el.tagName === 'INPUT') return false;
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

// 用于浏览器平台的渲染器
export const DOMRender = createRenderer({
  createElement(tag: string) {
    return document.createElement(tag);
  },
  setElementText(el: VElement, text: string) {
    el.innerHTML = text;
  },
  insert(el: VElement, parent: VElement, anchor = null) {
    parent.insertBefore(el, anchor);
  },
  patchProps(el, key, prevValue, nextValue) {
    // 为了性能，对class属性特殊处理
    if (key === 'class') {
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
