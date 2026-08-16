/**
 * DOM Element Inspector
 * High-precision inspection engine to detect and extract highest-resolution images,
 * responsive picture sources, CSS background images, SVG vectors, and Canvas graphics.
 */

import { InspectElementResult } from '../utils/types';
import { getHighestResolutionCandidate, parseSrcset } from './srcset-parser';
import { extractCssBackgroundImage } from './css-background';
import { extractInlineSvg, isSvgElement } from './svg-extractor';
import { extractCanvasData, isCanvasElement } from './canvas-extractor';

/**
 * Common image file extensions for link checking
 */
const IMAGE_EXTENSIONS_REGEX = /\.(png|jpe?g|webp|avif|gif|bmp|ico|svg)(\?.*)?$/i;

/**
 * Inspects a target DOM element and returns a structured InspectElementResult.
 *
 * @param target The DOM element clicked or hovered
 * @param clickCoords Optional coordinates (x, y) to check for underlying elements
 * @returns Structured InspectElementResult or null if no valid image detected
 */
export function inspectElement(
  target: Element | null | undefined,
  clickCoords?: { clientX: number; clientY: number }
): InspectElementResult | null {
  if (!target) {
    return null;
  }

  const pageTitle = document.title || '';
  const pageUrl = window.location.href;
  const pageDomain = window.location.hostname;
  const baseUrl = document.baseURI || window.location.href;

  // 1. Direct SVG check (including child paths, rects, groups)
  if (isSvgElement(target)) {
    const svgResult = extractInlineSvg(target);
    if (svgResult && svgResult.svgContent) {
      return {
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgResult.svgContent)}`,
        elementType: 'svg-inline',
        naturalWidth: svgResult.width,
        naturalHeight: svgResult.height,
        pageTitle,
        pageUrl,
        pageDomain,
        svgContent: svgResult.svgContent
      };
    }
  }

  // 2. Direct Canvas check
  if (isCanvasElement(target)) {
    const canvasResult = extractCanvasData(target);
    if (canvasResult) {
      return {
        url: canvasResult.dataUrl,
        elementType: 'canvas',
        naturalWidth: canvasResult.width,
        naturalHeight: canvasResult.height,
        pageTitle,
        pageUrl,
        pageDomain,
        canvasDataUrl: canvasResult.dataUrl
      };
    }
  }

  // 3. <picture> element or element inside <picture>
  const pictureParent = target.tagName.toLowerCase() === 'picture' ? target : target.closest('picture');
  if (pictureParent) {
    const imgChild = pictureParent.querySelector('img');
    if (imgChild) {
      return inspectPictureElement(
        pictureParent as HTMLElement,
        imgChild,
        pageTitle,
        pageUrl,
        pageDomain,
        baseUrl
      );
    }
  }

  // 4. Direct <img> element
  if (target.tagName.toLowerCase() === 'img') {
    return inspectImgElement(target as HTMLImageElement, pageTitle, pageUrl, pageDomain, baseUrl);
  }

  // 5. Check if target contains child <img>, <svg>, or <canvas>
  const childImg = target.querySelector('img');
  if (childImg) {
    return inspectImgElement(childImg, pageTitle, pageUrl, pageDomain, baseUrl);
  }

  const childSvg = target.querySelector('svg');
  if (childSvg) {
    const svgResult = extractInlineSvg(childSvg);
    if (svgResult && svgResult.svgContent) {
      return {
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgResult.svgContent)}`,
        elementType: 'svg-inline',
        naturalWidth: svgResult.width,
        naturalHeight: svgResult.height,
        pageTitle,
        pageUrl,
        pageDomain,
        svgContent: svgResult.svgContent
      };
    }
  }

  const childCanvas = target.querySelector('canvas');
  if (childCanvas) {
    const canvasResult = extractCanvasData(childCanvas);
    if (canvasResult) {
      return {
        url: canvasResult.dataUrl,
        elementType: 'canvas',
        naturalWidth: canvasResult.width,
        naturalHeight: canvasResult.height,
        pageTitle,
        pageUrl,
        pageDomain,
        canvasDataUrl: canvasResult.dataUrl
      };
    }
  }

  // 6. Direct <video> poster image
  if (target.tagName.toLowerCase() === 'video') {
    const video = target as HTMLVideoElement;
    const poster = video.poster || video.getAttribute('poster');
    if (poster) {
      const resolvedPoster = resolveUrl(poster, baseUrl);
      return {
        url: resolvedPoster,
        elementType: 'video-poster',
        naturalWidth: video.videoWidth || undefined,
        naturalHeight: video.videoHeight || undefined,
        pageTitle,
        pageUrl,
        pageDomain
      };
    }
  }

  // 7. Check if under a transparent overlay via elementsFromPoint
  if (clickCoords && typeof document.elementsFromPoint === 'function') {
    const elements = document.elementsFromPoint(clickCoords.clientX, clickCoords.clientY);
    for (const el of elements) {
      if (el === target) continue;
      if (el.tagName.toLowerCase() === 'img') {
        return inspectImgElement(el as HTMLImageElement, pageTitle, pageUrl, pageDomain, baseUrl);
      }
      if (isSvgElement(el)) {
        const svgRes = extractInlineSvg(el);
        if (svgRes) {
          return {
            url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgRes.svgContent)}`,
            elementType: 'svg-inline',
            naturalWidth: svgRes.width,
            naturalHeight: svgRes.height,
            pageTitle,
            pageUrl,
            pageDomain,
            svgContent: svgRes.svgContent
          };
        }
      }
    }
  }

  // 8. CSS Background Image (element, pseudo-elements, or ancestors)
  const bgUrl = extractCssBackgroundImage(target);
  if (bgUrl) {
    return {
      url: bgUrl,
      elementType: 'css-background',
      pageTitle,
      pageUrl,
      pageDomain
    };
  }

  // 9. Check <a> link target pointing to an image
  const link = target.closest('a');
  if (link && link.href && IMAGE_EXTENSIONS_REGEX.test(link.href)) {
    return {
      url: link.href,
      elementType: 'link-image',
      altText: link.textContent?.trim() || link.getAttribute('title') || '',
      pageTitle,
      pageUrl,
      pageDomain
    };
  }

  return null;
}

/**
 * Inspects a standard <img> element and picks the highest resolution source.
 */
function inspectImgElement(
  img: HTMLImageElement,
  pageTitle: string,
  pageUrl: string,
  pageDomain: string,
  baseUrl: string
): InspectElementResult {
  const srcset = img.getAttribute('srcset');
  const currentSrc = img.currentSrc || img.src || img.getAttribute('src') || '';
  const fallback = resolveUrl(currentSrc, baseUrl);

  const bestUrl = getHighestResolutionCandidate(srcset, fallback, baseUrl);
  const altText = img.alt || img.getAttribute('aria-label') || img.getAttribute('title') || '';

  return {
    url: bestUrl || fallback,
    elementType: 'img',
    naturalWidth: img.naturalWidth || img.width || undefined,
    naturalHeight: img.naturalHeight || img.height || undefined,
    altText,
    pageTitle,
    pageUrl,
    pageDomain
  };
}

/**
 * Inspects a <picture> element and its child <source> elements for highest resolution.
 */
function inspectPictureElement(
  picture: HTMLElement,
  img: HTMLImageElement,
  pageTitle: string,
  pageUrl: string,
  pageDomain: string,
  baseUrl: string
): InspectElementResult {
  const sources = Array.from(picture.querySelectorAll('source'));
  const allCandidates: Array<{ url: string; effectiveWidth: number }> = [];

  for (const source of sources) {
    const srcset = source.getAttribute('srcset');
    if (srcset) {
      allCandidates.push(...parseSrcset(srcset, baseUrl));
    }
  }

  const imgSrcset = img.getAttribute('srcset');
  if (imgSrcset) {
    allCandidates.push(...parseSrcset(imgSrcset, baseUrl));
  }

  // Sort descending by resolution/effective width
  allCandidates.sort((a, b) => b.effectiveWidth - a.effectiveWidth);

  const currentSrc = img.currentSrc || img.src || img.getAttribute('src') || '';
  const fallback = resolveUrl(currentSrc, baseUrl);
  const bestUrl = allCandidates[0]?.url || fallback;
  const altText = img.alt || img.getAttribute('aria-label') || img.getAttribute('title') || '';

  return {
    url: bestUrl,
    elementType: 'picture',
    naturalWidth: img.naturalWidth || img.width || undefined,
    naturalHeight: img.naturalHeight || img.height || undefined,
    altText,
    pageTitle,
    pageUrl,
    pageDomain
  };
}

/**
 * Safely resolves relative URLs against document base URI.
 */
function resolveUrl(url: string, baseUrl: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}
