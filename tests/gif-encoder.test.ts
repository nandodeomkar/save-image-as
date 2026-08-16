import { describe, it, expect } from 'vitest';
import { encodeGif } from '../src/offscreen/encoders/gif';
import { MockImageData } from './setup';

describe('Pure-JS GIF Encoder', () => {
  it('encodes ImageData into a valid GIF89a file', () => {
    const imgData = new MockImageData(4, 4) as unknown as ImageData;
    // Fill with sample pixels
    for (let i = 0; i < 16; i++) {
      imgData.data[i * 4] = (i * 15) % 255;
      imgData.data[i * 4 + 1] = (i * 25) % 255;
      imgData.data[i * 4 + 2] = (i * 35) % 255;
      imgData.data[i * 4 + 3] = 255;
    }

    const result = encodeGif(imgData);

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(result.blob.type).toBe('image/gif');

    const bytes = result.bytes;
    expect(bytes.length).toBeGreaterThan(10);

    // Check GIF header (GIF89a or GIF87a)
    const header = String.fromCharCode(...bytes.subarray(0, 6));
    expect(header).toMatch(/^GIF8[79]a/);

    // Check width and height in Logical Screen Descriptor (bytes 6-9)
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint16(6, true)).toBe(4);
    expect(view.getUint16(8, true)).toBe(4);
  });

  it('encodes image with transparent pixels', () => {
    const imgData = new MockImageData(2, 2) as unknown as ImageData;
    // Pixel 0: opaque red
    imgData.data[0] = 255; imgData.data[1] = 0; imgData.data[2] = 0; imgData.data[3] = 255;
    // Pixel 1: transparent
    imgData.data[4] = 0; imgData.data[5] = 0; imgData.data[6] = 0; imgData.data[7] = 0;
    // Pixel 2: opaque blue
    imgData.data[8] = 0; imgData.data[9] = 0; imgData.data[10] = 255; imgData.data[11] = 255;
    // Pixel 3: semi-transparent (alpha < 128)
    imgData.data[12] = 100; imgData.data[13] = 100; imgData.data[14] = 100; imgData.data[15] = 50;

    const result = encodeGif(imgData);
    expect(result.blob.type).toBe('image/gif');
    expect(result.bytes.length).toBeGreaterThan(0);
  });
});
