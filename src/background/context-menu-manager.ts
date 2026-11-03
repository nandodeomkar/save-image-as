/**
 * Context Menu Manager
 * Dynamically builds context menus for active image formats,
 * listens for right-click selections, coordinates element inspection,
 * runs image conversion, and initiates downloads.
 */

import {
  ExtensionSettings,
  FORMAT_REGISTRY,
  ImageFormat,
  InspectElementRequestMessage,
  InspectElementResponseMessage,
  InspectElementResult,
  DEFAULT_SETTINGS
} from '../utils/types';
import { getSettings } from '../utils/storage';
import { formatFilename } from '../utils/filename-helper';
import { handleConvertImage, handleDownloadImage } from './download-manager';

export const CONTEXT_MENU_ROOT_ID = 'save-image-as-root';
export const CONTEXT_MENU_SETTINGS_ID = 'save-image-as-settings';
export const CONTEXT_MENU_SEPARATOR_ID = 'save-image-as-separator';
export const CONTEXT_MENU_FORMAT_PREFIX = 'save-image-as-format-';

/**
 * Dynamically construct context menus based on user settings
 */
export async function createContextMenus(settings?: ExtensionSettings): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.contextMenus) {
    return;
  }

  const currentSettings = settings || (await getSettings());

  // Remove existing context menu items before rebuilding
  await new Promise<void>((resolve) => {
    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {
        // Ignored, safe fallback
      }
      resolve();
    });
  });

  const contexts: chrome.contextMenus.ContextType[] = ['image', 'video', 'link', 'page'];

  // Create Root Menu Item
  chrome.contextMenus.create(
    {
      id: CONTEXT_MENU_ROOT_ID,
      title: 'Save Image As...',
      contexts
    },
    () => {
      if (chrome.runtime.lastError) {
        console.debug('[ContextMenu] Root menu creation notice:', chrome.runtime.lastError.message);
      }
    }
  );

  // Create sub-menu for each active enabled format
  const enabledFormats = currentSettings.enabledFormats || DEFAULT_SETTINGS.enabledFormats;
  for (const format of enabledFormats) {
    const info = FORMAT_REGISTRY[format];
    if (!info) continue;

    chrome.contextMenus.create(
      {
        id: `${CONTEXT_MENU_FORMAT_PREFIX}${format}`,
        parentId: CONTEXT_MENU_ROOT_ID,
        title: `${info.name.split(' (')[0]} (*.${info.extension})`,
        contexts
      },
      () => {
        if (chrome.runtime.lastError) {
          console.debug(`[ContextMenu] ${format} menu creation notice:`, chrome.runtime.lastError.message);
        }
      }
    );
  }

  // Create Separator
  chrome.contextMenus.create(
    {
      id: CONTEXT_MENU_SEPARATOR_ID,
      parentId: CONTEXT_MENU_ROOT_ID,
      type: 'separator',
      contexts
    },
    () => {
      if (chrome.runtime.lastError) {
        // Ignored
      }
    }
  );

  // Create Settings shortcut item
  chrome.contextMenus.create(
    {
      id: CONTEXT_MENU_SETTINGS_ID,
      parentId: CONTEXT_MENU_ROOT_ID,
      title: '⚙️ Settings...',
      contexts
    },
    () => {
      if (chrome.runtime.lastError) {
        // Ignored
      }
    }
  );
}

/**
 * Handle clicks on context menu items
 */
export async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): Promise<void> {
  const menuItemId = String(info.menuItemId);

  // If user clicked settings shortcut
  if (menuItemId === CONTEXT_MENU_SETTINGS_ID) {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
    return;
  }

  // If user clicked a format option
  if (menuItemId.startsWith(CONTEXT_MENU_FORMAT_PREFIX)) {
    const targetFormat = menuItemId.replace(CONTEXT_MENU_FORMAT_PREFIX, '') as ImageFormat;
    await processContextMenuSave(targetFormat, info, tab);
  }
}

/**
 * Coordinate inspection, conversion, and download for context menu actions
 */
