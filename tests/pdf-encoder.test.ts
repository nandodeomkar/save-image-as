import { describe, it, expect } from 'vitest';
import { encodePdf } from '../src/offscreen/encoders/pdf';

describe('Single-Image PDF Encoder', () => {
  it('generates a valid PDF document with %PDF- header', async () => {
    const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const result = await encodePdf(mockDataUrl, 800, 600);

    expect(result.blob.type).toBe('application/pdf');
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.bytes.byteLength).toBeGreaterThan(100);

    // Convert first 10 bytes to string and check %PDF- magic
    const headerStr = String.fromCharCode(...result.bytes.subarray(0, 8));
    expect(headerStr).toContain('%PDF-');
  });

  it('generates portrait PDF when height exceeds width', async () => {
    const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const result = await encodePdf(mockDataUrl, 400, 800);

    expect(result.width).toBe(400);
    expect(result.height).toBe(800);
    expect(result.blob.type).toBe('application/pdf');
  });
});
