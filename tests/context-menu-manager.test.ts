import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createContextMenus,
  handleContextMenuClick,
  CONTEXT_MENU_ROOT_ID,
  CONTEXT_MENU_SETTINGS_ID,
  CONTEXT_MENU_SEPARATOR_ID,
  CONTEXT_MENU_FORMAT_PREFIX
} from '../src/background/context-menu-manager';
import { ExtensionSettings, DEFAULT_SETTINGS, InspectElementResult } from '../src/utils/types';
import * as downloadManager from '../src/background/download-manager';
import { resetMocks } from './setup';

describe('Context Menu Manager', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('createContextMenus', () => {
    it('should clear old menus and create root, format items, separator, and settings item', async () => {
      const settings: ExtensionSettings = {
        ...DEFAULT_SETTINGS,
        enabledFormats: ['png', 'jpeg', 'webp']
      };

      await createContextMenus(settings);

      expect(chrome.contextMenus.removeAll).toHaveBeenCalledTimes(1);

      // Root menu
      expect(chrome.contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: CONTEXT_MENU_ROOT_ID,
          title: 'Save Image As...'
        }),
        expect.any(Function)
      );

      // Submenus for enabled formats
      expect(chrome.contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `${CONTEXT_MENU_FORMAT_PREFIX}png`,
          parentId: CONTEXT_MENU_ROOT_ID
        }),
        expect.any(Function)
      );
      expect(chrome.contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `${CONTEXT_MENU_FORMAT_PREFIX}jpeg`,
          parentId: CONTEXT_MENU_ROOT_ID
        }),
        expect.any(Function)
      );
      expect(chrome.contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `${CONTEXT_MENU_FORMAT_PREFIX}webp`,
          parentId: CONTEXT_MENU_ROOT_ID
        }),
        expect.any(Function)
      );

      // Should not create disabled formats
      expect(chrome.contextMenus.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          id: `${CONTEXT_MENU_FORMAT_PREFIX}avif`
        }),
        expect.any(Function)
      );

      // Separator and Settings
      expect(chrome.contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: CONTEXT_MENU_SEPARATOR_ID,
          parentId: CONTEXT_MENU_ROOT_ID,
          type: 'separator'
        }),
        expect.any(Function)
      );
      expect(chrome.contextMenus.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: CONTEXT_MENU_SETTINGS_ID,
          parentId: CONTEXT_MENU_ROOT_ID,
          title: '⚙️ Settings...'
        }),
        expect.any(Function)
      );
    });
  });

  describe('handleContextMenuClick', () => {
    it('should open options page when settings item is clicked', async () => {
      const info: chrome.contextMenus.OnClickData = {
        menuItemId: CONTEXT_MENU_SETTINGS_ID,
        editable: false,
        pageUrl: 'https://example.com'
      };

      await handleContextMenuClick(info);

      expect(chrome.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
    });

    it('should query tab inspection and initiate download on format click', async () => {
      const mockResult: InspectElementResult = {
        url: 'https://example.com/images/hero-photo.png',
        elementType: 'img',
        naturalWidth: 1200,
        naturalHeight: 800,
        altText: 'Hero banner',
        pageTitle: 'Test Page',
        pageUrl: 'https://example.com',
        pageDomain: 'example.com'
      };

      // Mock tabs.sendMessage to return the inspected result
      vi.mocked(chrome.tabs.sendMessage as any).mockImplementation((_tabId: number, _msg: any, cb?: any) => {
        if (cb) {
          cb({
            type: 'INSPECT_ELEMENT_RESPONSE',
            id: 'mock-id',
            success: true,
            result: mockResult
          });
        }
        return Promise.resolve();
      });

      // Spy on handleConvertImage
      const convertSpy = vi.spyOn(downloadManager, 'handleConvertImage').mockResolvedValue({
        type: 'CONVERT_IMAGE_RESPONSE',
        id: 'mock-conv-id',
        success: true,
        dataUrl: 'data:image/webp;base64,mockConvertedWebP'
      });

      const info: chrome.contextMenus.OnClickData = {
        menuItemId: `${CONTEXT_MENU_FORMAT_PREFIX}webp`,
        editable: false,
        srcUrl: 'https://example.com/images/hero-photo.png',
        pageUrl: 'https://example.com'
      };
      const mockTab = { id: 101, title: 'Test Page', url: 'https://example.com' } as chrome.tabs.Tab;

      await handleContextMenuClick(info, mockTab);

      expect(convertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          targetFormat: 'webp',
          source: { type: 'url', data: 'https://example.com/images/hero-photo.png' }
        })
      );

      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'data:image/webp;base64,mockConvertedWebP',
          filename: 'hero-photo.webp'
        }),
        expect.any(Function)
      );
    });

    it('should fallback to info.srcUrl if content script is unavailable', async () => {
      // Mock tabs.sendMessage failing (e.g. content script not present)
      vi.mocked(chrome.tabs.sendMessage as any).mockImplementation((_tabId: number, _msg: any, cb?: any) => {
        if (cb) cb(null);
        return Promise.resolve();
      });

      const convertSpy = vi.spyOn(downloadManager, 'handleConvertImage').mockResolvedValue({
        type: 'CONVERT_IMAGE_RESPONSE',
        id: 'mock-conv-id',
        success: true,
        dataUrl: 'data:image/jpeg;base64,mockConvertedJpeg'
      });

      const info: chrome.contextMenus.OnClickData = {
        menuItemId: `${CONTEXT_MENU_FORMAT_PREFIX}jpeg`,
        editable: false,
        srcUrl: 'https://example.com/photo-banner.png',
        pageUrl: 'https://example.com'
      };
      const mockTab = { id: 102, title: 'Fallback Tab', url: 'https://example.com' } as chrome.tabs.Tab;

      await handleContextMenuClick(info, mockTab);

      expect(convertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          targetFormat: 'jpeg',
          source: { type: 'url', data: 'https://example.com/photo-banner.png' }
        })
      );

      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'data:image/jpeg;base64,mockConvertedJpeg',
          filename: 'photo-banner.jpg'
        }),
        expect.any(Function)
      );
    });

    it('should directly package SVG markup when saving as SVG', async () => {
      const mockResult: InspectElementResult = {
        url: 'https://example.com/icon.svg',
        elementType: 'svg-inline',
        pageTitle: 'SVG Page',
        pageUrl: 'https://example.com',
        pageDomain: 'example.com',
        svgContent: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle r="5"/></svg>'
      };

      vi.mocked(chrome.tabs.sendMessage as any).mockImplementation((_tabId: number, _msg: any, cb?: any) => {
        if (cb) {
          cb({
            type: 'INSPECT_ELEMENT_RESPONSE',
            id: 'mock-id',
            success: true,
            result: mockResult
          });
        }
        return Promise.resolve();
      });

      const convertSpy = vi.spyOn(downloadManager, 'handleConvertImage');

      const info: chrome.contextMenus.OnClickData = {
        menuItemId: `${CONTEXT_MENU_FORMAT_PREFIX}svg`,
        editable: false,
        pageUrl: 'https://example.com'
      };
      const mockTab = { id: 103, title: 'SVG Page', url: 'https://example.com' } as chrome.tabs.Tab;

      await handleContextMenuClick(info, mockTab);

      // Conversion engine not needed for raw SVG preservation
      expect(convertSpy).not.toHaveBeenCalled();

      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('data:image/svg+xml'),
          filename: 'icon.svg'
        }),
        expect.any(Function)
      );
    });
  });
});
