/**
 * Responsive srcset Attribute Parser & Resolution Ranker
 * Accurately parses srcset strings (including complex query strings and data URLs)
 * and extracts the highest-resolution image source candidate.
 */

export interface SrcsetCandidate {
  url: string;
  descriptor?: string;
  width?: number; // e.g. 1200 for '1200w'
  density?: number; // e.g. 2 for '2x'
  effectiveWidth: number;
}

/**
 * Parses a standard HTML srcset attribute value into structured candidates.
 * Handles URLs with commas in query parameters, data URLs, and varied whitespace.
 *
 * @param srcset Raw srcset attribute string
 * @param baseUrl Optional base URL to resolve relative URLs against
 */
export function parseSrcset(srcset: string, baseUrl?: string): SrcsetCandidate[] {
  if (!srcset || typeof srcset !== 'string') {
    return [];
  }

  const trimmed = srcset.trim();
  if (!trimmed) {
    return [];
  }

  const candidates: SrcsetCandidate[] = [];

  // Robust tokenizer: split on commas that are NOT part of data URLs or query strings
  const items = splitSrcsetEntries(trimmed);

  for (const item of items) {
    const itemTrimmed = item.trim();
    if (!itemTrimmed) continue;

    // Separate url and descriptor: descriptor is the trailing token if it matches /^\d+(\.\d+)?[wx]$/i
    const lastSpaceIdx = itemTrimmed.lastIndexOf(' ');
    let rawUrl = itemTrimmed;
    let descriptor: string | undefined;
    let width: number | undefined;
    let density: number | undefined;

    if (lastSpaceIdx !== -1) {
      const possibleDescriptor = itemTrimmed.substring(lastSpaceIdx + 1).trim();
      const possibleUrl = itemTrimmed.substring(0, lastSpaceIdx).trim();

      const widthMatch = possibleDescriptor.match(/^(\d+)w$/i);
      const densityMatch = possibleDescriptor.match(/^(\d+(?:\.\d+)?)x$/i);

      if (widthMatch) {
        rawUrl = possibleUrl;
        descriptor = possibleDescriptor;
        width = parseInt(widthMatch[1], 10);
      } else if (densityMatch) {
        rawUrl = possibleUrl;
        descriptor = possibleDescriptor;
        density = parseFloat(densityMatch[1]);
      }
    }

    if (!rawUrl) continue;

    // Resolve relative URL if baseUrl is available
    let resolvedUrl = rawUrl;
    if (baseUrl && !rawUrl.startsWith('data:') && !rawUrl.startsWith('blob:')) {
      try {
        resolvedUrl = new URL(rawUrl, baseUrl).href;
      } catch {
        resolvedUrl = rawUrl;
      }
    }

    // Determine effective score/width for comparison
    // Standard baseline assumes 1x ~ 1000px virtual width for normalized comparison
    let effectiveWidth = 1000;
    if (width !== undefined && !isNaN(width)) {
      effectiveWidth = width;
    } else if (density !== undefined && !isNaN(density)) {
      effectiveWidth = density * 1000;
    } else {
      effectiveWidth = 1000; // default 1x
    }

    candidates.push({
      url: resolvedUrl,
      descriptor,
      width,
      density: density ?? (width === undefined ? 1 : undefined),
      effectiveWidth
    });
  }

  return candidates;
}

/**
 * Splits srcset string by commas that delineate different candidates,
 * avoiding splits inside data: URLs or URLs with commas in query parameters.
 */
function splitSrcsetEntries(srcsetString: string): string[] {
  const entries: string[] = [];
  let current = '';
  let inDataUrl = false;
  let parenDepth = 0;

  for (let i = 0; i < srcsetString.length; i++) {
    const char = srcsetString[i];

    if (srcsetString.startsWith('data:', i)) {
      inDataUrl = true;
    }

    if (inDataUrl && (char === ' ' || char === '\t' || char === '\n')) {
      inDataUrl = false;
    }

    if (char === '(') parenDepth++;
    if (char === ')' && parenDepth > 0) parenDepth--;

    if (char === ',' && !inDataUrl && parenDepth === 0) {
      const trimmedCurrent = current.trim();
      const hasDescriptor = /\s+\d+(\.\d+)?[wx]$/i.test(trimmedCurrent);
      const isStandaloneUrl = !trimmedCurrent.includes(' ') && trimmedCurrent.length > 0;

      if (hasDescriptor || isStandaloneUrl) {
        entries.push(trimmedCurrent);
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    entries.push(current.trim());
  }

  return entries;
}

/**
 * Extracts the highest-resolution image URL from a srcset string,
 * falling back to the provided fallbackSrc if no valid candidates are found.
 *
 * @param srcset Raw srcset attribute string
 * @param fallbackSrc Fallback image src (e.g. img.src or img.currentSrc)
 * @param baseUrl Base URL for relative path resolution
 * @returns The highest-resolution candidate URL
 */
export function getHighestResolutionCandidate(
  srcset?: string | null,
  fallbackSrc?: string | null,
  baseUrl?: string
): string {
  if (!srcset || !srcset.trim()) {
    return fallbackSrc || '';
  }

  const candidates = parseSrcset(srcset, baseUrl);
  if (candidates.length === 0) {
    return fallbackSrc || '';
  }

  // Sort descending by effective width / quality
  candidates.sort((a, b) => b.effectiveWidth - a.effectiveWidth);

  // If top candidate has effective width greater than or equal to fallback baseline, return it
  return candidates[0].url || fallbackSrc || '';
}
