/**
 * 测试专用再导出：inject.ts 的入口是"注入脚本 main()"（副作用顶层执行，
 * 不能被测试直接 import——`void main()` 会在 happy-dom 里跑整个注入流程）。
 * 命中带常量与 pure 判定器通过此文件暴露给 hover_reveal.test.ts。
 *
 * 注：extract 到独立模块是更彻底的方案；此处选择 re-export shim 以保持
 * inject diff 最小（本次批量已涉及该文件多处），重构留给后续。
 */
export {
  EDGE_HIT_PX,
  EDGE_THROTTLE_MS,
  REVEAL_MS,
  shouldRevealMenuBar,
} from '../../inject';
export { attachEventToSameOriginIframes } from '../iframe_keyboard';
