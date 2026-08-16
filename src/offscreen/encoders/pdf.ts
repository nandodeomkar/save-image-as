/**
 * Client-Side Single-Image PDF Encoder
 * Wraps an image into a clean single-page PDF document matching aspect ratio
 */

import { jsPDF } from 'jspdf';

export interface PdfEncodeOptions {
  margin?: number; // margin in points (default: 0 for edge-to-edge)
}

export interface PdfEncodeResult {
  blob: Blob;
  bytes: Uint8Array;
  width: number;
  height: number;
}

/**
 * Encodes an image canvas or data URL into a single-page PDF document
 */
export async function encodePdf(
  canvasOrDataUrl: HTMLCanvasElement | OffscreenCanvas | string,
  width?: number,
  height?: number,
  options?: PdfEncodeOptions
): Promise<PdfEncodeResult> {
  let dataUrl: string;
  let imgWidth = width || 800;
  let imgHeight = height || 600;

  if (typeof canvasOrDataUrl === 'string') {
    dataUrl = canvasOrDataUrl;
  } else {
    imgWidth = (canvasOrDataUrl as any).width || imgWidth;
    imgHeight = (canvasOrDataUrl as any).height || imgHeight;
    if ('toDataURL' in canvasOrDataUrl) {
      dataUrl = (canvasOrDataUrl as HTMLCanvasElement).toDataURL('image/png');
    } else {
      // OffscreenCanvas
      const blob = await (canvasOrDataUrl as OffscreenCanvas).convertToBlob({ type: 'image/png' });
      const buffer = await blob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      dataUrl = `data:image/png;base64,${btoa(binary)}`;
    }
  }

  const margin = options?.margin || 0;
  const orientation = imgWidth >= imgHeight ? 'landscape' : 'portrait';

  // Create PDF with custom page size matching the image dimensions + margin
  const pageWidth = imgWidth + margin * 2;
  const pageHeight = imgHeight + margin * 2;

  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: [pageWidth, pageHeight],
    compress: true
  });

  const imgFormat = dataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
  doc.addImage(dataUrl, imgFormat, margin, margin, imgWidth, imgHeight);

  const arrayBuffer = doc.output('arraybuffer');
  const bytes = new Uint8Array(arrayBuffer);
  const blob = new Blob([bytes], { type: 'application/pdf' });

  return {
    blob,
    bytes,
    width: pageWidth,
    height: pageHeight
  };
}
