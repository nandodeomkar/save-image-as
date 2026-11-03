import { FORMAT_REGISTRY } from './types';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, max = 4096): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max;
const optionalText = (value: unknown, max = 4096) =>
  value === undefined || (typeof value === 'string' && value.length <= max);
const format = (value: unknown) => typeof value === 'string' && Object.hasOwn(FORMAT_REGISTRY, value);
const MAX_IMAGE_TEXT = 48 * 1024 * 1024;

export function isNetworkImageUrl(value: unknown): value is string {
  if (!text(value, 16384)) return false;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

export function isImageDataUrl(value: unknown): value is string {
  return text(value, MAX_IMAGE_TEXT) && /^data:image\/(?:png|jpeg|webp|avif|bmp|gif|x-icon|vnd.microsoft.icon|svg\+xml)(?:;[^,]*)?,/i.test(value);
}

function ownSender(sender: chrome.runtime.MessageSender): boolean {
  return sender.id === chrome.runtime.id;
}

export function isExtensionPage(sender: chrome.runtime.MessageSender, path: string): boolean {
  return ownSender(sender) && sender.url === chrome.runtime.getURL(path);
}

export function isWorkerSender(sender: chrome.runtime.MessageSender): boolean {
  return ownSender(sender) && !sender.tab &&
    (sender.url === chrome.runtime.getURL('background/service-worker.js') ||
      (sender.url === undefined && sender.documentId === undefined));
}

export function validMessage(message: unknown): message is Record<string, unknown> & { type: string; id: string } {
  return record(message) && text(message.type, 64) && text(message.id, 256);
}

export function validConversion(message: Record<string, unknown>): boolean {
  const source = message.source;
  if (!record(source) || !text(source.data, MAX_IMAGE_TEXT) || !format(message.targetFormat)) return false;
  if (source.type === 'url' ? !isNetworkImageUrl(source.data) && !isImageDataUrl(source.data) :
      source.type === 'data-url' ? !isImageDataUrl(source.data) :
      source.type === 'blob-buffer' ? !/^[A-Za-z0-9+/]*={0,2}$/.test(source.data) :
      source.type !== 'svg-string') return false;
  return (message.quality === undefined || (typeof message.quality === 'number' && Number.isFinite(message.quality) && message.quality >= 0.01 && message.quality <= 1)) &&
    (message.backgroundColor === undefined || (typeof message.backgroundColor === 'string' && /^#[0-9a-f]{6}$/i.test(message.backgroundColor))) &&
    optionalText(message.originalFilename) &&
    (message.pageMetadata === undefined || (record(message.pageMetadata) && optionalText(message.pageMetadata.pageTitle) && optionalText(message.pageMetadata.pageDomain)));
}

export function validQuickSave(message: Record<string, unknown>): boolean {
  const element = message.elementResult;
  if (!record(element) || (!isNetworkImageUrl(element.url) && !isImageDataUrl(element.url))) return false;
  return ['img', 'picture', 'css-background', 'canvas', 'svg-inline', 'svg-image', 'link-image', 'video-poster'].includes(String(element.elementType)) &&
    optionalText(element.pageTitle) && optionalText(element.pageUrl, 16384) && optionalText(element.pageDomain) && optionalText(element.altText) &&
    optionalText(element.svgContent, MAX_IMAGE_TEXT) &&
    (element.canvasDataUrl === undefined || isImageDataUrl(element.canvasDataUrl)) &&
    (message.format === undefined || format(message.format));
}

export function validDownload(message: Record<string, unknown>): boolean {
  // Direct download messages can save only generated image/PDF data, never arbitrary remote resources.
  return (isImageDataUrl(message.url) || (text(message.url, MAX_IMAGE_TEXT) && /^data:application\/pdf;base64,/.test(message.url))) &&
    text(message.filename, 240) && !/[\\/\x00-\x1f<>:"|?*]/.test(message.filename) && !message.filename.startsWith('.') &&
    (message.saveAs === undefined || typeof message.saveAs === 'boolean');
}

export function allowBackgroundMessage(message: unknown, sender: chrome.runtime.MessageSender): boolean {
  if (!validMessage(message) || !ownSender(sender)) return false;
  switch (message.type) {
    case 'FETCH_IMAGE_REQUEST': return isExtensionPage(sender, 'src/offscreen/offscreen.html') && isNetworkImageUrl(message.url);
    case 'CONVERT_IMAGE_REQUEST': return isExtensionPage(sender, 'src/popup/popup.html') && validConversion(message);
    case 'DOWNLOAD_IMAGE_REQUEST': return isExtensionPage(sender, 'src/popup/popup.html') && validDownload(message);
    case 'QUICK_SAVE_IMAGE_REQUEST': return !!sender.tab && isNetworkImageUrl(sender.url) && validQuickSave(message);
    default: return false;
  }
}
