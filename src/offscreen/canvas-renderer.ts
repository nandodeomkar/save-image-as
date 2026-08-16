/**
 * Canvas Rendering Engine with Alpha Compositing and Scaling
 */

import { LoadedImage } from './image-loader';

export interface ScaleOptions {
  maxWidth?: number;
  maxHeight?: number;
  scale?: number;
  targetWidth?: number;
  targetHeight?: number;
}

export interface RenderOptions {
  backgroundColor?: string | null; // e.g. '#FFFFFF' or null for transparent
  scaleOptions?: ScaleOptions;
  smoothingQuality?: ImageSmoothingQuality;
}

export interface RenderedCanvas {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
  getImageData(): ImageData;
  toBlob(mimeType?: string, quality?: number): Promise<Blob>;
  toDataURL(mimeType?: string, quality?: number): string;
  dispose(): void;
}

/**
 * Calculate scaled dimensions while preserving aspect ratio
 */
export function scaleDimensions(
  origWidth: number,
  origHeight: number,
  options?: ScaleOptions
): { width: number; height: number } {
  if (!options) {
    return { width: Math.max(1, Math.round(origWidth)), height: Math.max(1, Math.round(origHeight)) };
  }

  let targetWidth = origWidth;
  let targetHeight = origHeight;

  // Direct scale multiplier
  if (options.scale && options.scale > 0) {
    targetWidth = origWidth * options.scale;
    targetHeight = origHeight * options.scale;
  }

  // Explicit target dimensions
  if (options.targetWidth && options.targetHeight) {
    targetWidth = options.targetWidth;
    targetHeight = options.targetHeight;
  } else if (options.targetWidth && !options.targetHeight) {
    targetWidth = options.targetWidth;
    targetHeight = (origHeight * options.targetWidth) / origWidth;
  } else if (!options.targetWidth && options.targetHeight) {
    targetHeight = options.targetHeight;
    targetWidth = (origWidth * options.targetHeight) / origHeight;
  }

  // Apply max width / max height constraints while preserving aspect ratio
  if (options.maxWidth && targetWidth > options.maxWidth) {
    const ratio = options.maxWidth / targetWidth;
    targetWidth = options.maxWidth;
    targetHeight = targetHeight * ratio;
  }

  if (options.maxHeight && targetHeight > options.maxHeight) {
    const ratio = options.maxHeight / targetHeight;
    targetHeight = options.maxHeight;
    targetWidth = targetWidth * ratio;
  }

  return {
    width: Math.max(1, Math.round(targetWidth)),
    height: Math.max(1, Math.round(targetHeight))
  };
}

/**
 * Create a new canvas element or OffscreenCanvas instance
 */
export function createCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
} {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));

  if (typeof document !== 'undefined' && document.createElement) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Failed to create 2D canvas context');
    return { canvas, ctx };
  } else if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Failed to create 2D offscreen canvas context');
    return { canvas, ctx };
  }

  throw new Error('Canvas API is not supported in current environment');
}

/**
 * Render image onto canvas with alpha blending / background fill
 */
export function renderImageToCanvas(
  source: LoadedImage | CanvasImageSource,
  options?: RenderOptions
): RenderedCanvas {
  let imageElement: CanvasImageSource;
  let srcWidth: number;
  let srcHeight: number;

  if ('image' in source && 'width' in source && 'height' in source) {
    imageElement = source.image;
    srcWidth = source.width;
    srcHeight = source.height;
  } else {
    imageElement = source;
    srcWidth = (source as any).naturalWidth || (source as any).width || 300;
    srcHeight = (source as any).naturalHeight || (source as any).height || 150;
  }

  const { width, height } = scaleDimensions(srcWidth, srcHeight, options?.scaleOptions);
  const { canvas, ctx } = createCanvas(width, height);

  // Setup smoothing quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = options?.smoothingQuality || 'high';

  // Fill background if specified (e.g. solid white for JPEG/BMP to prevent black boxes)
  if (options?.backgroundColor) {
    ctx.save();
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Blit source image
  ctx.drawImage(imageElement as any, 0, 0, width, height);

  return {
    canvas,
    ctx,
    width,
    height,
    getImageData(): ImageData {
      return ctx.getImageData(0, 0, width, height);
    },
    async toBlob(mimeType = 'image/png', quality?: number): Promise<Blob> {
      if ('convertToBlob' in canvas) {
        return await (canvas as OffscreenCanvas).convertToBlob({
          type: mimeType,
          quality
        });
      } else if ('toBlob' in canvas) {
        return new Promise((resolve, reject) => {
          (canvas as HTMLCanvasElement).toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error(`Failed to export canvas to Blob for MIME type: ${mimeType}`));
              }
            },
            mimeType,
            quality
          );
        });
      }
      throw new Error('Canvas toBlob is not supported');
    },
    toDataURL(mimeType = 'image/png', quality?: number): string {
      if ('toDataURL' in canvas) {
        return (canvas as HTMLCanvasElement).toDataURL(mimeType, quality);
      }
      throw new Error('Canvas toDataURL is not supported on this canvas type');
    },
    dispose(): void {
      // Clear canvas buffer
      ctx.clearRect(0, 0, width, height);
      if ('width' in canvas) {
        canvas.width = 1;
        canvas.height = 1;
      }
    }
  };
}
