import { describe, expect, it } from 'vitest';
import { allowBackgroundMessage, isWorkerSender, validConversion } from '../src/utils/message-policy';

const popup = { id: chrome.runtime.id, url: chrome.runtime.getURL('src/popup/popup.html') };
const offscreen = { id: chrome.runtime.id, url: chrome.runtime.getURL('src/offscreen/offscreen.html') };
const content = { id: chrome.runtime.id, url: 'https://example.com/page', tab: { id: 1 } as chrome.tabs.Tab };
const conversion = { type: 'CONVERT_IMAGE_REQUEST', id: 'test', source: { type: 'url', data: 'https://example.com/image.png' }, targetFormat: 'png' };
const quickSave = { type: 'QUICK_SAVE_IMAGE_REQUEST', id: 'test', elementResult: { url: 'https://example.com/image.png', elementType: 'img', pageTitle: 'Example', pageDomain: 'example.com', pageUrl: 'https://example.com' } };

describe('Privileged message policy', () => {
  it('grants each context only its intended operations', () => {
    expect(allowBackgroundMessage(conversion, popup)).toBe(true);
    expect(allowBackgroundMessage(conversion, content)).toBe(false);
    expect(allowBackgroundMessage(conversion, offscreen)).toBe(false);
    expect(allowBackgroundMessage(quickSave, content)).toBe(true);
    expect(allowBackgroundMessage(quickSave, popup)).toBe(false);
    const fetch = { type: 'FETCH_IMAGE_REQUEST', id: 'test', url: 'https://example.com/image.png' };
    expect(allowBackgroundMessage(fetch, offscreen)).toBe(true);
    expect(allowBackgroundMessage(fetch, content)).toBe(false);
    expect(allowBackgroundMessage(fetch, popup)).toBe(false);
  });

  it('rejects spoofed origin prefixes, foreign IDs, and missing identities', () => {
    for (const sender of [{}, { ...popup, id: 'other' }, { ...popup, url: popup.url + '/evil' }]) {
      expect(allowBackgroundMessage(conversion, sender)).toBe(false);
    }
    expect(isWorkerSender({ id: chrome.runtime.id })).toBe(true);
    expect(isWorkerSender(popup)).toBe(false);
    expect(isWorkerSender(content)).toBe(false);
    expect(isWorkerSender(offscreen)).toBe(false);
    expect(isWorkerSender({})).toBe(false);
  });

  it.each(['file:///etc/passwd', 'javascript:alert(1)', 'chrome://settings', 'https://user:pass@example.com/a', 'blob:https://example.com/a'])('rejects privileged URL %s', (url) => {
    expect(allowBackgroundMessage({ type: 'FETCH_IMAGE_REQUEST', id: 'x', url }, offscreen)).toBe(false);
    expect(allowBackgroundMessage({ ...quickSave, elementResult: { ...quickSave.elementResult, url } }, content)).toBe(false);
    expect(validConversion({ ...conversion, source: { type: 'url', data: url } })).toBe(false);
  });

  it('validates nested input shapes, format and quality', () => {
    for (const message of [null, {}, { ...conversion, id: '' }, { ...conversion, source: null }, { ...conversion, targetFormat: '__proto__' }, { ...conversion, quality: NaN }, { ...conversion, quality: 2 }, { ...conversion, backgroundColor: 'url(evil)' }]) {
      expect(allowBackgroundMessage(message, popup)).toBe(false);
    }
    expect(allowBackgroundMessage({ ...quickSave, elementResult: { ...quickSave.elementResult, canvasDataUrl: 'data:text/html,evil' } }, content)).toBe(false);
  });

  it('limits direct downloads to generated data and safe filenames', () => {
    const download = { type: 'DOWNLOAD_IMAGE_REQUEST', id: 'x', url: 'data:image/png;base64,AA==', filename: 'image.png' };
    expect(allowBackgroundMessage(download, popup)).toBe(true);
    expect(allowBackgroundMessage(download, content)).toBe(false);
    for (const filename of ['../evil.png', 'folder/evil.png', 'C:\\evil.png', '.hidden']) {
      expect(allowBackgroundMessage({ ...download, filename }, popup)).toBe(false);
    }
    expect(allowBackgroundMessage({ ...download, url: 'https://example.com/arbitrary.exe' }, popup)).toBe(false);
  });
});
