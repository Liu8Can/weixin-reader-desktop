import { describe, expect, it } from 'bun:test';
import { WeReadAdapter } from './weread_adapter';

const createAdapter = (): WeReadAdapter => Object.create(WeReadAdapter.prototype) as WeReadAdapter;

describe('WeReadAdapter 宽屏宽度', () => {
  it('使用传入的百分比生成宽屏样式', () => {
    const css = createAdapter().getWideModeCSS(true, 94);

    expect(css).toContain('width: 94% !important');
    expect(css).toContain('max-width: calc(100vw) !important');
    expect(css).not.toContain('max-width: calc(100vw - 224px)');
  });

  it('缺失或非法值回退到 90%', () => {
    const adapter = createAdapter();

    expect(adapter.getWideModeCSS(true)).toContain('width: 90% !important');
    expect(adapter.getWideModeCSS(true, 91)).toContain('width: 90% !important');
    expect(adapter.getWideModeCSS(true, 100)).toContain('width: 90% !important');
  });

  it('窄屏样式仍固定为原生 80%', () => {
    const css = createAdapter().getWideModeCSS(false, 98);

    expect(css).toContain('width: 80% !important');
  });

  it('显示工具栏时不再限制阅读区最大宽度', () => {
    const css = createAdapter().getToolbarCSS(false);

    expect(css).not.toContain('max-width: calc(100vw - 224px)');
  });

  it('隐藏工具栏时暂不启用 124px 最大宽度限制', () => {
    const css = createAdapter().getToolbarCSS(true);
    const activeCSS = css.replace(/\/\*[\s\S]*?\*\//g, '');

    expect(css).toContain('display: none !important');
    expect(css).toContain('/* max-width: calc(100vw - 124px) !important; */');
    expect(activeCSS).not.toContain('max-width: calc(100vw - 124px)');
  });
});
