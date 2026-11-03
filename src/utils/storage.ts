import { DEFAULT_SETTINGS, ExtensionSettings } from './types';

const STORAGE_KEY = 'save_image_as_settings';

/**
 * Safely get storage area (prefer sync, fallback to local)
 */
function getStorageArea(): chrome.storage.StorageArea | null {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return chrome.storage.sync || chrome.storage.local || null;
  }
  return null;
}

/** Seed a new installation only after storage confirms that preferences are absent. */
export async function initializeSettings(): Promise<void> {
  const storage = getStorageArea();
  if (!storage) return;

  await new Promise<void>((resolve, reject) => {
    storage.get([STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || 'Failed to read settings'));
        return;
      }
      // Synced preferences may already exist after reinstalling the extension.
      if (result?.[STORAGE_KEY] !== undefined) {
        resolve();
        return;
      }
      storage.set({ [STORAGE_KEY]: { ...DEFAULT_SETTINGS } }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Failed to initialize settings'));
        } else {
          resolve();
        }
      });
    });
  });
}

/**
 * Retrieve user settings merged with defaults
 */
export async function getSettings(): Promise<ExtensionSettings> {
  const storage = getStorageArea();
  if (!storage) {
    return { ...DEFAULT_SETTINGS };
  }

  return new Promise((resolve) => {
    storage.get([STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to read settings from storage:', chrome.runtime.lastError.message);
        resolve({ ...DEFAULT_SETTINGS });
        return;
      }

      const stored = result?.[STORAGE_KEY] as Partial<ExtensionSettings> | undefined;
      if (!stored) {
        resolve({ ...DEFAULT_SETTINGS });
        return;
      }

      // Merge stored settings with defaults to guarantee all keys exist
      resolve({
        ...DEFAULT_SETTINGS,
        ...stored,
        enabledFormats: Array.isArray(stored.enabledFormats) && stored.enabledFormats.length > 0
          ? stored.enabledFormats
          : DEFAULT_SETTINGS.enabledFormats
      });
    });
  });
}

/**
 * Update and persist user settings
 */
export async function saveSettings(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated: ExtensionSettings = {
    ...current,
    ...partial
  };

  const storage = getStorageArea();
  if (!storage) {
    return updated;
  }

  return new Promise((resolve, reject) => {
    storage.set({ [STORAGE_KEY]: updated }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to save settings:', chrome.runtime.lastError.message);
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(updated);
    });
  });
}

/**
 * Reset settings to default configuration
 */
export async function resetSettings(): Promise<ExtensionSettings> {
  return saveSettings(DEFAULT_SETTINGS);
}

/**
 * Listen for settings changes across extension contexts
 */
export function onSettingsChanged(callback: (settings: ExtensionSettings) => void): () => void {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.onChanged) {
    return () => {};
  }

  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if ((areaName === 'sync' || areaName === 'local') && changes[STORAGE_KEY]) {
      const newValue = changes[STORAGE_KEY].newValue as Partial<ExtensionSettings> | undefined;
      if (newValue) {
        callback({
          ...DEFAULT_SETTINGS,
          ...newValue
        });
      }
    }
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
