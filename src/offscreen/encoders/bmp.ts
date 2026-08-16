/**
 * Pure-JS Windows Bitmap (BMP) Binary Encoder
 * Generates valid 24-bit RGB or 32-bit RGBA uncompressed BMP files from ImageData
 */

export interface BmpEncodeOptions {
  bitsPerPixel?: 24 | 32;
}

export interface BmpEncodeResult {
  blob: Blob;
  bytes: Uint8Array;
  width: number;
  height: number;
}

/**
 * Encodes ImageData (RGBA) into standard Windows BMP binary buffer and Blob
 */
export function encodeBmp(imageData: ImageData, options?: BmpEncodeOptions): BmpEncodeResult {
  const width = imageData.width;
  const height = imageData.height;
  const bpp = options?.bitsPerPixel || 24;
  const bytesPerPixel = bpp / 8;

  // Calculate scanline row size with 4-byte padding
  const padding = (4 - ((width * bytesPerPixel) % 4)) % 4;
  const rowSize = width * bytesPerPixel + padding;
  const pixelArraySize = rowSize * height;

  const headerSize = 14; // BITMAPFILEHEADER
  const dibHeaderSize = 40; // BITMAPINFOHEADER
  const fileSize = headerSize + dibHeaderSize + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // --- BITMAPFILEHEADER (14 bytes) ---
  // 'BM' magic identifier (0x42, 0x4D)
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  // File size
  view.setUint32(2, fileSize, true);
  // Reserved (0)
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  // Pixel data offset
  view.setUint32(10, headerSize + dibHeaderSize, true);

  // --- BITMAPINFOHEADER (40 bytes) ---
  // Header size
  view.setUint32(14, dibHeaderSize, true);
  // Width & Height (positive height = bottom-up raster)
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  // Color planes (must be 1)
  view.setUint16(26, 1, true);
  // Bits per pixel
  view.setUint16(28, bpp, true);
  // Compression (0 = BI_RGB, uncompressed)
  view.setUint32(30, 0, true);
  // Image size (can be 0 for BI_RGB, but best practice is pixelArraySize)
  view.setUint32(34, pixelArraySize, true);
  // X & Y pixels per meter (~72 DPI = 2835 ppm)
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  // Colors in palette
  view.setUint32(46, 0, true);
  // Important colors
  view.setUint32(50, 0, true);

  // --- PIXEL DATA (Bottom-up scanlines, BGR / BGRA) ---
  const data = imageData.data;
  let offset = headerSize + dibHeaderSize;

  for (let y = height - 1; y >= 0; y--) {
    const rowStart = y * width * 4;
    for (let x = 0; x < width; x++) {
      const i = rowStart + x * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (bpp === 24) {
        // If 24-bit and pixel has transparency, composite over white
        if (a < 255) {
          const alpha = a / 255;
          const bg = 255 * (1 - alpha);
          bytes[offset++] = Math.round(b * alpha + bg); // Blue
          bytes[offset++] = Math.round(g * alpha + bg); // Green
          bytes[offset++] = Math.round(r * alpha + bg); // Red
        } else {
          bytes[offset++] = b; // Blue
          bytes[offset++] = g; // Green
          bytes[offset++] = r; // Red
        }
      } else {
        // 32-bit BGRA
        bytes[offset++] = b;
        bytes[offset++] = g;
        bytes[offset++] = r;
        bytes[offset++] = a;
      }
    }

    // Write row padding bytes
    for (let p = 0; p < padding; p++) {
      bytes[offset++] = 0;
    }
  }

  const blob = new Blob([bytes], { type: 'image/bmp' });

  return {
    blob,
    bytes,
    width,
    height
  };
}
