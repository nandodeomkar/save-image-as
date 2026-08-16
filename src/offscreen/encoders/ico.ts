/**
 * Windows Multi-Resolution ICO Encoder
 * Packages multiple PNG sub-images (16x16, 32x32, 48x48, 256x256) into a standard .ico container
 */

import { createCanvas } from '../canvas-renderer';

export interface IcoEncodeOptions {
  sizes?: number[]; // Default: [16, 32, 48, 256]
}

export interface IcoEncodeResult {
  blob: Blob;
  bytes: Uint8Array;
  sizes: number[];
}

/**
 * Convert a canvas or sub-image into PNG Uint8Array bytes
 */
async function canvasToPngBytes(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<Uint8Array> {
  if ('convertToBlob' in canvas) {
    const blob = await (canvas as OffscreenCanvas).convertToBlob({ type: 'image/png' });
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  } else if ('toBlob' in canvas) {
    const blob = await new Promise<Blob>((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to convert canvas to PNG blob'));
      }, 'image/png');
    });
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  } else if ('toDataURL' in canvas) {
    const dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  throw new Error('Canvas does not support PNG extraction');
}

/**
 * Encodes a source image into a multi-resolution Windows ICO container
 */
export async function encodeIco(
  source: CanvasImageSource | HTMLCanvasElement | OffscreenCanvas,
  options?: IcoEncodeOptions
): Promise<IcoEncodeResult> {
  const targetSizes = options?.sizes || [16, 32, 48, 256];
  const pngEntries: { size: number; bytes: Uint8Array }[] = [];

  for (const size of targetSizes) {
    const { canvas, ctx } = createCanvas(size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw source scaled to icon size
    ctx.drawImage(source as any, 0, 0, size, size);

    const bytes = await canvasToPngBytes(canvas);
    pngEntries.push({ size, bytes });
  }

  const numImages = pngEntries.length;
  const headerSize = 6; // ICONDIR
  const dirEntrySize = 16; // ICONDIRENTRY per image
  const directorySize = headerSize + numImages * dirEntrySize;

  // Calculate total file size
  let totalDataSize = 0;
  for (const entry of pngEntries) {
    totalDataSize += entry.bytes.byteLength;
  }

  const totalFileSize = directorySize + totalDataSize;
  const buffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(buffer);
  const fullBytes = new Uint8Array(buffer);

  // --- ICONDIR Header (6 bytes) ---
  // Reserved (must be 0)
  view.setUint16(0, 0, true);
  // Resource Type (1 = ICO, 2 = CUR)
  view.setUint16(2, 1, true);
  // Number of images
  view.setUint16(4, numImages, true);

  // --- ICONDIRENTRY Directory (16 bytes per image) ---
  let currentImageOffset = directorySize;

  for (let i = 0; i < numImages; i++) {
    const entry = pngEntries[i];
    const entryOffset = headerSize + i * dirEntrySize;

    // Width & Height (0 represents 256px)
    const w = entry.size >= 256 ? 0 : entry.size;
    const h = entry.size >= 256 ? 0 : entry.size;

    view.setUint8(entryOffset + 0, w); // Width
    view.setUint8(entryOffset + 1, h); // Height
    view.setUint8(entryOffset + 2, 0); // Color count (0 for 256+ colors)
    view.setUint8(entryOffset + 3, 0); // Reserved
    view.setUint16(entryOffset + 4, 1, true); // Color planes (1)
    view.setUint16(entryOffset + 6, 32, true); // Bits per pixel (32)
    view.setUint32(entryOffset + 8, entry.bytes.byteLength, true); // Bytes in resource
    view.setUint32(entryOffset + 12, currentImageOffset, true); // Offset of image data

    // Copy PNG bytes into payload section
    fullBytes.set(entry.bytes, currentImageOffset);
    currentImageOffset += entry.bytes.byteLength;
  }

  const blob = new Blob([fullBytes], { type: 'image/x-icon' });

  return {
    blob,
    bytes: fullBytes,
    sizes: targetSizes
  };
}
