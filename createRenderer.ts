import { effect, reactive, flushJob, jobQueue } from './Reactive';

interface Options {
  createElement: (type: any) => VElement;
  setElementText: (el: VElement, text: string) => void;
  insert: (el: VElement, parent: VElement, anchor?: any) => void;
  createText: (text: string) => any;
  createComment: (text: string) => any;
  setText: (el: VElement, text: string) => void;
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
  key?: any;
  component?: any;
}

interface VElement extends Element {
  _vnode?: Vnode | null;
  vei?: any;
}

interface instance {
  state: any;
  props: any;
  isMounted: boolean;
  subTree: any;
}

const Text = Symbol();
const Comment = Symbol();
const Fragment = Symbol();

// 创建适用于不同环境的渲染器
function createRenderer(options: Options) {
  // 获取浏览器环境的相关操作API
  const {
    createElement,
    setElementText,
    insert,
    createText,
    createComment,
    setText,
    patchProps,
  } = options;

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

  function patch(
    oldVnode: Vnode | undefined | null,
    newVnode: Vnode,
    container: VElement,
    anchor: any = null
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
        mountElement(newVnode, container, anchor);
      } else {
        patchElement(oldVnode, newVnode);
      }
    }
    // 处理文本节点
    else if (type === Text) {
      if (!oldVnode) {
        const el = (newVnode.el = createText(newVnode.children));
        insert(container, el);
      } else {
        const el = (newVnode.el = oldVnode.el as VElement);
        if (oldVnode.children != newVnode.children) {
          setText(el, newVnode.children);
        }
      }
    }
    // 处理注释节点
    else if (type === Comment) {
      if (!oldVnode) {
        const el = (newVnode.el = createComment(newVnode.children));
        insert(container, el);
      } else {
        const el = (newVnode.el = oldVnode.el as VElement);
        if (oldVnode.children != newVnode.children) {
          setText(el, newVnode.children);
        }
      }
    }
    // 处理Fragment虚拟节点
    else if (type === Fragment) {
      if (!oldVnode) {
        newVnode.children.forEach((vnode: Vnode) =>
          patch(null, vnode, container)
        );
      } else {
        patchChildren(oldVnode, newVnode, container);
      }
    }
    // 处理组件
    else if (typeof type === 'object') {
      if (!oldVnode) {
        mountComponent(newVnode, container);
      } else {
        patchComponent(oldVnode, newVnode);
      }
    }
    // 处理其他类型的vnode
    // if (typeof type === 'xxx') {
    // }
  }

  function unmount(vnode: Vnode) {
    if (vnode.type === Fragment) {
      vnode.children.forEach((vnode: Vnode) => unmount(vnode));
    }
    const parent = vnode.el?.parentNode;
    if (parent) {
      parent.removeChild(vnode.el as VElement);
    }
  }

  function mountElement(vnode: Vnode, container: VElement, anchor: any = null) {
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
    insert(el, container, anchor);
  }

  function patchElement(oldVnode: Vnode, newVnode: Vnode) {
    const el = (newVnode.el = oldVnode.el as VElement);
    const oldProps = oldVnode.props;
    const newProps = newVnode.props;
    // 更新Props
    for (const key in newProps) {
      if (oldProps[key] != newProps[key]) {
        patchProps(el, key, oldProps[key], newProps[key]);
      }
    }
    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProps(el, key, oldProps[key], null);
      }
    }
    // 更新children
    patchChildren(oldVnode.children, newVnode.children, el);
  }

  function mountComponent(
    vnode: Vnode,
    container: VElement,
    anchor: any = null
  ) {
    const componentOptions = vnode.type;
    const { render, data, props: propsOption } = componentOptions;
    const state = reactive(data());
    const [props, attrs] = resolveProps(propsOption, vnode.props);

    const instance: instance = {
      state,
      props: reactive(props),
      isMounted: false,
      subTree: null,
    };

    vnode.component = instance;

    const renderContext = new Proxy(instance, {
      get(target, key, receiver) {
        const { state, props } = target;
        if (key in state) {
          return state[key];
        } else if (key in props) {
          return props[key];
        } else {
          console.error('不存在');
        }
      },
      set(target, key, newValue, receiver) {
        const { state, props } = target;
        if (key in state) {
          state[key] = newValue;
        } else if (key in props) {
          props[key] = newValue;
        } else {
          console.error('不存在');
        }
        return true;
      },
    });
    created && created.call(renderContext);
    effect(
      () => {
        const subTree = render.call(state, state);
        if (!instance.isMounted) {
          beforeMounted && beforeMounted.call(renderContext);
          patch(null, subTree, container);
          instance.isMounted = true;
          mounted && mounted.call(renderContext);
        } else {
          beforeUpdated && beforeUpdated.call(renderContext);
          patch(instance.subTree, subTree, container);
          updated && updated.call(renderContext);
        }
        instance.subTree = subTree;
      },
      {
        scheduler(effect) {
          jobQueue.add(effect);
          flushJob();
        },
      }
    );
  }

  function patchComponent(
    oldVnode: Vnode,
    newVnode: Vnode,
    anchor: any = null
  ) {
    const instance = (newVnode.component = oldVnode.component);
    const { props } = instance;
    if (hasPropsChanged(oldVnode.props, newVnode.props)) {
      const [nextProps] = resolveProps(newVnode.type.props, newVnode.props);
      for (let key in nextProps) {
        props[key] = nextProps[key];
      }
      for (let key in props) {
        if (!(key in nextProps)) {
          delete props[key];
        }
      }
    }
  }

  function resolveProps(options: any, propsData: any) {
    const props = {};
    const attrs = {};
    for (const key in propsData) {
      if (key in options) {
        props[key] = propsData[key];
      } else {
        attrs[key] = propsData[key];
      }
    }
    return [props, attrs];
  }

  function hasPropsChanged(preProps: any, nextProps: any) {
    const nextKeys = Object.keys(nextProps);
    if (Object.keys(preProps).length !== nextKeys.length) return true;
    for (let i = 0; i < nextKeys.length; i++) {
      if (preProps[nextKeys[i]] !== nextProps[nextKeys[i]]) return true;
    }
    return false;
  }

  // 生命周期钩子函数
  function created(component: instance) {}
  function beforeMounted(component: instance) {}
  function mounted(component: instance) {}
  function beforeUpdated(component: instance) {}
  function updated(component: instance) {}

  function patchChildren(
    oldChildren: any,
    newChildren: any,
    container: VElement
  ) {
    // 对文本子节点的更新
    if (typeof newChildren === 'string') {
      if (Array.isArray(oldChildren)) {
        oldChildren.forEach((vnode) => unmount(vnode));
      }
      setElementText(container, newChildren);
    }
    // 对一组子节点的更新
    else if (Array.isArray(newChildren)) {
      // 旧节点是一组子节点时
      if (Array.isArray(oldChildren)) {
        // // 1.利用简单diff算法优化
        // let lastIndex = 0;
        // for (let i = 0; i < newChildren.length; i++) {
        //   const newVnode = newChildren[i];
        //   let find = false;
        //   for (let j = 0; j < oldChildren.length; j++) {
        //     const oldVnode = oldChildren[j];
        //     if (newVnode.key === oldVnode.key) {
        //       find = true;
        //       patch(oldVnode, newVnode, container);
        //       if (j < lastIndex) {
        //         const preVnode = newChildren[i - 1];
        //         if (preVnode) {
        //           const anchor = preVnode.el.nextSibling;
        //           insert(newChildren[i], container, anchor);
        //         }
        //       } else {
        //         lastIndex = j;
        //       }
        //       break;
        //     }
        //     // 执行到这里时，find依旧为false，说明在旧子节点里面没有找到一样的key,则需要添加（挂载）新的子节点
        //     if (!find) {
        //       const preVnode = newChildren[i - 1];
        //       let anchor: any = null;
        //       if (preVnode) {
        //         anchor = preVnode.el.nextSibling;
        //       } else {
        //         anchor = container.firstChild;
        //       }
        //       patch(null, newVnode, container, anchor);
        //     }
        //   }
        // }
        // // 删除新的子节点中已经不存在的旧的子节点
        // for (let i = 0; i < oldChildren.length; i++) {
        //   const oldVnode = oldChildren[i];
        //   let has = newChildren.find((vnode) => vnode.key === oldVnode.key);
        //   if (!has) {
        //     unmount(oldVnode);
        //   }
        // }

        // // 2.利用双端对比diff算法进行优化
        // patchkeyedChildren(oldChildren, newChildren, container);
        // // 双端对比diff算法
        // function patchkeyedChildren(
        //   oldChildren: any,
        //   newChildren: any,
        //   container: VElement
        // ) {
        //   // 四种索引值
        //   let oldStartIndex = 0;
        //   let newStartIndex = 0;
        //   let oldEndIndex = oldChildren.length - 1;
        //   let newEndIndex = newChildren.length - 1;
        //   // 四种索引值对应的虚拟node
        //   let oldStartVnode = oldChildren[oldStartIndex];
        //   let newStartVnode = newChildren[newStartIndex];
        //   let oldEndVnode = oldChildren[oldEndIndex];
        //   let newEndVnode = newChildren[newEndIndex];
        //   while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
        //     // 如果旧头尾节点为undifined，则意味着已经被处理过了，则直接跳过
        //     if (!oldStartVnode) {
        //       oldStartVnode = oldChildren[++oldStartIndex];
        //     } else if (!oldEndVnode) {
        //       oldEndVnode = oldChildren[--oldEndIndex];
        //       // 进行双端的四种比较
        //     } else if (oldStartVnode.key === newStartVnode.key) {
        //       patch(oldStartVnode, newStartVnode, container);
        //       oldStartVnode = oldChildren[++oldStartIndex];
        //       newStartVnode = newChildren[++newStartIndex];
        //     } else if (oldEndVnode.key === newEndVnode.key) {
        //       patch(oldEndVnode, newEndVnode, container);
        //       oldEndVnode = oldChildren[--oldEndIndex];
        //       newEndVnode = newChildren[--newEndIndex];
        //     } else if (oldStartVnode.key === newEndVnode.key) {
        //       patch(oldStartVnode, newEndVnode, container);
        //       insert(oldStartVnode.el, container, oldEndVnode.el.nextSibling);
        //       oldStartVnode = oldChildren[++oldStartIndex];
        //       newEndVnode = newChildren[--newEndIndex];
        //     } else if (oldEndVnode.key === newStartVnode.key) {
        //       patch(oldEndVnode, newStartVnode, container);
        //       insert(oldEndVnode.el, container, oldStartVnode.el);
        //       oldEndVnode = oldChildren[--oldEndIndex];
        //       newStartVnode = newChildren[++newStartIndex];
        //     }
        //     // 四种比较都没找到可以复用的节点，则拿着新头节点来遍历旧节点，来寻找可复用的节点
        //     else {
        //       const newStartInOldIndex = oldChildren.findIndex(
        //         (vnode: Vnode) => vnode.key === newStartVnode.key
        //       );
        //       if (newStartInOldIndex > 0) {
        //         const vnodeToMove = oldChildren[newStartInOldIndex];
        //         patch(vnodeToMove, newStartVnode, container);
        //         insert(vnodeToMove.el, container, oldStartVnode.el);
        //         oldChildren[newStartInOldIndex] = undefined;
        //       } else {
        //         patch(null, newStartVnode, oldStartVnode.el);
        //       }
        //       newStartVnode = newChildren[++newStartIndex];
        //     }
        //   }
        //   // 循环结束后，检查是否有漏掉的需要添加（挂载）的新节点 or 需要卸载的旧节点
        //   if (oldStartIndex > oldEndIndex && newStartIndex <= newEndIndex) {
        //     for (let i = newStartIndex; i <= newEndIndex; i++) {
        //       const anchor = newChildren[newEndIndex + 1]
        //         ? newChildren[newEndIndex].el
        //         : null;
        //       patch(null, newChildren[i], container, anchor);
        //     }
        //   } else if (
        //     newStartIndex > newEndIndex &&
        //     oldStartIndex <= oldEndIndex
        //   ) {
        //     for (let i = oldStartIndex; i <= oldEndIndex; i++) {
        //       unmount(oldChildren[i]);
        //     }
        //   }
        // }

        // 3. 利用快速diff算法进行优化
        patchkeyedChildren(oldChildren, newChildren, container);

        function patchkeyedChildren(
          oldChildren: any,
          newChildren: any,
          container: VElement
        ) {
          let j = 0;
          let newStartVnode = newChildren[j];
          let oldStartVnode = oldChildren[j];
          let newEndIndex = newChildren.length - 1;
          let oldEndIndex = oldChildren.length - 1;
          let newEndVnode = newChildren[newEndIndex];
          let oldEndVnode = oldChildren[oldEndIndex];

          while (newStartVnode.key === oldStartVnode.key) {
            patch(oldStartVnode, newStartVnode, container);
            j++;
            newStartVnode = newChildren[j];
            oldStartVnode = oldChildren[j];
          }
          while (newEndVnode.key === oldEndVnode.key) {
            patch(oldEndVnode, newEndVnode, container);
            newEndIndex--;
            oldEndIndex--;
            newEndVnode = newChildren[newEndIndex];
            oldEndVnode = oldChildren[oldEndIndex];
          }
          if (oldEndIndex < j && newEndIndex >= j) {
            const anchorIndex = newEndIndex + 1;
            const anchor =
              anchorIndex < newChildren.length
                ? newChildren[anchorIndex].el
                : null;
            while (j <= newEndIndex) {
              patch(null, newChildren[j++], container, anchor);
            }
          } else if (newEndIndex < j && oldEndIndex >= j) {
            while (j <= oldEndIndex) {
              unmount(oldChildren[j++]);
            }
          } else {
            const count = newEndIndex - j + 1;
            const source = new Array(count);
            source.fill(-1);
            const keyindex = {};
            let move = false;
            let pos = 0;
            let patched = 0;

            for (let i = j; i <= newEndIndex; i++) {
              keyindex[newChildren[i].key] = i;
            }
            for (let i = j; i <= oldEndIndex; i++) {
              const oldVnode = oldChildren[i];
              if (patched <= count) {
                const k = keyindex[oldVnode.key];
                if (typeof k != 'undefined') {
                  const newVnode = newChildren[k];
                  patch(oldVnode, newVnode, container);
                  patched++;
                  source[k - j] = i;
                  if (k < pos) {
                    move = true;
                  } else {
                    pos = k;
                  }
                } else {
                  unmount(oldVnode);
                }
              } else {
                unmount(oldVnode);
              }
            }
            if (move) {
              const seq = list(source);
              let s = seq.length - 1;
              let i = count - 1;
              for (i; i >= 0; i--) {
                if (source[i] === -1) {
                  const newIndex = i + j;
                  const newVnode = newChildren[newIndex];
                  const anchor = newChildren[newIndex + 1]
                    ? newChildren[newEndIndex + 1].el
                    : null;
                  patch(null, newVnode, container, anchor);
                } else if (i !== seq[s]) {
                  const newIndex = i + j;
                  const newVnode = newChildren[newIndex];
                  const anchor = newChildren[newIndex + 1]
                    ? newChildren[newEndIndex + 1].el
                    : null;
                  insert(newVnode, container, anchor);
                } else {
                  s--;
                }
              }
            }
          }

          // 求给定序列的最长递增子序列
          function list(arr: number[]) {
            return [];
          }
        }
      }
      // 旧节点是文本子节点 or 空子节点
      setElementText(container, '');
      newChildren.forEach((vnode) => patch(null, vnode, container));
    }
    // 对空子节点的更新
    else {
      if (Array.isArray(oldChildren)) {
        oldChildren.forEach((vnode) => unmount(vnode));
      }
      setElementText(container, '');
    }
  }

  return {
    render,
  };
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
  createText(text: string) {
    return document.createTextNode(text);
  },
  createComment(text: string) {
    return document.createComment(text);
  },
  setText(el: VElement, text: string) {
    el.nodeValue = text;
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
