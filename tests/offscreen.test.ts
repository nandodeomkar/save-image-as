import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { convertImage } from '../src/offscreen/converter';
import { resetMocks } from './setup';
import type { ConvertImageRequestMessage, ExtensionMessage } from '../src/utils/types';

vi.mock('../src/offscreen/converter', () => ({ convertImage: vi.fn() }));

describe('Offscreen message listener', () => {
  let receive: (message: ExtensionMessage, sender: chrome.runtime.MessageSender, respond: (value: unknown) => void) => boolean | void;

  beforeAll(async () => {
    await import('../src/offscreen/offscreen');
    receive = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0];
  });

  beforeEach(() => resetMocks());

  it('ignores content-script and popup conversion requests before executing code', () => {
    const request: ConvertImageRequestMessage = { type: 'CONVERT_IMAGE_REQUEST', id: 'blocked', source: { type: 'data-url', data: 'data:image/png;base64,AA==' }, targetFormat: 'png' };
    for (const sender of [{ id: chrome.runtime.id, tab: { id: 1 } as chrome.tabs.Tab, url: 'https://example.com' }, { id: chrome.runtime.id, url: chrome.runtime.getURL('src/popup/popup.html') }]) {
      const respond = vi.fn();
      receive(request, sender, respond);
      expect(respond).not.toHaveBeenCalled();
    }
    expect(convertImage).not.toHaveBeenCalled();
  });

  it('returns a correlated pong with a current timestamp', () => {
    const respond = vi.fn();
    const before = Date.now();
    expect(receive({ type: 'OFFSCREEN_PING', id: 'heartbeat' }, { id: chrome.runtime.id }, respond)).toBe(false);
    expect(respond).toHaveBeenCalledWith({
      type: 'OFFSCREEN_PONG', id: 'heartbeat', timestamp: expect.any(Number)
    });
    expect(respond.mock.calls[0][0].timestamp).toBeGreaterThanOrEqual(before);
    expect(respond.mock.calls[0][0].timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('keeps the channel open and serializes conversion errors', async () => {
    vi.mocked(convertImage).mockRejectedValueOnce(new Error('Unable to decode source'));
    const request: ConvertImageRequestMessage = {
      type: 'CONVERT_IMAGE_REQUEST', id: 'conversion-error',
      source: { type: 'data-url', data: 'data:image/png;base64,aW52YWxpZA==' }, targetFormat: 'png'
    };
    const respond = vi.fn();

    expect(receive(request, { id: chrome.runtime.id }, respond)).toBe(true);
    await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({
      type: 'CONVERT_IMAGE_RESPONSE', id: request.id,
      success: false, error: 'Unable to decode source'
    }));
  });
});
