/**
 * SVG Format Encoder & Passthrough Serializer
 */

import { parseSvg } from '../svg-loader';

export interface SvgEncodeResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Encodes SVG markup or wraps raster image in SVG container
 */
export function encodeSvg(
  source: string,
  isSvgMarkup: boolean,
  width = 800,
  height = 600
): SvgEncodeResult {
  let finalSvg: string;
  let finalWidth = width;
  let finalHeight = height;

  if (isSvgMarkup) {
    const parsed = parseSvg(source);
    finalSvg = parsed.svgString;
    finalWidth = parsed.width;
    finalHeight = parsed.height;
  } else {
    // Wrap raster image into standalone SVG container
    finalSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" xlink:href="${source}" href="${source}"/>
</svg>`;
  }

  // Prepend XML declaration if not present
  if (!finalSvg.startsWith('<?xml')) {
    finalSvg = `<?xml version="1.0" encoding="UTF-8"?>\n${finalSvg}`;
  }

  const blob = new Blob([finalSvg], { type: 'image/svg+xml' });
  const base64 = btoa(unescape(encodeURIComponent(finalSvg)));
  const dataUrl = `data:image/svg+xml;base64,${base64}`;

  return {
    blob,
    dataUrl,
    width: finalWidth,
    height: finalHeight
  };
}
