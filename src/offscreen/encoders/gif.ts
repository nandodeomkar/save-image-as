/**
 * Pure-JS Static GIF Encoder
 * Converts ImageData (RGBA) into indexed-color GIF bytes using omggif
 */

import { GifWriter } from 'omggif';

export interface GifEncodeOptions {
  maxColors?: number; // 2 to 256 (default: 256)
  dither?: boolean;
}

export interface GifEncodeResult {
  blob: Blob;
  bytes: Uint8Array;
  width: number;
  height: number;
}

/**
 * Quantize RGBA ImageData to an indexed palette (up to 256 colors) and index buffer
 */
function quantizeImageData(
  imageData: ImageData,
  maxColors = 256
): { palette: number[]; indexedPixels: Uint8Array; transparentIndex?: number } {
  const { data, width, height } = imageData;
  const numPixels = width * height;
  const indexedPixels = new Uint8Array(numPixels);

  const colorMap = new Map<number, { count: number; r: number; g: number; b: number }>();
  let hasTransparency = false;

  // First pass: identify colors and check for alpha
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) {
      hasTransparency = true;
      continue;
    }

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Quantize 8-bit to 5-bit color space for fast frequency binning if large
    const key = (r << 16) | (g << 8) | b;
    const existing = colorMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorMap.set(key, { count: 1, r, g, b });
    }
  }

  const maxOpaqueColors = hasTransparency ? maxColors - 1 : maxColors;
  const palette: number[] = [];
  let transparentIndex: number | undefined;

  if (hasTransparency) {
    transparentIndex = 0;
    palette.push(0x000000); // Index 0 reserved for transparency
  }

  // Sort colors by frequency descending
  const sortedColors = Array.from(colorMap.entries()).sort((a, b) => b[1].count - a[1].count);

  const paletteMap = new Map<number, number>();

  if (sortedColors.length <= maxOpaqueColors) {
    // Exact colors fit in palette
    for (const [key] of sortedColors) {
      const idx = palette.length;
      palette.push(key);
      paletteMap.set(key, idx);
    }
  } else {
    // Take top most frequent colors
    for (let i = 0; i < maxOpaqueColors; i++) {
      const key = sortedColors[i][0];
      const idx = palette.length;
      palette.push(key);
      paletteMap.set(key, idx);
    }
  }

  // Ensure palette size is a power of 2 between 2 and 256 for standard GIF
  let targetPaletteSize = 2;
  while (targetPaletteSize < palette.length && targetPaletteSize < 256) {
    targetPaletteSize *= 2;
  }
  while (palette.length < targetPaletteSize) {
    palette.push(0x000000);
  }

  // Helper to find nearest color index in palette
  const findNearestColor = (r: number, g: number, b: number): number => {
    let minDist = Infinity;
    let bestIdx = hasTransparency ? 1 : 0;
    const startIdx = hasTransparency ? 1 : 0;

    for (let i = startIdx; i < palette.length; i++) {
      const color = palette[i];
      const pr = (color >> 16) & 0xff;
      const pg = (color >> 8) & 0xff;
      const pb = color & 0xff;

      const dr = r - pr;
      const dg = g - pg;
      const db = b - pb;
      const dist = dr * dr + dg * dg + db * db;

      if (dist < minDist) {
        minDist = dist;
        bestIdx = i;
        if (dist === 0) break;
      }
    }
    return bestIdx;
  };

  // Second pass: map each pixel to palette index
  let pixelIndex = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128 && hasTransparency) {
      indexedPixels[pixelIndex++] = transparentIndex!;
      continue;
    }

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = (r << 16) | (g << 8) | b;

    const directIdx = paletteMap.get(key);
    if (directIdx !== undefined) {
      indexedPixels[pixelIndex++] = directIdx;
    } else {
      const nearest = findNearestColor(r, g, b);
      paletteMap.set(key, nearest);
      indexedPixels[pixelIndex++] = nearest;
    }
  }

  return { palette, indexedPixels, transparentIndex };
}

/**
 * Encodes ImageData (RGBA) into static GIF binary buffer and Blob
 */
export function encodeGif(imageData: ImageData, options?: GifEncodeOptions): GifEncodeResult {
  const width = imageData.width;
  const height = imageData.height;
  const maxColors = Math.min(256, Math.max(2, options?.maxColors || 256));

  const { palette, indexedPixels, transparentIndex } = quantizeImageData(imageData, maxColors);

  // Allocate buffer for GIF bytes
  const bufferSize = width * height * 3 + 1024;
  const outputBuffer = new Uint8Array(bufferSize);

  const writer = new GifWriter(outputBuffer as any, width, height, {
    palette
  });

  const frameOptions: { palette?: number[]; transparent?: number } = {};
  if (transparentIndex !== undefined) {
    frameOptions.transparent = transparentIndex;
  }

  writer.addFrame(0, 0, width, height, indexedPixels as any, frameOptions);
  const endPosition = writer.end();

  const finalBytes = outputBuffer.subarray(0, endPosition);
  const blob = new Blob([finalBytes], { type: 'image/gif' });

  return {
    blob,
    bytes: finalBytes,
    width,
    height
  };
}
