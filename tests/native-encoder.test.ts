import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeNative } from '../src/offscreen/encoders/native';
import { encodeAvif } from '../src/offscreen/encoders/avif';
vi.mock('../src/offscreen/encoders/avif', () => ({ encodeAvif: vi.fn() }));

describe('Native encoder MIME guarantees', () => {
  beforeEach(() => { vi.mocked(encodeAvif).mockReset(); });
  it('uses the local AVIF encoder when Canvas silently returns PNG', async () => {
    const canvas = { toBlob: vi.fn(callback => callback(new Blob(['png'], { type: 'image/png' }))) } as unknown as HTMLCanvasElement;
    vi.mocked(encodeAvif).mockResolvedValueOnce(new Blob(['avif'], { type: 'image/avif' }));
    expect((await encodeNative(canvas, 'avif', 0.7)).type).toBe('image/avif');
    expect(encodeAvif).toHaveBeenCalledWith(canvas, 0.7);
  });
  it('handles unsupported OffscreenCanvas AVIF without mislabeling a PNG', async () => {
    const canvas = { convertToBlob: vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' })) } as unknown as OffscreenCanvas;
    vi.mocked(encodeAvif).mockResolvedValueOnce(new Blob(['avif'], { type: 'image/avif' }));
    expect((await encodeNative(canvas, 'avif')).type).toBe('image/avif');
    expect(encodeAvif).toHaveBeenCalledOnce();
  });
  it('rejects mismatched non-AVIF output', async () => {
    const canvas = { convertToBlob: vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' })) } as unknown as OffscreenCanvas;
    await expect(encodeNative(canvas, 'webp')).rejects.toThrow('cannot encode');
  });
  it('clamps quality and ignores non-finite quality values', async () => {
    const convertToBlob = vi.fn().mockResolvedValue(new Blob(['jpg'], { type: 'image/jpeg' }));
    const canvas = { convertToBlob } as unknown as OffscreenCanvas;
    await encodeNative(canvas, 'jpeg', 8);
    expect(convertToBlob).toHaveBeenLastCalledWith({ type: 'image/jpeg', quality: 1 });
    await encodeNative(canvas, 'jpeg', NaN);
    expect(convertToBlob).toHaveBeenLastCalledWith({ type: 'image/jpeg', quality: undefined });
  });
});
