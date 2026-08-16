import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ShortcutHandler } from '../src/content/shortcut-handler';

describe('ShortcutHandler (Alt+Click Quick Save)', () => {
  let handler: ShortcutHandler;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.title = 'Test Page';
    handler = new ShortcutHandler({ shortcutModifier: 'alt', defaultFormat: 'png' });
    handler.start();
  });

  afterEach(() => {
    handler.stop();
    vi.clearAllMocks();
  });

  describe('Modifier Key Validation', () => {
    it('should correctly detect alt key modifier', () => {
      const altEvent = new MouseEvent('click', { altKey: true });
      const noAltEvent = new MouseEvent('click', { altKey: false });

      expect(handler.isModifierActive(altEvent, 'alt')).toBe(true);
      expect(handler.isModifierActive(noAltEvent, 'alt')).toBe(false);
    });

    it('should correctly detect ctrl/meta key modifier', () => {
      const ctrlEvent = new MouseEvent('click', { ctrlKey: true });
      const metaEvent = new MouseEvent('click', { metaKey: true });
      const plainEvent = new MouseEvent('click', {});

      expect(handler.isModifierActive(ctrlEvent, 'ctrl')).toBe(true);
      expect(handler.isModifierActive(metaEvent, 'ctrl')).toBe(true);
      expect(handler.isModifierActive(plainEvent, 'ctrl')).toBe(false);
    });

    it('should correctly detect shift key modifier', () => {
      const shiftEvent = new MouseEvent('click', { shiftKey: true });
      const plainEvent = new MouseEvent('click', {});

      expect(handler.isModifierActive(shiftEvent, 'shift')).toBe(true);
      expect(handler.isModifierActive(plainEvent, 'shift')).toBe(false);
    });
  });

  describe('Click Interception & Quick Save Trigger', () => {
    it('should intercept Alt+Click on <img> and dispatch quick save', async () => {
      const img = document.createElement('img');
      img.src = 'https://example.com/flower.png';
      img.alt = 'Beautiful flower';
      document.body.appendChild(img);

      const dispatchSpy = vi.spyOn(handler, 'dispatchQuickSave').mockResolvedValue({
        type: 'QUICK_SAVE_IMAGE_RESPONSE',
        id: '123',
        success: true,
        downloadId: 42
      });

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        altKey: true
      });

      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

      img.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          elementType: 'img',
          url: 'https://example.com/flower.png',
          altText: 'Beautiful flower'
        })
      );
    });

    it('should ignore clicks without the modifier key', async () => {
      const img = document.createElement('img');
      img.src = 'https://example.com/flower.png';
      document.body.appendChild(img);

      const dispatchSpy = vi.spyOn(handler, 'dispatchQuickSave');

      const plainClick = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        altKey: false
      });

      const preventDefaultSpy = vi.spyOn(plainClick, 'preventDefault');

      img.dispatchEvent(plainClick);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should ignore Alt+Click on plain text element with no image', async () => {
      const p = document.createElement('p');
      p.textContent = 'Hello world paragraph';
      document.body.appendChild(p);

      const dispatchSpy = vi.spyOn(handler, 'dispatchQuickSave');

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        altKey: true
      });

      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

      p.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should dynamically update modifier settings', async () => {
      handler.updateSettings({ shortcutModifier: 'shift', defaultFormat: 'webp' });

      const img = document.createElement('img');
      img.src = 'https://example.com/scenery.webp';
      document.body.appendChild(img);

      const dispatchSpy = vi.spyOn(handler, 'dispatchQuickSave').mockResolvedValue({
        type: 'QUICK_SAVE_IMAGE_RESPONSE',
        id: '123',
        success: true
      });

      // Shift+Click should now trigger
      const shiftClick = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        shiftKey: true
      });

      img.dispatchEvent(shiftClick);

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          elementType: 'img',
          url: 'https://example.com/scenery.webp'
        })
      );
    });
  });
});
