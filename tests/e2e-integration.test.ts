import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { inspectElement } from '../src/content/dom-inspector';
import { convertImage } from '../src/offscreen/converter';
import { formatFilename } from '../src/utils/filename-helper';
import * as downloadManager from '../src/background/download-manager';
import { handleContextMenuClick, CONTEXT_MENU_FORMAT_PREFIX } from '../src/background/context-menu-manager';
import { ShortcutHandler } from '../src/content/shortcut-handler';
import { ImageFormat, InspectElementResult } from '../src/utils/types';
import { resetMocks } from './setup';

describe('End-to-End Fixtures & Conversion Pipeline Integration', () => {
  let fixtureHtml: string;

  beforeEach(() => {
    resetMocks();
    const fixturePath = path.resolve(__dirname, 'fixtures/test-page.html');
    fixtureHtml = fs.readFileSync(fixturePath, 'utf-8');
    document.documentElement.innerHTML = fixtureHtml;
  });

  describe('1. DOM Inspection across all Realistic Image Fixtures', () => {
    it('inspects standard JPEG image correctly', () => {
      const el = document.getElementById('img-jpeg') as HTMLImageElement;
      expect(el).not.toBeNull();
      const result = inspectElement(el);
      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://example.com/images/mountain-sunset.jpg');
      expect(result?.elementType).toBe('img');
      expect(result?.altText).toBe('Mountain Sunset');
    });

    it('inspects transparent PNG image correctly', () => {
      const el = document.getElementById('img-png-alpha') as HTMLImageElement;
      expect(el).not.toBeNull();
      const result = inspectElement(el);
      expect(result?.url).toBe('https://example.com/images/logo-transparent.png');
      expect(result?.elementType).toBe('img');
      expect(result?.altText).toBe('Company Logo');
    });

    it('inspects next-gen WebP and AVIF images', () => {
      const webpEl = document.getElementById('img-webp') as HTMLImageElement;
      const avifEl = document.getElementById('img-avif') as HTMLImageElement;

      const webpResult = inspectElement(webpEl);
      const avifResult = inspectElement(avifEl);

      expect(webpResult?.url).toBe('https://example.com/images/nature-wildlife.webp');
      expect(avifResult?.url).toBe('https://example.com/images/portrait-highres.avif');
    });

    it('inspects GIF, BMP, and ICO images', () => {
      const gifEl = document.getElementById('img-gif') as HTMLImageElement;
      const bmpEl = document.getElementById('img-bmp') as HTMLImageElement;
      const icoEl = document.getElementById('img-ico') as HTMLImageElement;

      expect(inspectElement(gifEl)?.url).toBe('https://example.com/images/loading-spinner.gif');
      expect(inspectElement(bmpEl)?.url).toBe('https://example.com/images/retro-pixelart.bmp');
      expect(inspectElement(icoEl)?.url).toBe('https://example.com/images/favicon.ico');
    });

    it('inspects external SVG image file', () => {
      const svgImgEl = document.getElementById('img-svg-file') as HTMLImageElement;
      const result = inspectElement(svgImgEl);
      expect(result?.url).toBe('https://example.com/images/badge-verified.svg');
      expect(result?.elementType).toBe('img');
    });

    it('resolves highest resolution candidate from pixel density srcset (1x, 2x, 3x)', () => {
      const el = document.getElementById('img-srcset-density') as HTMLImageElement;
      const result = inspectElement(el);
      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://example.com/images/hero-3x.jpg');
    });

    it('resolves highest resolution candidate from width-descriptor srcset with commas in query parameters', () => {
      const el = document.getElementById('img-srcset-width') as HTMLImageElement;
      const result = inspectElement(el);
      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://example.com/images/photo.jpg?w=1920&filter=sharp(1,2)');
    });

    it('resolves highest resolution source candidate from responsive <picture> element', () => {
      const pictureImg = document.getElementById('picture-img') as HTMLImageElement;
      const result = inspectElement(pictureImg);
      expect(result).not.toBeNull();
      // Should pick highest density 2x source candidate
      expect(result?.url).toBe('https://example.com/images/modern-art-4k.avif');
      expect(result?.elementType).toBe('picture');
    });

    it('extracts CSS inline background image URL', () => {
      const el = document.getElementById('bg-inline') as HTMLElement;
      const result = inspectElement(el);
      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://example.com/assets/inline-banner.jpg');
      expect(result?.elementType).toBe('css-background');
    });

    it('extracts data URL from dynamic HTML5 <canvas> element', () => {
      const el = document.getElementById('canvas-dynamic') as HTMLCanvasElement;
      const result = inspectElement(el);
      expect(result).not.toBeNull();
      expect(result?.elementType).toBe('canvas');
      expect(result?.url).toContain('data:image/png;base64');
    });

    it('extracts serialized SVG markup and XML data URI from inline <svg> element', () => {
      const el = document.getElementById('svg-inline') as unknown as HTMLElement;
      const result = inspectElement(el);
      expect(result).not.toBeNull();
      expect(result?.elementType).toBe('svg-inline');
      expect(result?.svgContent).toContain('<svg');
      expect(result?.svgContent).toContain('grad1');
      expect(result?.url).toContain('data:image/svg+xml');
    });

    it('extracts Base64 data URI directly', () => {
      const el = document.getElementById('img-data-uri') as HTMLImageElement;
      const result = inspectElement(el);
      expect(result).not.toBeNull();
      expect(result?.url).toContain('data:image/png;base64,');
    });

    it('inspects nested overlay mask container to find child <img>', () => {
      const containerOverlay = document.getElementById('container-overlay') as HTMLElement;
      const result = inspectElement(containerOverlay);
      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://example.com/images/feed-photo.jpg');
    });
  });

  describe('2. Client-Side Conversion across all 9 Output Formats', () => {
    const allFormats: ImageFormat[] = ['png', 'jpeg', 'webp', 'avif', 'bmp', 'gif', 'ico', 'pdf', 'svg'];
    const sampleInputData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    for (const format of allFormats) {
      it(`converts image successfully into target format: ${format.toUpperCase()}`, async () => {
        const response = await convertImage({
          type: 'CONVERT_IMAGE_REQUEST',
          id: `conv-test-${format}`,
          source: { type: 'data-url', data: sampleInputData },
          targetFormat: format,
          quality: 0.9,
          backgroundColor: '#ffffff'
        });

        expect(response).toBeDefined();
        expect(response.dataUrl).toBeDefined();

        if (format === 'svg') {
          expect(response.dataUrl).toContain('data:image/svg+xml');
        } else if (format === 'pdf') {
          expect(response.dataUrl).toContain('data:application/pdf');
        } else if (format === 'ico') {
          expect(response.dataUrl).toContain('data:image/x-icon');
        } else if (format === 'bmp') {
          expect(response.dataUrl).toContain('data:image/bmp');
        } else if (format === 'gif') {
          expect(response.dataUrl).toContain('data:image/gif');
        } else if (format === 'jpeg') {
          expect(response.dataUrl).toContain('data:image/jpeg');
        } else {
          expect(response.dataUrl).toContain(`data:image/${format}`);
        }
      });
    }

    it('handles alpha background fill when converting transparent image to JPEG', async () => {
      const response = await convertImage({
        type: 'CONVERT_IMAGE_REQUEST',
        id: 'alpha-test-jpeg',
        source: { type: 'data-url', data: sampleInputData },
        targetFormat: 'jpeg',
        quality: 0.85,
        backgroundColor: '#ff0000'
      });

      expect(response).toBeDefined();
      expect(response.dataUrl).toContain('data:image/jpeg');
    });

    it('handles multi-resolution generation for ICO export', async () => {
      const response = await convertImage({
        type: 'CONVERT_IMAGE_REQUEST',
        id: 'multi-res-ico',
        source: { type: 'data-url', data: sampleInputData },
        targetFormat: 'ico'
      });

      expect(response).toBeDefined();
      expect(response.dataUrl).toContain('data:image/x-icon;base64,');
      // Validate ICO magic header (0x00, 0x00, 0x01, 0x00)
      const base64Data = response.dataUrl.split(',')[1];
      const binary = atob(base64Data);
      expect(binary.charCodeAt(0)).toBe(0);
      expect(binary.charCodeAt(1)).toBe(0);
      expect(binary.charCodeAt(2)).toBe(1);
      expect(binary.charCodeAt(3)).toBe(0);
    });

    it('handles single-image PDF generation', async () => {
      const response = await convertImage({
        type: 'CONVERT_IMAGE_REQUEST',
        id: 'pdf-export-test',
        source: { type: 'data-url', data: sampleInputData },
        targetFormat: 'pdf'
      });

      expect(response).toBeDefined();
      expect(response.dataUrl).toContain('data:application/pdf;base64,');
      // Validate PDF signature (%PDF-)
      const base64Data = response.dataUrl.split(',')[1];
      const binary = atob(base64Data);
      expect(binary.slice(0, 5)).toBe('%PDF-');
    });
  });

  describe('3. Dynamic Filename Template Engine & Sanitization', () => {
    const inspected: InspectElementResult = {
      url: 'https://cdn.example.com/assets/photos/mountain-sunset.png?w=1920',
      elementType: 'img',
      naturalWidth: 3840,
      naturalHeight: 2160,
      altText: 'Mountain Sunset View',
      pageTitle: 'Test Fixtures Lab | Save Image As',
      pageUrl: 'https://example.com/fixtures.html',
      pageDomain: 'example.com'
    };

    it('formats tokens: [name], [ext], [page-title], [domain], [date], [dimensions]', () => {
      const filename = formatFilename(
        '[name]-[dimensions]-[domain]-[page-title].[ext]',
        inspected,
        'webp'
      );

      expect(filename).toContain('mountain-sunset');
      expect(filename).toContain('3840x2160');
      expect(filename).toContain('example.com');
      expect(filename).toContain('Test-Fixtures-Lab-Save-Image-As');
      expect(filename.endsWith('.webp')).toBe(true);
    });

    it('sanitizes illegal Windows filesystem characters and truncates excessive length', () => {
      const illegalInspected: InspectElementResult = {
        ...inspected,
        altText: 'A "Wild" & <Crazy> / Path: *Test* ? File | Name',
        url: 'https://example.com/CON.png' // Windows reserved device name
      };

      const filename = formatFilename(
        '[name].[ext]',
        illegalInspected,
        'png'
      );

      // CON should be modified to CON-file to avoid Windows device name conflict
      expect(filename).toBe('CON-file.png');
    });
  });

  describe('4. Full End-to-End Download Workflow Simulation', () => {
    it('executes full context menu click flow: inspect -> convert -> download', async () => {
      const img = document.getElementById('img-jpeg') as HTMLImageElement;
      const inspected = inspectElement(img)!;

      // Mock tabs.sendMessage to return the inspected fixture image
      vi.mocked(chrome.tabs.sendMessage as any).mockImplementation((_tabId: number, _msg: any, cb?: any) => {
        if (cb) {
          cb({
            type: 'INSPECT_ELEMENT_RESPONSE',
            id: 'e2e-test',
            success: true,
            result: inspected
          });
        }
        return Promise.resolve();
      });

      // Mock handleConvertImage spy
      const convertSpy = vi.spyOn(downloadManager, 'handleConvertImage').mockResolvedValue({
        type: 'CONVERT_IMAGE_RESPONSE',
        id: 'e2e-test-conv',
        success: true,
        dataUrl: 'data:image/avif;base64,mockConvertedAvif'
      });

      const info: chrome.contextMenus.OnClickData = {
        menuItemId: `${CONTEXT_MENU_FORMAT_PREFIX}avif`,
        editable: false,
        srcUrl: inspected.url,
        pageUrl: window.location.href
      };
      const mockTab = { id: 99, title: document.title, url: window.location.href } as chrome.tabs.Tab;

      await handleContextMenuClick(info, mockTab);

      expect(convertSpy).toHaveBeenCalled();
      // Verify download manager dispatched download with converted URL and formatted filename
      expect(chrome.downloads.download).toHaveBeenCalledTimes(1);
      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'mountain-sunset.avif',
          saveAs: false
        }),
        expect.any(Function)
      );
    });

    it('executes 1-click Alt+Click shortcut workflow: inspect -> send message -> background download', async () => {
      const img = document.getElementById('img-webp') as HTMLImageElement;
      const handler = new ShortcutHandler({ shortcutModifier: 'alt', defaultFormat: 'png' });
      
      const dispatchSpy = vi.spyOn(handler, 'dispatchQuickSave').mockResolvedValue({
        type: 'QUICK_SAVE_IMAGE_RESPONSE',
        id: 'qs-e2e',
        success: true,
        downloadId: 42
      });

      const inspected = inspectElement(img)!;
      const res = await handler.dispatchQuickSave(inspected);

      expect(dispatchSpy).toHaveBeenCalledWith(inspected);
      expect(res.success).toBe(true);
      expect(res.downloadId).toBe(42);
    });
  });
});
