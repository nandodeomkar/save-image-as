import { describe, it, expect } from 'vitest';
import { encodeIco } from '../src/offscreen/encoders/ico';

describe('Windows Multi-Resolution ICO Encoder', () => {
  it('generates a valid ICO container with specified sizes', async () => {
    const mockImage = { width: 512, height: 512 } as any;
    const sizes = [16, 32, 48, 256];

    const result = await encodeIco(mockImage, { sizes });

    expect(result.sizes).toEqual(sizes);
    expect(result.blob.type).toBe('image/x-icon');

    const bytes = result.bytes;
    const view = new DataView(bytes.buffer);

    // ICONDIR Header checks
    expect(view.getUint16(0, true)).toBe(0); // Reserved
    expect(view.getUint16(2, true)).toBe(1); // Resource type 1 (ICO)
    expect(view.getUint16(4, true)).toBe(4); // 4 images

    // Check directory entries
    // Entry 0 (16px)
    expect(bytes[6]).toBe(16); // Width
    expect(bytes[7]).toBe(16); // Height
    expect(view.getUint16(10, true)).toBe(1); // Planes
    expect(view.getUint16(12, true)).toBe(32); // BPP

    // Entry 3 (256px -> 0 in ICO spec)
    const entry3Offset = 6 + 3 * 16;
    expect(bytes[entry3Offset + 0]).toBe(0); // 256 is encoded as 0
    expect(bytes[entry3Offset + 1]).toBe(0);

    // Verify offsets are sequential and inside buffer
    for (let i = 0; i < 4; i++) {
      const entryOff = 6 + i * 16;
      const dataLen = view.getUint32(entryOff + 8, true);
      const dataOffset = view.getUint32(entryOff + 12, true);

      expect(dataLen).toBeGreaterThan(0);
      expect(dataOffset).toBeGreaterThanOrEqual(6 + 4 * 16);
      expect(dataOffset + dataLen).toBeLessThanOrEqual(bytes.length);
    }
  });
});
