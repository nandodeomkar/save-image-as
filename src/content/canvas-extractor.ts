/**
 * HTML5 Canvas Extractor
 * Captures image data from <canvas> elements as high-resolution PNG data URLs.
 */

export interface CanvasExtractionResult {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Checks if an element is an HTMLCanvasElement.
 */
export function isCanvasElement(element: Element | null | undefined): element is HTMLCanvasElement {
  if (!element) return false;
  return element.tagName.toLowerCase() === 'canvas' || element instanceof HTMLCanvasElement;
}

/**
 * Extracts PNG data URL and dimensions from an HTML5 <canvas> element.
 * Handles tainted canvas security errors gracefully.
 *
 * @param element Target DOM element
 * @returns Canvas extraction result or null if not a canvas or cannot be read
 */
export function extractCanvasData(
  element: Element | null | undefined
): CanvasExtractionResult | null {
  if (!element) {
    return null;
  }

  let canvas: HTMLCanvasElement | null = null;
  if (isCanvasElement(element)) {
    canvas = element;
  } else if (element.querySelector) {
    canvas = element.querySelector('canvas');
  }

  if (!canvas) {
    return null;
  }

  const width = canvas.width || canvas.clientWidth || 300;
  const height = canvas.height || canvas.clientHeight || 150;

  try {
    const dataUrl = canvas.toDataURL('image/png');
    return {
      dataUrl,
      width,
      height
    };
  } catch (err) {
    console.warn('[CanvasExtractor] Failed to extract canvas data (possibly tainted canvas):', err);
    return null;
  }
}
