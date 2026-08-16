/**
 * Filename Template Interpolator & Filesystem Sanitizer
 * Replaces token placeholders with image and page metadata,
 * sanitizes invalid OS filesystem characters and reserved device names,
 * and generates live previews for configuration settings.
 */

import { FORMAT_REGISTRY, ImageFormat, InspectElementResult } from './types';

/**
 * Invalid OS filename characters regex: / \ : * ? " < > | and control characters
 */
const INVALID_FILENAME_CHARS_REGEX = /[/\\:*?"<>|\x00-\x1f\x7f]/g;

/**
 * Windows reserved device names that cannot be used as filenames or base names
 */
const WINDOWS_RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9'
]);

/**
 * Sanitizes a string to ensure it is a valid filename across Windows, macOS, and Linux.
 */
export function sanitizeFilename(filename: string, maxLength: number = 200): string {
  if (!filename) return 'image';

  // Replace invalid characters with hyphens
  let sanitized = filename.replace(INVALID_FILENAME_CHARS_REGEX, '-');

  // Replace consecutive spaces, underscores, and hyphens with single hyphen
  sanitized = sanitized.replace(/[\s\-_]+/g, '-');

  // Remove leading/trailing periods, hyphens, and whitespace
  sanitized = sanitized.replace(/^[\.\-_]+|[\.\-_]+$/g, '');

  // If the sanitized name is empty after stripping, default to 'image'
  if (!sanitized) {
    sanitized = 'image';
  }

  // Check against Windows reserved device names (case-insensitive)
  if (WINDOWS_RESERVED_NAMES.has(sanitized.toUpperCase())) {
    sanitized = `${sanitized}-file`;
  }

  // Truncate length if excessively long, leaving room for extensions
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).replace(/[\.\-_]+$/, '');
  }

  return sanitized || 'image';
}

/**
 * Extracts the base filename from an image URL or fallback string.
 */
export function extractBaseName(url?: string, fallbackAlt?: string, fallbackTitle?: string): string {
  if (url && !url.startsWith('data:') && !url.startsWith('blob:')) {
    try {
      const parsed = new URL(url, 'https://example.com');
      const pathname = parsed.pathname;
      const lastSlash = pathname.lastIndexOf('/');
      if (lastSlash !== -1) {
        const rawFilename = pathname.substring(lastSlash + 1);
        const lastDot = rawFilename.lastIndexOf('.');
        const base = lastDot !== -1 ? rawFilename.substring(0, lastDot) : rawFilename;
        if (base && base.trim()) {
          return sanitizeFilename(decodeURIComponent(base.trim()));
        }
      }
    } catch {
      // ignore
    }
  }

  if (fallbackAlt && fallbackAlt.trim()) {
    return sanitizeFilename(fallbackAlt.trim());
  }

  if (fallbackTitle && fallbackTitle.trim()) {
    return sanitizeFilename(fallbackTitle.trim());
  }

  return 'image';
}

/**
 * Formats a filename according to the user's template pattern.
 * Supported tokens (case-insensitive):
 * - [name]: Base image filename or alt/title fallback
 * - [ext]: Target file extension (e.g. jpg, png)
 * - [page-title]: Sanitized webpage title
 * - [domain]: Webpage hostname / domain
 * - [date]: Current date (YYYY-MM-DD)
 * - [year]: Current year (YYYY)
 * - [month]: Current month (MM)
 * - [day]: Current day of month (DD)
 * - [timestamp]: Unix timestamp in milliseconds
 * - [width]: Image intrinsic width (if known)
 * - [height]: Image intrinsic height (if known)
 * - [dimensions]: Combined dimensions (e.g. 1920x1080)
 *
 * @param template Filename template string (e.g. '[name].[ext]' or '[domain]-[name].[ext]')
 * @param metadata Image inspection metadata
 * @param targetFormat Target image format
 */
export function formatFilename(
  template: string | undefined,
  metadata: Partial<InspectElementResult>,
  targetFormat: ImageFormat
): string {
  const pattern = template && template.trim() ? template.trim() : '[name].[ext]';
  const formatInfo = FORMAT_REGISTRY[targetFormat] || FORMAT_REGISTRY.png;
  const ext = formatInfo.extension;

  const baseName = extractBaseName(metadata.url, metadata.altText, metadata.pageTitle);
  const pageTitle = sanitizeFilename(metadata.pageTitle || 'page', 50);
  const domain = sanitizeFilename(metadata.pageDomain || 'web', 50);

  const now = new Date();
  const yearStr = String(now.getFullYear());
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const dayStr = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
  const timestampStr = String(now.getTime());

  const widthStr = metadata.naturalWidth ? String(metadata.naturalWidth) : '';
  const heightStr = metadata.naturalHeight ? String(metadata.naturalHeight) : '';
  const dimensionsStr =
    metadata.naturalWidth && metadata.naturalHeight
      ? `${metadata.naturalWidth}x${metadata.naturalHeight}`
      : '';

  let result = pattern
    .replace(/\[name\]/gi, baseName)
    .replace(/\[ext\]/gi, ext)
    .replace(/\[page-title\]/gi, pageTitle)
    .replace(/\[domain\]/gi, domain)
    .replace(/\[date\]/gi, dateStr)
    .replace(/\[year\]/gi, yearStr)
    .replace(/\[month\]/gi, monthStr)
    .replace(/\[day\]/gi, dayStr)
    .replace(/\[timestamp\]/gi, timestampStr)
    .replace(/\[dimensions\]/gi, dimensionsStr)
    .replace(/\[width\]/gi, widthStr)
    .replace(/\[height\]/gi, heightStr);

  // If extension is not included in template, append it automatically
  if (!result.toLowerCase().endsWith(`.${ext}`)) {
    result = `${result}.${ext}`;
  }

  // Ensure base name is sanitized and length is capped
  const lastDot = result.lastIndexOf('.');
  const namePart = result.substring(0, lastDot);
  const extPart = result.substring(lastDot + 1);

  const sanitizedName = sanitizeFilename(namePart, 200);

  return `${sanitizedName}.${extPart}`;
}

/**
 * Generates a live sample filename preview for the settings interface.
 */
export function previewFilename(
  template: string | undefined,
  sampleMetadata?: Partial<InspectElementResult>,
  targetFormat: ImageFormat = 'png'
): string {
  const sample: Partial<InspectElementResult> = {
    url: 'https://example.com/assets/photos/sample-nature-wallpaper.jpg',
    altText: 'Scenic Mountain Landscape',
    pageTitle: 'Free Wallpaper Gallery',
    pageDomain: 'wallpapers.example.com',
    naturalWidth: 1920,
    naturalHeight: 1080,
    ...sampleMetadata
  };

  return formatFilename(template, sample, targetFormat);
}
