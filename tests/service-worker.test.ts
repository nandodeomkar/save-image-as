import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContextMenus } from '../src/background/context-menu-manager';
import { DEFAULT_SETTINGS } from '../src/utils/types';
import { getSettings, saveSettings } from '../src/utils/storage';
import { resetMocks } from './setup';

vi.mock('../src/background/context-menu-manager', () => ({
  createContextMenus: vi.fn().mockResolvedValue(undefined),
  handleContextMenuClick: vi.fn()
}));
vi.mock('../src/background/download-manager', () => ({
  handleFetchImage: vi.fn(),
  handleConvertImage: vi.fn(),
  handleDownloadImage: vi.fn(),
  handleQuickSaveImage: vi.fn()
}));

describe('Service worker lifecycle', () => {
  let installed: (details: chrome.runtime.InstalledDetails) => Promise<void>;
  let startup: () => Promise<void>;

  beforeAll(async () => {
    await import('../src/background/service-worker');
    installed = vi.mocked(chrome.runtime.onInstalled.addListener).mock.calls[0][0] as typeof installed;
    startup = vi.mocked(chrome.runtime.onStartup.addListener).mock.calls[0][0] as typeof startup;
    await vi.waitFor(() => expect(createContextMenus).toHaveBeenCalled());
  });

  beforeEach(() => resetMocks());

  it('persists defaults on first installation', async () => {
    await installed({ reason: 'install' } as chrome.runtime.InstalledDetails);

    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      save_image_as_settings: DEFAULT_SETTINGS
    }, expect.any(Function));
    expect(createContextMenus).toHaveBeenLastCalledWith(DEFAULT_SETTINGS);
  });

  it('preserves existing preferences on extension update and startup', async () => {
    await saveSettings({ defaultFormat: 'webp', jpegQuality: 0.7 });
    await installed({ reason: 'update' } as chrome.runtime.InstalledDetails);
    await startup();

    const settings = await getSettings();
    expect(settings.defaultFormat).toBe('webp');
    expect(settings.jpegQuality).toBe(0.7);
    expect(createContextMenus).toHaveBeenLastCalledWith(settings);
  });

  it('refreshes menus when the persisted settings object changes', async () => {
    const settings = await saveSettings({ enabledFormats: ['png', 'webp'] });

    await vi.waitFor(() => expect(createContextMenus).toHaveBeenCalledWith(settings));
  });
});
