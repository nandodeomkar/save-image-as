import { describe, it, expect } from 'vitest';
import { convertImage } from '../src/offscreen/converter';
import { ConvertImageRequestMessage, ImageFormat } from '../src/utils/types';

describe('Unified Image Converter Engine', () => {
  const sampleDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const allFormats: ImageFormat[] = [
    'png',
    'jpeg',
    'webp',
    'avif',
    'bmp',
    'gif',
    'ico',
    'pdf',
    'svg'
  ];

  for (const format of allFormats) {
    it(`successfully converts input image to ${format.toUpperCase()}`, async () => {
      const request: ConvertImageRequestMessage = {
        type: 'CONVERT_IMAGE_REQUEST',
        id: `test-conv-${format}`,
        source: {
          type: 'data-url',
          data: sampleDataUrl
        },
        targetFormat: format,
        quality: 0.85
      };

      const result = await convertImage(request);

      expect(result).toBeDefined();
      expect(result.dataUrl).toBeDefined();
      expect(result.dataUrl.length).toBeGreaterThan(0);
      expect(result.byteLength).toBeGreaterThan(0);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.mimeType).toBeDefined();
    });
  }

  it('preserves vector markup when converting SVG to SVG', async () => {
    const rawSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="blue" width="200" height="200"/></svg>';
    const request: ConvertImageRequestMessage = {
      type: 'CONVERT_IMAGE_REQUEST',
      id: 'test-svg-svg',
      source: {
        type: 'svg-string',
        data: rawSvg
      },
      targetFormat: 'svg'
    };

    const result = await convertImage(request);
    expect(result.mimeType).toBe('image/svg+xml');
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
  });

  it('rasterizes SVG input when converting to PNG', async () => {
    const rawSvg = '<svg viewBox="0 0 300 150"><rect fill="green" width="300" height="150"/></svg>';
    const request: ConvertImageRequestMessage = {
      type: 'CONVERT_IMAGE_REQUEST',
      id: 'test-svg-png',
      source: {
        type: 'svg-string',
        data: rawSvg
      },
      targetFormat: 'png'
    };

    const result = await convertImage(request);
    expect(result.width).toBe(300);
    expect(result.height).toBe(150);
    expect(result.dataUrl).toContain('data:image/png;base64');
  });

  it('applies custom background color', async () => {
    const request: ConvertImageRequestMessage = {
      type: 'CONVERT_IMAGE_REQUEST',
      id: 'test-custom-bg',
      source: {
        type: 'data-url',
        data: sampleDataUrl
      },
      targetFormat: 'jpeg',
      backgroundColor: '#FF0000'
    };

    const result = await convertImage(request);
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('rejects unsupported target format', async () => {
    const request: any = {
      type: 'CONVERT_IMAGE_REQUEST',
      id: 'test-unsupported',
      source: {
        type: 'data-url',
        data: sampleDataUrl
      },
      targetFormat: 'unsupported-format'
    };

    await expect(convertImage(request)).rejects.toThrow(/Unsupported target format/);
  });
});
