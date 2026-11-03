/**
 * Native Canvas Format Encoders (PNG, JPEG, WebP, AVIF)
 */

export type NativeSupportedFormat = 'png' | 'jpeg' | 'webp' | 'avif';

export const NATIVE_MIME_TYPES: Record<NativeSupportedFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif'
};

/**
 * Encodes a canvas to a native browser-supported image format Blob
 */
export async function encodeNative(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  format: NativeSupportedFormat,
  quality?: number
): Promise<Blob> {
  const mimeType = NATIVE_MIME_TYPES[format];
  if (!mimeType) throw new Error(`Unsupported native format: ${format}`);

  // Sanitize quality parameter (clamped 0.01 to 1.0)
  let q: number | undefined;
  if (format !== 'png' && typeof quality === 'number' && Number.isFinite(quality)) {
    q = Math.max(0.01, Math.min(1.0, quality));
  }

  // Handle OffscreenCanvas
  if ('convertToBlob' in canvas) {
    try {
      const blob = await (canvas as OffscreenCanvas).convertToBlob({
        type: mimeType,
        quality: q
      });
      if (blob.type === mimeType) return blob;
      throw new Error(`Browser cannot encode ${mimeType}`);
    } catch (err) {
      // Fallback for AVIF if browser engine does not support AVIF encoding
      if (format === 'avif') {
        const { encodeAvif } = await import('./avif');
        return encodeAvif(canvas, q);
      }
      throw err;
    }
  }

  // Handle HTMLCanvasElement
  if ('toBlob' in canvas) {
    return new Promise((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (blob) => {
          if (blob) {
            // Check if AVIF fallback is needed (some browsers return empty or fallback to PNG)
            if (format === 'avif' && blob.type !== 'image/avif') {
              import('./avif').then(({ encodeAvif }) => encodeAvif(canvas, q)).then(resolve, reject);
              return;
            }
            if (blob.type === mimeType) resolve(blob);
            else reject(new Error(`Browser cannot encode ${mimeType}; refusing a different format`));
          } else {
            if (format === 'avif') import('./avif').then(({ encodeAvif }) => encodeAvif(canvas, q)).then(resolve, reject);
            else reject(new Error(`Failed to encode canvas to ${mimeType}`));
          }
        },
        mimeType,
        q
      );
    });
  }

  throw new Error('Canvas toBlob / convertToBlob is not supported');
}
