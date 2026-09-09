import { describe, expect, it } from 'bun:test';
import { WeReadAdapter } from './weread_adapter';

const createAdapter = (): WeReadAdapter => Object.create(WeReadAdapter.prototype) as WeReadAdapter;

describe('WeReadAdapter 宽屏宽度', () => {
  it('同步调整正文画布和顶部栏，并将工具栏固定在视口右侧', () => {
    const css = createAdapter().getWideModeCSS(true, 60);

    expect(css).toContain('.readerContent > .app_content:not(.app_content_in_reader)');
    expect(css).toContain('width: 60vw !important');
    expect(css).toContain('.wr_horizontalReader_app_content .readerChapterContent');
    expect(css).toContain('right: 24px !important');
    expect(css).toContain('left: auto !important');
    expect(css).toContain('margin-left: 0 !important');
    expect(css).not.toContain('html body .app_content,');
    expect(css).not.toContain('calc(100vw - 224px)');
    expect(css).not.toContain('min(');
  });

  it('40% 到 98% 的滑块值均生成真实且不同的视口宽度', () => {
    const adapter = createAdapter();

    for (const width of [40, 76, 90, 98]) {
      expect(adapter.getWideModeCSS(true, width)).toContain(`width: ${width}vw !important`);
    }
  });

  it('缺失或非法值回退到 90%', () => {
    const adapter = createAdapter();

    expect(adapter.getWideModeCSS(true)).toContain('90vw');
    expect(adapter.getWideModeCSS(true, 39)).toContain('90vw');
    expect(adapter.getWideModeCSS(true, 91)).toContain('90vw');
    expect(adapter.getWideModeCSS(true, 100)).toContain('90vw');
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

  it('保留宽屏模式菜单作为恢复默认布局的入口', () => {
    expect(createAdapter().getReaderMenuItems()).toContain('reader_wide');
  });
});
