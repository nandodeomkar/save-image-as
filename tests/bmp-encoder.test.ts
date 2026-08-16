import { describe, it, expect } from 'vitest';
import { encodeBmp } from '../src/offscreen/encoders/bmp';
import { MockImageData } from './setup';

describe('Pure-JS BMP Encoder', () => {
  it('encodes a 2x2 image into a valid 24-bit BMP with row padding', () => {
    // 2x2 image with distinct colors
    const imgData = new MockImageData(2, 2) as unknown as ImageData;
    // Row 0 (top): Red, Green
    imgData.data[0] = 255; imgData.data[1] = 0; imgData.data[2] = 0; imgData.data[3] = 255; // Red
    imgData.data[4] = 0; imgData.data[5] = 255; imgData.data[6] = 0; imgData.data[7] = 255; // Green
    // Row 1 (bottom): Blue, White
    imgData.data[8] = 0; imgData.data[9] = 0; imgData.data[10] = 255; imgData.data[11] = 255; // Blue
    imgData.data[12] = 255; imgData.data[13] = 255; imgData.data[14] = 255; imgData.data[15] = 255; // White

    const result = encodeBmp(imgData, { bitsPerPixel: 24 });

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.blob.type).toBe('image/bmp');

    const bytes = result.bytes;
    const view = new DataView(bytes.buffer);

    // Check 'BM' magic bytes
    expect(bytes[0]).toBe(0x42); // 'B'
    expect(bytes[1]).toBe(0x4d); // 'M'

    // Check header offset = 54
    expect(view.getUint32(10, true)).toBe(54);

    // Check DIB header size = 40
    expect(view.getUint32(14, true)).toBe(40);
    // Width & Height
    expect(view.getInt32(18, true)).toBe(2);
    expect(view.getInt32(22, true)).toBe(2);
    // Planes = 1
    expect(view.getUint16(26, true)).toBe(1);
    // Bits per pixel = 24
    expect(view.getUint16(28, true)).toBe(24);

    // Row size for 2 pixels @ 24bpp: 2 * 3 = 6 bytes + 2 bytes padding = 8 bytes per row
    const row0Offset = 54; // Bottom row (Blue, White)
    // Pixel 0 (Blue) in BGR: B=255, G=0, R=0
    expect(bytes[row0Offset]).toBe(255);
    expect(bytes[row0Offset + 1]).toBe(0);
    expect(bytes[row0Offset + 2]).toBe(0);

    // Check padding bytes in row 0
    expect(bytes[row0Offset + 6]).toBe(0);
    expect(bytes[row0Offset + 7]).toBe(0);
  });

  it('encodes a 32-bit BMP preserving alpha', () => {
    const imgData = new MockImageData(1, 1) as unknown as ImageData;
    imgData.data[0] = 100;
    imgData.data[1] = 150;
    imgData.data[2] = 200;
    imgData.data[3] = 128; // Alpha

    const result = encodeBmp(imgData, { bitsPerPixel: 32 });
    const view = new DataView(result.bytes.buffer);

    expect(view.getUint16(28, true)).toBe(32);
    // Pixel data at offset 54: B, G, R, A
    expect(result.bytes[54]).toBe(200); // B
    expect(result.bytes[55]).toBe(150); // G
    expect(result.bytes[56]).toBe(100); // R
    expect(result.bytes[57]).toBe(128); // A
  });
});
