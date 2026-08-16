/**
 * Robust Image Loader for Offscreen Canvas Operations
 */

import { parseSvg, rasterizeSvg } from './svg-loader';

export type ImageSourcePayload =
  | string
  | {
      type: 'url' | 'data-url' | 'blob-buffer' | 'svg-string';
      data: string;
    };

export interface LoadedImage {
  image: CanvasImageSource;
  width: number;
  height: number;
  aspectRatio: number;
  isSvg: boolean;
  rawSvg?: string;
  cleanup: () => void;
}

/**
 * Convert base64 string to Uint8Array buffer
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  // Strip data URL prefix if present
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert ArrayBuffer or Uint8Array to base64 Data URL
 */
export function uint8ArrayToDataUrl(bytes: Uint8Array, mimeType: string): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

/**
 * Loads an image from various input representations into a renderable CanvasImageSource
 */
export async function loadImage(source: ImageSourcePayload): Promise<LoadedImage> {
  let sourceType: 'url' | 'data-url' | 'blob-buffer' | 'svg-string';
  let data: string;

  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml') || trimmed.includes('<svg')) {
      sourceType = 'svg-string';
      data = trimmed;
    } else if (trimmed.startsWith('data:image/svg+xml')) {
      sourceType = 'svg-string';
      // Decode SVG from data URL if needed
      if (trimmed.includes(';base64,')) {
        const base64 = trimmed.split(';base64,')[1];
        data = atob(base64);
      } else {
        data = decodeURIComponent(trimmed.split(',')[1] || '');
      }
    } else if (trimmed.startsWith('data:')) {
      sourceType = 'data-url';
      data = trimmed;
    } else {
      sourceType = 'url';
      data = trimmed;
    }
  } else {
    sourceType = source.type;
    data = source.data;
  }

  // Case 1: SVG String
  if (sourceType === 'svg-string') {
    const parsed = parseSvg(data);
    const raster = await rasterizeSvg(parsed.svgString, parsed.width, parsed.height);
    return {
      image: raster.element,
      width: raster.width,
      height: raster.height,
      aspectRatio: raster.width / raster.height,
      isSvg: true,
      rawSvg: parsed.svgString,
      cleanup: raster.cleanup
    };
  }

  // Case 2: Binary Blob Buffer (base64 encoded)
  let objectUrlToRevoke: string | null = null;
  let resolvedUrl = data;

  if (sourceType === 'blob-buffer') {
    const bytes = base64ToUint8Array(data);
    const blob = new Blob([bytes.buffer as ArrayBuffer]);
    resolvedUrl = URL.createObjectURL(blob);
    objectUrlToRevoke = resolvedUrl;
  }

  const cleanup = () => {
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
      objectUrlToRevoke = null;
    }
  };

  // Case 3: Standard Image URL or Data URL
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      if (!width || !height) {
        cleanup();
        reject(new Error('Loaded image has zero width or height'));
        return;
      }

      resolve({
        image: img,
        width,
        height,
        aspectRatio: width / height,
        isSvg: false,
        cleanup
      });
    };

    img.onerror = (err) => {
      cleanup();
      reject(new Error(`Failed to load image from source: ${err}`));
    };

    img.src = resolvedUrl;
  });
}
