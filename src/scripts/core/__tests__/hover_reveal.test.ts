import { describe, expect, it } from 'bun:test';
import {
  EDGE_HIT_PX,
  EDGE_THROTTLE_MS,
  REVEAL_MS,
  shouldRevealMenuBar,
  attachEventToSameOriginIframes,
} from './inject_reexports';
import { attachKeyboardToSameOriginIframes } from '../iframe_keyboard';

/**
 * 全屏 hover 唤出菜单栏（reveal_menu_bar_transient 链路）的前端契约：
 * - 命中带阈值/节流/驻留参数与 Rust 端 reveal_ms 语义对齐
 * - 纯判定器：全屏态、F11 抑制窗、坐标（含 iframe 换算坐标）、节流
 */
describe('全屏 hover 唤出命中判定', () => {
  it('静默参数：命中带 2px、节流 500ms、驻留 4s', () => {
    expect(EDGE_HIT_PX).toBe(2);
    expect(EDGE_THROTTLE_MS).toBe(500);
    expect(REVEAL_MS).toBe(4000);
  });

  it('全屏且坐标在命中带内 → 触发（返回时间戳）', () => {
    expect(shouldRevealMenuBar({ inFullscreen: true, suppressEdgeMove: false }, 0, 10_000, 0))
      .toBe(10_000);
    expect(shouldRevealMenuBar({ inFullscreen: true, suppressEdgeMove: false }, 2, 10_000, 0))
      .toBe(10_000);
    // 2px 是闭区间边界；3px 已出带
    expect(shouldRevealMenuBar({ inFullscreen: true, suppressEdgeMove: false }, 3, 10_000, 0))
      .toBeNull();
  });

  it('非全屏或抑制窗内 → 永不触发（F11 瞬间鼠标在顶缘不误唤出）', () => {
    expect(shouldRevealMenuBar({ inFullscreen: false, suppressEdgeMove: false }, 0, 10_000, 0))
      .toBeNull();
    expect(shouldRevealMenuBar({ inFullscreen: true, suppressEdgeMove: true }, 0, 10_000, 0))
      .toBeNull();
  });

  it('节流：上一次触发 500ms 内的重复命中被抑制（含 iframe 顶层坐标换算值）', () => {
    const t0 = 50_000;
    const first = shouldRevealMenuBar({ inFullscreen: true, suppressEdgeMove: false }, 1, t0, 0);
    expect(first).toBe(t0);
    // t0+499ms：被节流
    expect(shouldRevealMenuBar({ inFullscreen: true, suppressEdgeMove: false }, 1, t0 + 499, first!))
      .toBeNull();
    // t0+500ms：放行
    expect(shouldRevealMenuBar({ inFullscreen: true, suppressEdgeMove: false }, 1, t0 + 500, first!))
      .toBe(t0 + 500);
  });

  it('iframe 顶边换算：frame 内 clientY=0 但 frame 距顶 6px → 顶层坐标 6px 出带不触发', () => {
    // 契约语义：判定器只看传入的 y（已由转发层换算为顶层视口坐标）——
    // 转发层的换算正确性由 iframe_keyboard 的事件包装保证，这里锁住
    // 「判定器不需要知道坐标来源」的分层
    expect(shouldRevealMenuBar({ inFullscreen: true, suppressEdgeMove: false }, 6, 10_000, 0))
      .toBeNull();
  });
});

describe('iframe 事件转发工具兼容形态', () => {
  it('keydown 专用包装保持函数签名（remote_manager 既有调用方零破坏）', () => {
    expect(typeof attachKeyboardToSameOriginIframes).toBe('function');
    expect(typeof attachEventToSameOriginIframes).toBe('function');
    const detach = attachKeyboardToSameOriginIframes(() => {});
    expect(typeof detach).toBe('function');
    detach();
  });
});
