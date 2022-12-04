// 渲染函数
// tag：标签名 ，字符串类型 or 函数类型
// props: { 属性名: 属性值 } or { on时间名：回调函数 }
// children: 包含描述子节点的树状数据的数组 or 描述文本子节点的字符串
export function render(tag, props, children) {
  return {
    tag: tag,
    props: props,
    children: children,
  };
}

// 渲染器
export function renderer(vnode, container) {
  const el = document.createElement(vnode.tag);
  // 处理绑定的属性 or 事件
  if (vnode.props) {
    for (let key of Object.keys(vnode.props)) {
      if (/^on/.test(key)) {
        // 以on开头说明绑定的是事件
        el.addEventListener(
          key.substr(2).toLocaleLowerCase(),
          vnode.props[key]
        );
      } else {
        // 否则 绑定的则是属性
        el.setAttribute(key, vnode.props[key]);
      }
    }
  }
  // 处理子节点
  if (typeof vnode.children === 'string') {
    // 子节点为文本节点
    el.appendChild(document.createTextNode(vnode.children));
  }
  if (Array.isArray(vnode.children)) {
    vnode.children.forEach((child) => {
      renderer(child, el);
    });
  }
  // 将元素挂载在容器下面
  container.appendChild(el);
}
