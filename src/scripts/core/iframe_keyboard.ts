/**
 * 同源 iframe 事件转发（issue #5 通用修复，37617bf 复审后泛化）。
 *
 * 站点正文（微信读书 canvas 章节等）渲染在同源 iframe 内；两类事件在焦点/
 * 指针落入 frame 文档后不再冒泡到顶层 window：
 * - keydown：鼠标点击或划选 iframe 内文字后，键盘焦点进入该 iframe 文档
 *   （翻页/遥控器/Ctrl+H 快捷键处理收不到事件）。
 * - mousemove：指针位于 iframe 上方时事件派发给 frame 文档（全屏 hover
 *   唤出菜单栏的顶边命中带收不到事件——与 keydown 同构的断点）。
 *
 * 此工具把同一处理器挂到页面中全部同源 iframe 的文档上（capture 阶段），
 * 并对动态新增的 iframe 持续生效。mousemove 转发会附加 frame 修正：
 * 合成事件的 clientY 为「顶层视口坐标」（frame 顶偏移 + 事件原坐标），
 * 命中带的阈值判定因此与主文档一致。
 *
 * 事件驱动的 iframe 发现：MutationObserver 监听 DOM 新增节点，无轮询。
 * 跨域 iframe 的 contentDocument 访问会抛异常，静默跳过。
 */

interface FrameAwareMouseEvent extends MouseEvent {
  /** 顶层视口坐标（已按 frame 偏移换算）；主文档转发时与原值相同 */
  __atreaderTopClientY: number;
}

const topLevelClientY = (event: MouseEvent, frame: Element): number => {
  try {
    const rect = frame.getBoundingClientRect();
    return frame.ownerDocument === document
      ? event.clientY
      : event.clientY + rect.top;
  } catch {
    return event.clientY;
  }
};

export const attachEventToSameOriginIframes = (
  eventType: 'keydown' | 'mousemove',
  handler: (event: never) => void,
): (() => void) => {
  const instrumented = new WeakSet<HTMLIFrameElement>();
  // 缓存每个 doc 的 wrapped 监听器引用——removeEventListener 需要同一引用
  const attached = new Map<Document, EventListener>();

  const wrap = (doc: Document): EventListener => {
    if (eventType !== 'mousemove') return handler as EventListener;
    // mousemove 转发附加 frame 修正坐标（keyup/keydown 原样透传）
    return (event: Event) => {
      const frame = doc.defaultView?.frameElement;
      if (frame) {
        const enriched = event as FrameAwareMouseEvent;
        enriched.__atreaderTopClientY = topLevelClientY(event as MouseEvent, frame);
      }
      (handler as (e: Event) => void)(event);
    };
  };

  const attachDoc = (doc: Document | null): void => {
    if (!doc || attached.has(doc)) return;
    const wrapped = wrap(doc);
    attached.set(doc, wrapped);
    doc.addEventListener(eventType, wrapped, true);
  };

  const instrument = (iframe: Element): void => {
    if (instrumented.has(iframe as HTMLIFrameElement)) return;
    instrumented.add(iframe as HTMLIFrameElement);
    const tryAttach = (): void => {
      try {
        attachDoc((iframe as HTMLIFrameElement).contentDocument);
      } catch {
        // 跨域 iframe：contentDocument 不可访问，无法转发
      }
    };
    // 已加载完成的 iframe 立即挂载；未完成的等 load 事件（不同源时 load 后访问仍会抛错，已兜底）
    tryAttach();
    iframe.addEventListener('load', tryAttach, { once: true });
  };

  const isIframe = (node: Node): node is Element => node.nodeName === 'IFRAME';

  document.querySelectorAll('iframe').forEach(node => instrument(node));

  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (isIframe(node)) {
          instrument(node);
        } else if (node instanceof Element) {
          node.querySelectorAll('iframe').forEach(child => instrument(child));
        }
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    for (const [doc, wrapped] of attached) {
      doc.removeEventListener(eventType, wrapped, true);
    }
    attached.clear();
  };
};

/** 兼容既有调用方（remote_manager）：keydown 专用形态 */
export const attachKeyboardToSameOriginIframes = (
  handler: (event: KeyboardEvent) => void,
): (() => void) => attachEventToSameOriginIframes('keydown', handler as (event: never) => void);
