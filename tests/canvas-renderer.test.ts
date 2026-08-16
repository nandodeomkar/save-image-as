import { describe, it, expect } from 'vitest';
import { parseSvg, rasterizeSvg } from '../src/offscreen/svg-loader';
import { loadImage, base64ToUint8Array, uint8ArrayToDataUrl } from '../src/offscreen/image-loader';
import { scaleDimensions, renderImageToCanvas } from '../src/offscreen/canvas-renderer';

describe('SVG Loader & Parser', () => {
  it('parses SVG with explicit width and height', () => {
    const svg = '<svg width="400" height="200"><rect width="100%" height="100%" fill="red"/></svg>';
    const info = parseSvg(svg);

    expect(info.width).toBe(400);
    expect(info.height).toBe(200);
    expect(info.aspectRatio).toBe(2);
    expect(info.svgString).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('parses SVG with viewBox and derives missing width/height', () => {
    const svg = '<svg viewBox="0 0 1000 500"><circle cx="50" cy="50" r="40"/></svg>';
    const info = parseSvg(svg);

    expect(info.width).toBe(1000);
    expect(info.height).toBe(500);
    expect(info.aspectRatio).toBe(2);
    expect(info.viewBox).toEqual({ minX: 0, minY: 0, width: 1000, height: 500 });
  });

  it('provides default 800x800 dimensions when both dimensions and viewBox are missing', () => {
    const svg = '<svg><path d="M10 10"/></svg>';
    const info = parseSvg(svg);

    expect(info.width).toBe(800);
    expect(info.height).toBe(800);
    expect(info.aspectRatio).toBe(1);
  });

  it('rasterizes SVG to HTMLImageElement', async () => {
    const svg = '<svg width="100" height="50"><rect fill="blue"/></svg>';
    const raster = await rasterizeSvg(svg, 200, 100);

    expect(raster.element).toBeDefined();
    expect(raster.width).toBe(200);
    expect(raster.height).toBe(100);
    expect(typeof raster.cleanup).toBe('function');
    raster.cleanup();
  });
});

describe('Image Loader', () => {
  it('converts base64 to Uint8Array and back to Data URL', () => {
    const originalText = 'SaveImageAs';
    const base64 = btoa(originalText);
    const bytes = base64ToUint8Array(base64);

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(originalText.length);

    const dataUrl = uint8ArrayToDataUrl(bytes, 'image/png');
    expect(dataUrl).toBe(`data:image/png;base64,${base64}`);
  });

  it('loads image from Data URL', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const loaded = await loadImage(dataUrl);

    expect(loaded.image).toBeDefined();
    expect(loaded.width).toBeGreaterThan(0);
    expect(loaded.height).toBeGreaterThan(0);
    expect(loaded.isSvg).toBe(false);
    expect(typeof loaded.cleanup).toBe('function');
    loaded.cleanup();
  });

  it('loads SVG string through SVG pipeline', async () => {
    const svg = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"/></svg>';
    const loaded = await loadImage(svg);

    expect(loaded.isSvg).toBe(true);
    expect(loaded.rawSvg).toBeDefined();
    expect(loaded.width).toBe(100);
    expect(loaded.height).toBe(100);
    loaded.cleanup();
  });

  it('loads image from base64 blob-buffer payload', async () => {
    const base64Data = btoa('mock-binary-pixel-data');
    const loaded = await loadImage({
      type: 'blob-buffer',
      data: base64Data
    });

    expect(loaded.image).toBeDefined();
    expect(loaded.width).toBeGreaterThan(0);
    loaded.cleanup();
  });
});

describe('Canvas Rendering & Scaling Engine', () => {
  it('calculates proportional scale dimensions with scale multiplier', () => {
    const scaled = scaleDimensions(800, 600, { scale: 0.5 });
    expect(scaled).toEqual({ width: 400, height: 300 });
  });

  it('calculates dimensions respecting maxWidth while maintaining aspect ratio', () => {
    const scaled = scaleDimensions(1000, 500, { maxWidth: 500 });
    expect(scaled).toEqual({ width: 500, height: 250 });
  });

  it('calculates dimensions respecting maxHeight while maintaining aspect ratio', () => {
    const scaled = scaleDimensions(1000, 500, { maxHeight: 200 });
    expect(scaled).toEqual({ width: 400, height: 200 });
  });

  it('renders image to canvas with solid background fill for opaque formats', () => {
    const mockImage = { width: 400, height: 300 } as any;
    const rendered = renderImageToCanvas(mockImage, {
      backgroundColor: '#FFFFFF'
    });

    expect(rendered.width).toBe(400);
    expect(rendered.height).toBe(300);
    expect(rendered.ctx.fillRect).toHaveBeenCalledWith(0, 0, 400, 300);
    expect(rendered.ctx.drawImage).toHaveBeenCalledWith(mockImage, 0, 0, 400, 300);
  });

  it('renders image to canvas with transparent background when backgroundColor is null', () => {
    const mockImage = { width: 200, height: 200 } as any;
    const rendered = renderImageToCanvas(mockImage, {
      backgroundColor: null
    });

    expect(rendered.ctx.fillRect).not.toHaveBeenCalled();
    expect(rendered.ctx.drawImage).toHaveBeenCalled();
  });

  it('exports rendered canvas to Blob and DataURL', async () => {
    const mockImage = { width: 100, height: 100 } as any;
    const rendered = renderImageToCanvas(mockImage);

    const blob = await rendered.toBlob('image/png');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');

    const dataUrl = rendered.toDataURL('image/png');
    expect(dataUrl).toContain('data:image/png;base64');

    const imgData = rendered.getImageData();
    expect(imgData).toBeDefined();
    expect(imgData.width).toBe(100);
    expect(imgData.height).toBe(100);

    rendered.dispose();
  });
});
