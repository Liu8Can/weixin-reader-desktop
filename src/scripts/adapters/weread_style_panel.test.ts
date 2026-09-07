import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { PluginAPI } from '../core/plugin_types';
import { setupStylePanel } from './weread_style_panel';

const createAPI = (initial: Record<string, unknown> = {}) => {
  const styles = new Map<string, string>();
  const set = mock(async (_key: string, _value: unknown) => undefined);
  let listener: ((settings: Record<string, any>) => void) | null = null;
  const api = {
    style: {
      inject: mock((id: string, css: string) => { styles.set(id, css); }),
      remove: mock((id: string) => { styles.delete(id); }),
    },
    settings: {
      get: <T>(_key: string, defaultValue?: T): T => defaultValue as T,
      set,
      getAll: () => initial,
      subscribe: (callback: (settings: Record<string, any>) => void) => {
        listener = callback;
        return () => { listener = null; };
      },
    },
    log: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
  } as unknown as PluginAPI;

  return {
    api,
    set,
    styles,
    updateSettings: (settings: Record<string, any>) => listener?.(settings),
  };
};

describe('WeRead reading width control', () => {
  let teardown: (() => void) | null = null;

  beforeEach(() => {
    history.replaceState({}, '', '/web/reader/test-book');
    document.body.innerHTML = '<div class="readerControls"></div>';
  });

  afterEach(() => {
    teardown?.();
    teardown = null;
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('mounts a constrained width slider without changing the default layout', () => {
    const context = createAPI();
    teardown = setupStylePanel(context.api);

    const slider = document.querySelector<HTMLInputElement>('input[data-key="readingWidth"]');
    expect(slider?.min).toBe('720');
    expect(slider?.max).toBe('1600');
    expect(slider?.step).toBe('40');
    expect(slider?.value).toBe('1200');
    expect(document.querySelector('[data-output="readingWidth"]')?.textContent).toBe('默认');
    expect(context.styles.has('wxrd-reading-width')).toBe(false);
  });

  it('preserves normal-reader gutters and applies a responsive content limit', () => {
    const context = createAPI();
    teardown = setupStylePanel(context.api);
    const slider = document.querySelector<HTMLInputElement>('input[data-key="readingWidth"]')!;

    slider.value = '1040';
    slider.dispatchEvent(new Event('input'));
    expect(document.querySelector('[data-output="readingWidth"]')?.textContent).toBe('1040px');
    slider.dispatchEvent(new Event('change'));
    expect(context.set).toHaveBeenCalledWith('readingWidth', 1040);

    context.updateSettings({ readingWidth: 1040 });
    const css = context.styles.get('wxrd-reading-width');
    expect(css).toContain('.readerContent > .app_content:not(.app_content_in_reader)');
    expect(css).toContain('min(1240px, calc(100vw - 224px))');
    expect(css).toContain('.wr_horizontalReader_app_content .readerChapterContent');
    expect(css).toContain('min(1040px, calc(100vw - 224px))');
    expect(css).toContain('min(668px, calc(50vw - 72px))');
    expect(css).not.toContain('html body .app_content,');
    expect(document.querySelector('[data-output="readingWidth"]')?.textContent).toBe('1040px');
  });

  it('restores the original layout when all reading styles are reset', async () => {
    const context = createAPI({ readingWidth: 960 });
    teardown = setupStylePanel(context.api);

    document.querySelector<HTMLButtonElement>('[data-action="reset-spacing"]')?.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(context.set).toHaveBeenCalledWith('readingWidth', null);
  });
});
