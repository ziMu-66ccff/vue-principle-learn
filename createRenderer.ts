interface Options {
  createElement: (tag: string) => VElement;
  setElementText: (el: VElement, text: string) => void;
  insert: (el: VElement, parent: VElement, anchor?: any) => void;
}

interface Vnode {
  tag: string;
  props?: any;
  children?: any;
}

interface VElement extends HTMLElement {
  _vnode?: Vnode | null;
}

function createRenderer(options: Options) {
  const { createElement, setElementText, insert } = options;

  function mountElement(vnode: Vnode, container: VElement) {
    const el = createElement(vnode.tag);

    if (vnode.props) {
      for (let key of Object.keys(vnode.props)) {
        if (/^@/.test(key)) {
          el.addEventListener(
            key.substring(1).toLocaleLowerCase(),
            vnode.props[key]
          );
        } else {
          el.setAttribute(key, vnode.props[key]);
        }
      }
    }

    if (typeof vnode.children === 'string') {
      setElementText(el, vnode.children);
    }
    if (Array.isArray(vnode.children)) {
      vnode.children.forEach((child) => mountElement(child, el));
    }

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
});
