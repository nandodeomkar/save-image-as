import { describe, it, expect, beforeEach } from 'vitest';
import {
  ensureOffscreenDocument,
  hasOffscreenDocument,
  closeOffscreenDocument
} from '../src/background/offscreen-manager';
import { resetMocks } from './setup';

describe('Offscreen Document Manager', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('detects when offscreen document exists', async () => {
    (chrome.offscreen.hasDocument as any).mockResolvedValue(true);
    const exists = await hasOffscreenDocument();
    expect(exists).toBe(true);
  });

  it('creates offscreen document when none exists', async () => {
    (chrome.offscreen.hasDocument as any).mockResolvedValue(false);

    await ensureOffscreenDocument();

    expect(chrome.offscreen.createDocument).toHaveBeenCalledTimes(1);
    expect(chrome.offscreen.createDocument).toHaveBeenCalledWith({
      url: 'src/offscreen/offscreen.html',
      reasons: ['BLOBS', 'DOM_SCRAPING'],
      justification: expect.any(String)
    });
  });

  it('does not create duplicate document if already exists', async () => {
    (chrome.offscreen.hasDocument as any).mockResolvedValue(true);

    await ensureOffscreenDocument();

    expect(chrome.offscreen.createDocument).not.toHaveBeenCalled();
  });

  it('handles concurrent calls with mutex to prevent race conditions', async () => {
    let callCount = 0;
    (chrome.offscreen.hasDocument as any).mockImplementation(async () => {
      return callCount > 0;
    });

    (chrome.offscreen.createDocument as any).mockImplementation(async () => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    // Call simultaneously
    await Promise.all([
      ensureOffscreenDocument(),
      ensureOffscreenDocument(),
      ensureOffscreenDocument()
    ]);

    expect(chrome.offscreen.createDocument).toHaveBeenCalledTimes(1);
  });

  it('closes offscreen document when open', async () => {
    (chrome.offscreen.hasDocument as any).mockResolvedValue(true);

    await closeOffscreenDocument();

    expect(chrome.offscreen.closeDocument).toHaveBeenCalledTimes(1);
  });
});
