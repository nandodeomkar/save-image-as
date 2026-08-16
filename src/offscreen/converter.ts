/**
 * Central Image Conversion Engine for Offscreen Document
 * Dispatches conversion requests across all 9 supported formats
 */

import { ConvertImageRequestMessage, FORMAT_REGISTRY, ImageFormat } from '../utils/types';
import { loadImage, LoadedImage, uint8ArrayToDataUrl } from './image-loader';
import { renderImageToCanvas, RenderedCanvas } from './canvas-renderer';
import {
  encodeBmp,
  encodeIco,
  encodePdf,
  encodeGif,
  encodeNative,
  encodeSvg,
  NativeSupportedFormat
} from './encoders';

export interface ConversionResult {
  dataUrl: string;
  mimeType: string;
  byteLength: number;
  width: number;
  height: number;
}

/**
 * Convert a Blob to a base64 Data URL and return byte length
 */
async function blobToDataUrl(blob: Blob): Promise<{ dataUrl: string; byteLength: number }> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const dataUrl = uint8ArrayToDataUrl(bytes, blob.type);
  return {
    dataUrl,
    byteLength: bytes.byteLength
  };
}

/**
 * Main conversion orchestrator
 */
export async function convertImage(
  request: ConvertImageRequestMessage
): Promise<ConversionResult> {
  const targetFormat = request.targetFormat as ImageFormat;
  const formatInfo = FORMAT_REGISTRY[targetFormat];

  if (!formatInfo) {
    throw new Error(`Unsupported target format: ${targetFormat}`);
  }

  let loaded: LoadedImage | null = null;
  let rendered: RenderedCanvas | null = null;

  try {
    // 1. Load source image
    loaded = await loadImage(request.source);

    // 2. Route by target format
    let outputBlob: Blob;
    let outputDataUrl: string | undefined;
    let outputByteLength = 0;
    let outputWidth = loaded.width;
    let outputHeight = loaded.height;

    // --- SVG Conversion ---
    if (targetFormat === 'svg') {
      if (loaded.isSvg && loaded.rawSvg) {
        const svgRes = encodeSvg(loaded.rawSvg, true, loaded.width, loaded.height);
        outputBlob = svgRes.blob;
        outputDataUrl = svgRes.dataUrl;
        outputWidth = svgRes.width;
        outputHeight = svgRes.height;
      } else {
        // Render raster image to canvas first to obtain standard Data URL
        rendered = renderImageToCanvas(loaded, {
          backgroundColor: request.backgroundColor || null
        });
        const rasterDataUrl = rendered.toDataURL('image/png');
        const svgRes = encodeSvg(rasterDataUrl, false, rendered.width, rendered.height);
        outputBlob = svgRes.blob;
        outputDataUrl = svgRes.dataUrl;
        outputWidth = svgRes.width;
        outputHeight = svgRes.height;
      }
    }

    // --- Native Canvas Encoders (PNG, JPEG, WebP, AVIF) ---
    else if (['png', 'jpeg', 'webp', 'avif'].includes(targetFormat)) {
      // For JPEG, fill transparent alpha with solid white by default to avoid black artifacts
      const defaultBg = targetFormat === 'jpeg' ? '#FFFFFF' : null;
      const bg = request.backgroundColor !== undefined ? request.backgroundColor : defaultBg;

      rendered = renderImageToCanvas(loaded, {
        backgroundColor: bg
      });

      outputBlob = await encodeNative(
        rendered.canvas,
        targetFormat as NativeSupportedFormat,
        request.quality
      );
      outputWidth = rendered.width;
      outputHeight = rendered.height;
    }

    // --- Pure-JS BMP Encoder ---
    else if (targetFormat === 'bmp') {
      const bg = request.backgroundColor !== undefined ? request.backgroundColor : '#FFFFFF';
      rendered = renderImageToCanvas(loaded, {
        backgroundColor: bg
      });

      const bmpRes = encodeBmp(rendered.getImageData(), { bitsPerPixel: 24 });
      outputBlob = bmpRes.blob;
      outputWidth = bmpRes.width;
      outputHeight = bmpRes.height;
    }

    // --- Pure-JS GIF Encoder ---
    else if (targetFormat === 'gif') {
      rendered = renderImageToCanvas(loaded, {
        backgroundColor: request.backgroundColor || null
      });

      const gifRes = encodeGif(rendered.getImageData());
      outputBlob = gifRes.blob;
      outputWidth = gifRes.width;
      outputHeight = gifRes.height;
    }

    // --- Pure-JS Windows Multi-Resolution ICO Encoder ---
    else if (targetFormat === 'ico') {
      rendered = renderImageToCanvas(loaded, {
        backgroundColor: request.backgroundColor || null
      });

      const icoRes = await encodeIco(rendered.canvas);
      outputBlob = icoRes.blob;
      outputWidth = rendered.width;
      outputHeight = rendered.height;
    }

    // --- Single-Image PDF Encoder ---
    else if (targetFormat === 'pdf') {
      const bg = request.backgroundColor !== undefined ? request.backgroundColor : '#FFFFFF';
      rendered = renderImageToCanvas(loaded, {
        backgroundColor: bg
      });

      const pdfRes = await encodePdf(rendered.canvas, rendered.width, rendered.height);
      outputBlob = pdfRes.blob;
      outputWidth = pdfRes.width;
      outputHeight = pdfRes.height;
    }

    else {
      throw new Error(`Unhandled image format: ${targetFormat}`);
    }

    // 3. Convert output to Data URL if not already created
    if (!outputDataUrl) {
      const converted = await blobToDataUrl(outputBlob);
      outputDataUrl = converted.dataUrl;
      outputByteLength = converted.byteLength;
    } else {
      const buffer = await outputBlob.arrayBuffer();
      outputByteLength = buffer.byteLength;
    }

    return {
      dataUrl: outputDataUrl,
      mimeType: outputBlob.type || formatInfo.mimeType,
      byteLength: outputByteLength,
      width: outputWidth,
      height: outputHeight
    };
  } finally {
    // 4. Memory cleanup
    if (rendered) {
      rendered.dispose();
    }
    if (loaded) {
      loaded.cleanup();
    }
  }
}
