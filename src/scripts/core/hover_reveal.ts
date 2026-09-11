/**
 * 全屏 hover 唤出菜单栏的前端配置与纯判定器。
 *
 * 独立模块（不是 inject.ts 的一部分）的原因：inject.js 是 WebView2 的
 * 初始化脚本，以【经典脚本】上下文执行——任何顶层 export 语句都是语法
 * 错误，会让整个注入脚本解析失败（dev.6 真机全功能失效的根因）。凡
 * inject.ts 需要复用的可测单元，一律放本模块再 import。
 */

/** 全屏 hover 命中带：CSS 像素（125%/150% DPI 换算后捕获带仍有 1~3px） */
export const EDGE_HIT_PX = 2;
/** 命中带触发节流：驻留/滑动经过顶边时不以 mousemove 频率连发 IPC */
export const EDGE_THROTTLE_MS = 500;
/** hover 唤出后驻留时长；用户停留在下拉菜单上操作时靠再次碰顶 re-arm 延长 */
export const REVEAL_MS = 4000;

/** hover 唤出命中的纯判定（inject 级联的独立可测单元）：
 * 是否应当触发一次 reveal IPC？由全屏态、F11 抑制窗、坐标、节流共同决定。
 * 返回应记录的触发时间戳，或 null（不触发）。 */
export const shouldRevealMenuBar = (state: {
  inFullscreen: boolean;
  suppressEdgeMove: boolean;
}, y: number, now: number, lastRevealAt: number): number | null => {
  if (!state.inFullscreen || state.suppressEdgeMove) return null;
  if (y > EDGE_HIT_PX) return null;
  if (now - lastRevealAt < EDGE_THROTTLE_MS) return null;
  return now;
};