export async function processContextMenuSave(
  targetFormat: ImageFormat,
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): Promise<void> {
  try {
    let elementResult: InspectElementResult | null = null;

    // 1. Try querying the content script on the active tab for DOM inspection
    if (tab && tab.id && tab.id !== chrome.tabs.TAB_ID_NONE) {
      try {
        const inspectReq: InspectElementRequestMessage = {
          type: 'INSPECT_ELEMENT_REQUEST',
          id: `inspect-menu-${Date.now()}`
        };

        const response: InspectElementResponseMessage = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id!, inspectReq, (res) => {
            if (chrome.runtime.lastError || !res) {
              resolve({
                type: 'INSPECT_ELEMENT_RESPONSE',
                id: inspectReq.id,
                success: false
              });
            } else {
              resolve(res);
            }
          });
        });

        if (response && response.success && response.result) {
          elementResult = response.result;
        }
      } catch (err) {
        console.debug('[ContextMenu] Content script inspection failed, falling back to menu info:', err);
      }
    }

    // 2. Fallback if content script did not return element
    if (!elementResult || !elementResult.url) {
      const fallbackUrl = info.srcUrl || info.linkUrl || '';
      if (!fallbackUrl) {
        throw new Error('No image URL detected from right-click context.');
      }

      let fallbackDomain = 'web';
      if (tab?.url) {
        try {
          fallbackDomain = new URL(tab.url).hostname;
        } catch {
          // ignore
        }
      }

      elementResult = {
        url: fallbackUrl,
        elementType: info.srcUrl ? 'img' : 'link-image',
        pageTitle: tab?.title || 'Web Image',
        pageUrl: tab?.url || '',
        pageDomain: fallbackDomain
      };
    }

    const settings = await getSettings();

    // Determine quality for lossy formats
    let quality = 0.92;
    if (targetFormat === 'jpeg') quality = settings.jpegQuality;
    else if (targetFormat === 'webp') quality = settings.webpQuality;
    else if (targetFormat === 'avif') quality = settings.avifQuality;

    // Format output filename
    const filename = formatFilename(settings.filenameTemplate, elementResult, targetFormat);

    let downloadUrl = elementResult.url;

    // SVG also goes through the converter so saved markup is sanitized.
    {
      let sourcePayload: {
        type: 'url' | 'data-url' | 'blob-buffer' | 'svg-string';
        data: string;
      };

      if (elementResult.svgContent) {
        sourcePayload = { type: 'svg-string', data: elementResult.svgContent };
      } else if (elementResult.canvasDataUrl) {
        sourcePayload = { type: 'data-url', data: elementResult.canvasDataUrl };
      } else {
        sourcePayload = { type: 'url', data: elementResult.url };
      }

      const conversionRes = await handleConvertImage({
        type: 'CONVERT_IMAGE_REQUEST',
        id: `conv-menu-${Date.now()}`,
        source: sourcePayload,
        targetFormat,
        quality,
        backgroundColor: ['jpeg', 'bmp', 'pdf'].includes(targetFormat) ? settings.backgroundColor : undefined,
        originalFilename: filename,
        pageMetadata: {
          pageTitle: elementResult.pageTitle,
          pageDomain: elementResult.pageDomain
        }
      });

      if (!conversionRes.success || !conversionRes.dataUrl) {
        throw new Error(conversionRes.error || `Failed to convert image to ${targetFormat.toUpperCase()}`);
      }

      downloadUrl = conversionRes.dataUrl;
    }

    // Trigger download
    const downloadRes = await handleDownloadImage({
      type: 'DOWNLOAD_IMAGE_REQUEST',
      id: `dl-menu-${Date.now()}`,
      url: downloadUrl,
      filename,
      saveAs: false
    });

    if (!downloadRes.success) {
      throw new Error(downloadRes.error || 'Failed to dispatch download');
    }

    console.info(`[ContextMenu] Successfully downloaded ${filename} (ID: ${downloadRes.downloadId})`);
  } catch (err) {
    console.error('[ContextMenu] Error saving image from context menu:', err);
  }
}
