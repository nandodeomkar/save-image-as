/**
 * Download Manager & Conversion Coordinator
 * Handles image fetching, offscreen conversion delegation,
 * and browser download dispatching.
 */

import { getSettings } from '../utils/storage';
import { ensureOffscreenDocument } from './offscreen-manager';
import { sendMessage } from '../utils/messaging';
import { formatFilename } from '../utils/filename-helper';
import {
  ConvertImageRequestMessage,
  ConvertImageResponseMessage,
  DownloadImageRequestMessage,
  DownloadImageResponseMessage,
  FetchImageRequestMessage,
  FetchImageResponseMessage,
  QuickSaveImageRequestMessage,
  QuickSaveImageResponseMessage
} from '../utils/types';

/**
 * Fetch image blob bypassing webpage CORS headers using extension background host privileges
 */
export async function handleFetchImage(
  request: FetchImageRequestMessage
): Promise<FetchImageResponseMessage> {
  try {
    const response = await fetch(request.url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`HTTP error fetching image: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Convert to base64 Data URL
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const dataUrl = `data:${contentType};base64,${base64}`;

    return {
      type: 'FETCH_IMAGE_RESPONSE',
      id: request.id,
      success: true,
      dataUrl,
      contentType,
      byteLength: len
    };
  } catch (err) {
    console.error('[DownloadManager] Failed to fetch image:', err);
    return {
      type: 'FETCH_IMAGE_RESPONSE',
      id: request.id,
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Ensure offscreen document is active and delegate conversion task
 */
export async function handleConvertImage(
  request: ConvertImageRequestMessage
): Promise<ConvertImageResponseMessage> {
  // Ensure offscreen document exists
  await ensureOffscreenDocument();

  // Forward conversion request to offscreen document
  return await sendMessage<ConvertImageResponseMessage, ConvertImageRequestMessage>(request);
}

/**
 * Trigger file download via chrome.downloads API
 */
export async function handleDownloadImage(
  request: DownloadImageRequestMessage
): Promise<DownloadImageResponseMessage> {
  if (typeof chrome === 'undefined' || !chrome.downloads || !chrome.downloads.download) {
    throw new Error('chrome.downloads API is unavailable');
  }

  return new Promise((resolve) => {
    chrome.downloads.download(
      {
        url: request.url,
        filename: request.filename,
        saveAs: request.saveAs ?? false
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('[DownloadManager] Download error:', chrome.runtime.lastError.message);
          resolve({
            type: 'DOWNLOAD_IMAGE_RESPONSE',
            id: request.id,
            success: false,
            error: chrome.runtime.lastError.message
          });
          return;
        }

        resolve({
          type: 'DOWNLOAD_IMAGE_RESPONSE',
          id: request.id,
          success: true,
          downloadId
        });
      }
    );
  });
}

/**
 * Quick Save 1-Click download coordinator
 */
export async function handleQuickSaveImage(
  request: QuickSaveImageRequestMessage
): Promise<QuickSaveImageResponseMessage> {
  try {
    const settings = await getSettings();
    const targetFormat = request.format || settings.defaultFormat || 'png';
    const element = request.elementResult;

    if (!element || !element.url) {
      throw new Error('No valid image element data provided for quick save');
    }

    // Determine quality for lossy formats
    let quality = 0.92;
    if (targetFormat === 'jpeg') quality = settings.jpegQuality;
    else if (targetFormat === 'webp') quality = settings.webpQuality;
    else if (targetFormat === 'avif') quality = settings.avifQuality;

    // Generate output filename from template
    const filename = formatFilename(settings.filenameTemplate, element, targetFormat);

    let downloadUrl = element.url;

    // SVG also goes through the converter so saved markup is sanitized.
    {
      // Determine source payload
      let sourcePayload: ConvertImageRequestMessage['source'];
      if (element.svgContent) {
        sourcePayload = { type: 'svg-string', data: element.svgContent };
      } else if (element.canvasDataUrl) {
        sourcePayload = { type: 'data-url', data: element.canvasDataUrl };
      } else {
        sourcePayload = { type: 'url', data: element.url };
      }

      // Convert via offscreen document
      const conversionRes = await handleConvertImage({
        type: 'CONVERT_IMAGE_REQUEST',
        id: `conv-${Date.now()}`,
        source: sourcePayload,
        targetFormat,
        quality,
        backgroundColor: ['jpeg', 'bmp', 'pdf'].includes(targetFormat) ? settings.backgroundColor : undefined,
        originalFilename: filename,
        pageMetadata: {
          pageTitle: element.pageTitle,
          pageDomain: element.pageDomain
        }
      });

      if (!conversionRes.success || !conversionRes.dataUrl) {
        throw new Error(conversionRes.error || 'Failed to convert image');
      }

      downloadUrl = conversionRes.dataUrl;
    }

    // Trigger download
    const downloadRes = await handleDownloadImage({
      type: 'DOWNLOAD_IMAGE_REQUEST',
      id: `dl-${Date.now()}`,
      url: downloadUrl,
      filename,
      saveAs: false
    });

    if (!downloadRes.success) {
      throw new Error(downloadRes.error || 'Download failed');
    }

    return {
      type: 'QUICK_SAVE_IMAGE_RESPONSE',
      id: request.id,
      success: true,
      downloadId: downloadRes.downloadId,
      filename
    };
  } catch (err) {
    console.error('[DownloadManager] handleQuickSaveImage error:', err);
    return {
      type: 'QUICK_SAVE_IMAGE_RESPONSE',
      id: request.id,
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
