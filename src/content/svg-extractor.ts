/**
 * Inline SVG Extractor & XML Serializer
 * Detects SVG elements, navigates from child vector paths to the root <svg>,
 * ensures valid XML namespaces, extracts intrinsic dimensions, and serializes clean SVG markup.
 */

export interface SvgExtractionResult {
  svgContent: string;
  width?: number;
  height?: number;
  viewBox?: string;
}

/**
 * Checks if an element is an SVG element or resides inside an SVG tree.
 */
export function isSvgElement(element: Element | null | undefined): boolean {
  if (!element) return false;
  return (
    element.tagName.toLowerCase() === 'svg' ||
    Boolean(element.closest && element.closest('svg')) ||
    element.namespaceURI === 'http://www.w3.org/2000/svg'
  );
}

/**
 * Finds the topmost root <svg> container for a given element.
 */
export function getRootSvgElement(element: Element): SVGSVGElement | null {
  if (element.tagName.toLowerCase() === 'svg') {
    return element as SVGSVGElement;
  }
  if (element.closest) {
    const root = element.closest('svg');
    if (root) return root as SVGSVGElement;
  }
  let current: Element | null = element;
  while (current) {
    if (current.tagName.toLowerCase() === 'svg') {
      return current as SVGSVGElement;
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * Extracts and serializes inline SVG markup into valid standalone SVG XML.
 *
 * @param element Target DOM element (either <svg> or child node like <path>)
 * @returns Serialized SVG result or null if not an SVG element
 */
export function extractInlineSvg(element: Element | null | undefined): SvgExtractionResult | null {
  if (!element || !isSvgElement(element)) {
    return null;
  }

  const svgRoot = getRootSvgElement(element);
  if (!svgRoot) {
    return null;
  }

  // Clone SVG node to manipulate attributes safely
  const clone = svgRoot.cloneNode(true) as SVGSVGElement;

  // Ensure standard SVG XML namespace
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  // Ensure xlink namespace if xlink attributes exist
  const hasXlink = clone.querySelector('[*|href]') || clone.getAttribute('xmlns:xlink');
  if (hasXlink && !clone.getAttribute('xmlns:xlink')) {
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }

  // Extract dimensions and viewBox
  let width: number | undefined;
  let height: number | undefined;
  const viewBox = clone.getAttribute('viewBox') || svgRoot.getAttribute('viewBox') || undefined;

  const rawWidth = clone.getAttribute('width') || svgRoot.getAttribute('width');
  const rawHeight = clone.getAttribute('height') || svgRoot.getAttribute('height');

  if (rawWidth && !rawWidth.includes('%')) {
    const parsed = parseFloat(rawWidth);
    if (!isNaN(parsed) && parsed > 0) {
      width = parsed;
    }
  }

  if (rawHeight && !rawHeight.includes('%')) {
    const parsed = parseFloat(rawHeight);
    if (!isNaN(parsed) && parsed > 0) {
      height = parsed;
    }
  }

  // Parse viewBox fallback if width or height missing
  if ((!width || !height) && viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(parseFloat);
    if (parts.length === 4) {
      const vbWidth = parts[2];
      const vbHeight = parts[3];
      if (!width && !isNaN(vbWidth) && vbWidth > 0) width = vbWidth;
      if (!height && !isNaN(vbHeight) && vbHeight > 0) height = vbHeight;
    }
  }

  // Use getBoundingClientRect / client dimensions if still undefined
  if (!width || !height) {
    try {
      const rect = svgRoot.getBoundingClientRect();
      if (!width && rect.width > 0) width = Math.round(rect.width);
      if (!height && rect.height > 0) height = Math.round(rect.height);
    } catch {
      // ignore
    }
  }

  // Ensure clone has explicit width/height if missing but calculated
  if (width && !clone.getAttribute('width')) {
    clone.setAttribute('width', String(width));
  }
  if (height && !clone.getAttribute('height')) {
    clone.setAttribute('height', String(height));
  }

  // Serialize XML
  let svgContent = '';
  try {
    const serializer = new XMLSerializer();
    svgContent = serializer.serializeToString(clone);
  } catch {
    svgContent = clone.outerHTML || '';
  }

  // Ensure XML declaration
  if (!svgContent.startsWith('<?xml')) {
    svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n${svgContent}`;
  }

  return {
    svgContent,
    width,
    height,
    viewBox
  };
}
