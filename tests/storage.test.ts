import { describe, it, expect, beforeEach } from 'vitest';
import { getSettings, saveSettings, resetSettings, onSettingsChanged } from '../src/utils/storage';
import { DEFAULT_SETTINGS } from '../src/utils/types';
import { resetMocks } from './setup';

describe('Storage Utility', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns default settings when storage is empty', async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.defaultFormat).toBe('png');
    expect(settings.enabledFormats.length).toBe(9);
  });

  it('persists and retrieves updated partial settings', async () => {
    const updated = await saveSettings({
      defaultFormat: 'webp',
      jpegQuality: 0.8
    });

    expect(updated.defaultFormat).toBe('webp');
    expect(updated.jpegQuality).toBe(0.8);

    const retrieved = await getSettings();
    expect(retrieved.defaultFormat).toBe('webp');
    expect(retrieved.jpegQuality).toBe(0.8);
    // Preserves other default keys
    expect(retrieved.enabledFormats).toEqual(DEFAULT_SETTINGS.enabledFormats);
    expect(retrieved.backgroundColor).toBe(DEFAULT_SETTINGS.backgroundColor);
  });

  it('resets settings to default values', async () => {
    await saveSettings({ defaultFormat: 'pdf', shortcutModifier: 'shift' });
    let current = await getSettings();
    expect(current.defaultFormat).toBe('pdf');

    await resetSettings();
    current = await getSettings();
    expect(current.defaultFormat).toBe('png');
    expect(current.shortcutModifier).toBe('alt');
  });

  it('notifies subscribers on settings change', async () => {
    let notifiedSettings: any = null;
    const unsubscribe = onSettingsChanged((settings) => {
      notifiedSettings = settings;
    });

    await saveSettings({ defaultFormat: 'avif' });
    expect(notifiedSettings).not.toBeNull();
    expect(notifiedSettings.defaultFormat).toBe('avif');

    unsubscribe();
  });
});
