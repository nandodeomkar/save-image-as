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
  const mimeType = NATIVE_MIME_TYPES[format] || 'image/png';

  // Sanitize quality parameter (clamped 0.01 to 1.0)
  let q: number | undefined;
  if (format !== 'png' && typeof quality === 'number') {
    q = Math.max(0.01, Math.min(1.0, quality));
  }

  // Handle OffscreenCanvas
  if ('convertToBlob' in canvas) {
    try {
      return await (canvas as OffscreenCanvas).convertToBlob({
        type: mimeType,
        quality: q
      });
    } catch (err) {
      // Fallback for AVIF if browser engine does not support AVIF encoding
      if (format === 'avif') {
        console.warn('[Encoders] AVIF encoding unsupported, falling back to WebP', err);
        return await (canvas as OffscreenCanvas).convertToBlob({
          type: 'image/webp',
          quality: q
        });
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
              console.warn('[Encoders] AVIF fallback triggered, using WebP');
              (canvas as HTMLCanvasElement).toBlob(
                (fallbackBlob) => {
                  if (fallbackBlob) resolve(fallbackBlob);
                  else resolve(blob);
                },
                'image/webp',
                q
              );
              return;
            }
            resolve(blob);
          } else {
            reject(new Error(`Failed to encode canvas to ${mimeType}`));
          }
        },
        mimeType,
        q
      );
    });
  }

  throw new Error('Canvas toBlob / convertToBlob is not supported');
}
