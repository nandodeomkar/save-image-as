/**
 * SVG Parsing and Rasterization Utility
 */

export interface SvgViewBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface SvgInfo {
  svgString: string;
  width: number;
  height: number;
  viewBox?: SvgViewBox;
  aspectRatio: number;
}

/**
 * Parse SVG attributes (width, height, viewBox) and sanitize SVG markup
 */
export function parseSvg(svgString: string): SvgInfo {
  const trimmed = svgString.trim();

  // Extract viewBox
  let viewBox: SvgViewBox | undefined;
  const viewBoxMatch = trimmed.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => !isNaN(n) && isFinite(n))) {
      viewBox = {
        minX: parts[0],
        minY: parts[1],
        width: Math.max(1, parts[2]),
        height: Math.max(1, parts[3])
      };
    }
  }

  // Extract width and height attributes
  let width: number | undefined;
  let height: number | undefined;

  const widthMatch = trimmed.match(/(?:^|\s)width\s*=\s*["']([^"']+)["']/i);
  if (widthMatch) {
    const val = parseFloat(widthMatch[1]);
    if (!isNaN(val) && val > 0) {
      width = val;
    }
  }

  const heightMatch = trimmed.match(/(?:^|\s)height\s*=\s*["']([^"']+)["']/i);
  if (heightMatch) {
    const val = parseFloat(heightMatch[1]);
    if (!isNaN(val) && val > 0) {
      height = val;
    }
  }

  // Derive width and height if missing
  if (!width && !height) {
    if (viewBox) {
      width = viewBox.width;
      height = viewBox.height;
    } else {
      width = 800;
      height = 800;
    }
  } else if (!width && height) {
    if (viewBox) {
      width = Math.round((height * viewBox.width) / viewBox.height);
    } else {
      width = height;
    }
  } else if (width && !height) {
    if (viewBox) {
      height = Math.round((width * viewBox.height) / viewBox.width);
    } else {
      height = width;
    }
  }

  const finalWidth = Math.max(1, Math.round(width!));
  const finalHeight = Math.max(1, Math.round(height!));
  const aspectRatio = finalWidth / finalHeight;

  // Ensure XML namespace exists
  let sanitizedSvg = trimmed;
  if (!/xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(sanitizedSvg)) {
    sanitizedSvg = sanitizedSvg.replace(/<svg\b([^>]*)>/i, '<svg xmlns="http://www.w3.org/2000/svg" $1>');
  }

  // Ensure width and height or viewBox are declared on the root SVG element
  if (!/viewBox\s*=/i.test(sanitizedSvg) && viewBox) {
    sanitizedSvg = sanitizedSvg.replace(
      /<svg\b([^>]*)>/i,
      `<svg viewBox="${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}" $1>`
    );
  }

  return {
    svgString: sanitizedSvg,
    width: finalWidth,
    height: finalHeight,
    viewBox,
    aspectRatio
  };
}

/**
 * Rasterize SVG markup into an HTMLImageElement or ImageBitmap
 */
export async function rasterizeSvg(
  svgString: string,
  targetWidth?: number,
  targetHeight?: number
): Promise<{ element: HTMLImageElement; width: number; height: number; cleanup: () => void }> {
  const parsed = parseSvg(svgString);
  const width = targetWidth && targetWidth > 0 ? targetWidth : parsed.width;
  const height = targetHeight && targetHeight > 0 ? targetHeight : parsed.height;

  // Insert explicit width and height if needed
  let rasterSvg = parsed.svgString;
  if (!/(?:^|\s)width\s*=/i.test(rasterSvg)) {
    rasterSvg = rasterSvg.replace(/<svg\b([^>]*)>/i, `<svg width="${width}" height="${height}" $1>`);
  }

  const blob = new Blob([rasterSvg], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const cleanup = () => {
      URL.revokeObjectURL(blobUrl);
    };

    img.onload = () => {
      resolve({
        element: img,
        width,
        height,
        cleanup
      });
    };

    img.onerror = (err) => {
      cleanup();
      reject(new Error(`Failed to rasterize SVG: ${err}`));
    };

    img.src = blobUrl;
  });
}
