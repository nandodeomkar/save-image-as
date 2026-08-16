import { getSettings, saveSettings } from '../utils/storage';
import {
  ExtensionMessage,
  FetchImageRequestMessage,
  FetchImageResponseMessage,
  ConvertImageRequestMessage,
  ConvertImageResponseMessage,
  DownloadImageRequestMessage,
  DownloadImageResponseMessage,
  QuickSaveImageRequestMessage,
  QuickSaveImageResponseMessage,
  DEFAULT_SETTINGS
} from '../utils/types';
import {
  createContextMenus,
  handleContextMenuClick
} from './context-menu-manager';
import {
  handleFetchImage,
  handleConvertImage,
  handleDownloadImage,
  handleQuickSaveImage
} from './download-manager';

console.info('[ServiceWorker] Save Image As background service worker starting...');

/**
 * Handle Extension Installation / Update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.info(`[ServiceWorker] onInstalled triggered (reason: ${details.reason})`);

  // Initialize default settings if first run
  const settings = await getSettings();
  if (!settings.enabledFormats || settings.enabledFormats.length === 0) {
    await saveSettings(DEFAULT_SETTINGS);
    console.info('[ServiceWorker] Default settings initialized in chrome.storage.');
    await createContextMenus(DEFAULT_SETTINGS);
  } else {
    await createContextMenus(settings);
  }
});

/**
 * Handle Extension Startup
 */
chrome.runtime.onStartup.addListener(async () => {
  console.info('[ServiceWorker] Extension started.');
  const settings = await getSettings();
  await createContextMenus(settings);
});

// Initialize context menus when service worker wakes up
(async () => {
  try {
    const settings = await getSettings();
    await createContextMenus(settings);
  } catch (err) {
    console.warn('[ServiceWorker] Initial context menu setup notice:', err);
  }
})();

/**
 * Handle Context Menu Clicks
 */
if (typeof chrome !== 'undefined' && chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
}

/**
 * Listen for storage updates to dynamically sync context menus in real time
 */
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === 'sync' || areaName === 'local') {
      if (changes.enabledFormats || changes.defaultFormat || changes.filenameTemplate) {
        console.info('[ServiceWorker] Settings changed in storage, updating context menus...');
        const updatedSettings = await getSettings();
        await createContextMenus(updatedSettings);
      }
    }
  });
}

/**
 * Handle IPC Messages from Content Scripts, Popup, or other extension contexts
 */
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): boolean | void => {
    if (!message || !message.type) {
      return;
    }

    // CORS Bypass: Fetch image blob directly via extension background privileges
    if (message.type === 'FETCH_IMAGE_REQUEST') {
      handleFetchImage(message as FetchImageRequestMessage)
        .then((res) => sendResponse(res))
        .catch((err) => {
          sendResponse({
            type: 'FETCH_IMAGE_RESPONSE',
            id: message.id,
            success: false,
            error: err instanceof Error ? err.message : String(err)
          } as FetchImageResponseMessage);
        });
      return true; // asynchronous response
    }

    // Route conversion request to offscreen document
    if (message.type === 'CONVERT_IMAGE_REQUEST') {
      handleConvertImage(message as ConvertImageRequestMessage)
        .then((res) => sendResponse(res))
        .catch((err) => {
          sendResponse({
            type: 'CONVERT_IMAGE_RESPONSE',
            id: message.id,
            success: false,
            error: err instanceof Error ? err.message : String(err)
          } as ConvertImageResponseMessage);
        });
      return true; // asynchronous response
    }

    // 1-Click Shortcut quick-save handler
    if (message.type === 'QUICK_SAVE_IMAGE_REQUEST') {
      handleQuickSaveImage(message as QuickSaveImageRequestMessage)
        .then((res) => sendResponse(res))
        .catch((err) => {
          sendResponse({
            type: 'QUICK_SAVE_IMAGE_RESPONSE',
            id: message.id,
            success: false,
            error: err instanceof Error ? err.message : String(err)
          } as QuickSaveImageResponseMessage);
        });
      return true; // asynchronous response
    }

    // Direct download dispatcher via chrome.downloads API
    if (message.type === 'DOWNLOAD_IMAGE_REQUEST') {
      handleDownloadImage(message as DownloadImageRequestMessage)
        .then((res) => sendResponse(res))
        .catch((err) => {
          sendResponse({
            type: 'DOWNLOAD_IMAGE_RESPONSE',
            id: message.id,
            success: false,
            error: err instanceof Error ? err.message : String(err)
          } as DownloadImageResponseMessage);
        });
      return true; // asynchronous response
    }

    return false;
  }
);
