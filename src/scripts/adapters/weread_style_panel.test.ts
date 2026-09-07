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

describe('WeRead pure white text background', () => {
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

  it('uses one background color across the reader surfaces', () => {
    const context = createAPI({ whiteText: true });
    teardown = setupStylePanel(context.api);

    const css = context.styles.get('wxrd-white-text');
    expect(css).toContain('.readerContent > .app_content:not(.app_content_in_reader)');
    expect(css).toContain('.wr_horizontalReader_app_content');
    expect(css).toContain('.readerChapterContent');
    expect(css).toContain('.wr_canvasContainer');
    expect(css).toContain('background-color: #18191b !important');
    expect(css).not.toContain('border-radius: 16px');
  });

  it('applies the recommended brightness with a background preset', async () => {
    const context = createAPI({ whiteText: true });
    teardown = setupStylePanel(context.api);

    document.querySelector<HTMLButtonElement>('button[data-background="#202124"]')?.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(context.set).toHaveBeenCalledWith('whiteTextBackground', '#202124');
    expect(context.set).toHaveBeenCalledWith('whiteTextBrightness', 1.1);
  });

  it('persists a custom color and rejects unsafe stored values', () => {
    const context = createAPI({ whiteText: true, whiteTextBackground: 'red; color: transparent' });
    teardown = setupStylePanel(context.api);

    expect(context.styles.get('wxrd-white-text')).toContain('background-color: #18191b !important');

    const input = document.querySelector<HTMLInputElement>('input[type="color"][data-key="whiteTextBackground"]')!;
    input.value = '#25303a';
    input.dispatchEvent(new Event('change'));
    expect(context.set).toHaveBeenCalledWith('whiteTextBackground', '#25303a');

    context.updateSettings({ whiteText: true, whiteTextBackground: '#25303a' });
    expect(context.styles.get('wxrd-white-text')).toContain('background-color: #25303a !important');
    expect(document.querySelector('.wxrd-color-custom')?.classList.contains('wxrd-selected')).toBe(true);
  });
});
