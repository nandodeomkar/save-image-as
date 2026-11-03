import createEncoder, { type AVIFModule } from '@jsquash/avif/codec/enc/avif_enc.js';
import { defaultOptions } from '@jsquash/avif/meta.js';
import wasmUrl from '@jsquash/avif/codec/enc/avif_enc.wasm?url';

let encoder: Promise<AVIFModule> | undefined;

/** Single-threaded packaged codec: no CDN, workers, or cross-origin isolation needed. */
export async function encodeAvif(canvas: HTMLCanvasElement | OffscreenCanvas, quality?: number): Promise<Blob> {
  if (!encoder) {
    encoder = Promise.resolve(createEncoder({ locateFile: () => wasmUrl })).catch(error => {
      encoder = undefined;
      throw error;
    });
  }
  const module = await encoder;
  const context = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!context) throw new Error('Cannot read canvas pixels for AVIF encoding');
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const bytes = module.encode(image.data, image.width, image.height, {
    ...defaultOptions, quality: Math.round((quality ?? 0.85) * 100), speed: 8
  });
  if (!bytes) throw new Error('AVIF encoding failed');
  return new Blob([new Uint8Array(bytes)], { type: 'image/avif' });
}
