import { describe, it, expect, beforeEach } from 'vitest';
import { sendMessage, pingOffscreen, generateMessageId } from '../src/utils/messaging';
import { OffscreenPongMessage } from '../src/utils/types';
import { resetMocks } from './setup';

describe('Messaging Utility', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('generates unique correlation IDs', () => {
    const id1 = generateMessageId();
    const id2 = generateMessageId();
    expect(id1).not.toBe(id2);
    expect(id1.startsWith('msg_')).toBe(true);
  });

  it('sends message and returns successful response', async () => {
    const mockResponse: OffscreenPongMessage = {
      type: 'OFFSCREEN_PONG',
      id: 'test_123',
      timestamp: Date.now()
    };

    (chrome.runtime.sendMessage as any).mockImplementation((_msg: any, callback: (res: any) => void) => {
      callback(mockResponse);
    });

    const result = await sendMessage<typeof mockResponse>({
      type: 'OFFSCREEN_PING',
      id: 'test_123'
    });

    expect(result).toEqual(mockResponse);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('handles runtime error from chrome.runtime.lastError', async () => {
    (chrome.runtime.sendMessage as any).mockImplementation((_msg: any, callback: (res: any) => void) => {
      chrome.runtime.lastError = { message: 'Receiving end does not exist' };
      callback(null);
    });

    await expect(
      sendMessage({ type: 'OFFSCREEN_PING', id: 'fail_1' })
    ).rejects.toThrow('Receiving end does not exist');
  });

  it('handles message timeout correctly', async () => {
    (chrome.runtime.sendMessage as any).mockImplementation(() => {
      // Intentionally never invokes callback
    });

    await expect(
      sendMessage({ type: 'OFFSCREEN_PING', id: 'timeout_1' }, 50)
    ).rejects.toThrow(/Message timeout after 50ms/);
  });

  it('pingOffscreen returns true on successful pong', async () => {
    (chrome.runtime.sendMessage as any).mockImplementation((msg: any, callback: (res: any) => void) => {
      callback({
        type: 'OFFSCREEN_PONG',
        id: msg.id,
        timestamp: Date.now()
      });
    });

    const isAlive = await pingOffscreen(100);
    expect(isAlive).toBe(true);
  });

  it('pingOffscreen returns false on failure or timeout', async () => {
    (chrome.runtime.sendMessage as any).mockImplementation((_msg: any, callback: (res: any) => void) => {
      chrome.runtime.lastError = { message: 'No document' };
      callback(null);
    });

    const isAlive = await pingOffscreen(100);
    expect(isAlive).toBe(false);
  });
});
