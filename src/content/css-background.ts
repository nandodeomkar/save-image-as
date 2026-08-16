/**
 * CSS Background Image Extractor
 * Inspects computed styles of elements, pseudo-elements (::before, ::after),
 * and parent containers to extract CSS background image URLs.
 */

/**
 * Extracts the primary image URL from a CSS backgroundImage property value.
 * Strips gradients (linear-gradient, radial-gradient) and returns the first valid url(...).
 *
 * @param bgValue The computed backgroundImage string (e.g. 'url("https://example.com/hero.jpg")')
 * @param baseUrl Optional base URL to resolve relative URLs against
 */
export function parseBackgroundImageValue(bgValue: string | null | undefined, baseUrl?: string): string | null {
  if (!bgValue || typeof bgValue !== 'string') {
    return null;
  }

  const trimmed = bgValue.trim();
  if (!trimmed || trimmed === 'none' || trimmed === 'initial' || trimmed === 'inherit') {
    return null;
  }

  // Regex to extract url(...) contents, handling single, double, or unquoted URLs
  // Ignores gradient functions
  const urlRegex = /url\(\s*(?:'(.*?)'|"(.*?)"|([^'")]+?))\s*\)/i;
  const match = trimmed.match(urlRegex);

  if (!match) {
    return null;
  }

  // Captured group 1, 2, or 3 depending on quotation
  const rawUrl = (match[1] || match[2] || match[3] || '').trim();
  if (!rawUrl) {
    return null;
  }

  // Ignore data: URLs that are not images (or return valid data URLs)
  if (rawUrl.startsWith('data:') && !rawUrl.startsWith('data:image/')) {
    return null;
  }

  // Resolve relative URLs against baseUrl or document.baseURI
  if (baseUrl && !rawUrl.startsWith('data:') && !rawUrl.startsWith('blob:')) {
    try {
      return new URL(rawUrl, baseUrl).href;
    } catch {
      return rawUrl;
    }
  }

  return rawUrl;
}

/**
 * Inspects an element, its pseudo-elements (::before, ::after), and its immediate parent hierarchy
 * to locate any CSS background-image.
 *
 * @param element The target DOM element
 * @param maxDepth Maximum parent traversal depth (default: 4)
 * @returns Extracted background image URL or null
 */
export function extractCssBackgroundImage(
  element: Element | null | undefined,
  maxDepth = 4
): string | null {
  if (!element || !(element instanceof Element)) {
    return null;
  }

  const baseUrl = (element.ownerDocument && element.ownerDocument.baseURI) || window.location.href;

  let current: Element | null = element;
  let depth = 0;

  while (current && depth <= maxDepth) {
    try {
      const computedStyle = window.getComputedStyle(current);

      // 1. Direct background-image on element
      const directBg = parseBackgroundImageValue(computedStyle.backgroundImage, baseUrl);
      if (directBg) {
        return directBg;
      }

      // 2. Pseudo-element ::before (in standard browser environment)
      try {
        if (typeof window.getComputedStyle === 'function' && !navigator.userAgent?.includes('jsdom')) {
          const beforeStyle = window.getComputedStyle(current, '::before');
          const beforeBg = parseBackgroundImageValue(beforeStyle?.backgroundImage, baseUrl);
          if (beforeBg) {
            return beforeBg;
          }

          // 3. Pseudo-element ::after
          const afterStyle = window.getComputedStyle(current, '::after');
          const afterBg = parseBackgroundImageValue(afterStyle?.backgroundImage, baseUrl);
          if (afterBg) {
            return afterBg;
          }
        }
      } catch {
        // Ignore pseudo-element reading errors
      }
    } catch (e) {
      // In case getComputedStyle fails in edge-case environments
      console.warn('[CssBackground] Failed to read computed style:', e);
    }

    current = current.parentElement;
    depth++;
  }

  return null;
}
