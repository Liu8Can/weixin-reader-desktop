import { describe, expect, it } from 'bun:test';
import { WeReadAdapter } from './weread_adapter';

const createAdapter = (): WeReadAdapter => Object.create(WeReadAdapter.prototype) as WeReadAdapter;

describe('WeReadAdapter 宽屏宽度', () => {
  it('同步调整正文画布、顶部栏和工具栏位置', () => {
    const css = createAdapter().getWideModeCSS(true, 60);

    expect(css).toContain('.readerContent > .app_content:not(.app_content_in_reader)');
    expect(css).toContain('width: min(calc(60vw + 200px), calc(100vw - 224px)) !important');
    expect(css).toContain('.wr_horizontalReader_app_content .readerChapterContent');
    expect(css).toContain('width: min(60vw, calc(100vw - 224px)) !important');
    expect(css).toContain('margin-left: min(calc(30vw + 148px), calc(50vw - 72px)) !important');
    expect(css).not.toContain('html body .app_content,');
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

  it('阅读宽度由样式滑块控制，不再显示宽屏模式菜单', () => {
    expect(createAdapter().getReaderMenuItems()).not.toContain('reader_wide');
  });
});
