import { describe, it, expect } from 'vitest';
import { parseSrcset, getHighestResolutionCandidate } from '../src/content/srcset-parser';

describe('Responsive srcset Parser', () => {
  it('should parse single URL without descriptor', () => {
    const srcset = 'https://example.com/image.jpg';
    const result = parseSrcset(srcset);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://example.com/image.jpg');
    expect(result[0].effectiveWidth).toBe(1000);
  });

  it('should parse width descriptors (w)', () => {
    const srcset = 'small.jpg 400w, medium.jpg 800w, large.jpg 1600w, ultra.jpg 3200w';
    const result = parseSrcset(srcset);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      url: 'small.jpg',
      descriptor: '400w',
      width: 400,
      density: undefined,
      effectiveWidth: 400
    });
    expect(result[3]).toEqual({
      url: 'ultra.jpg',
      descriptor: '3200w',
      width: 3200,
      density: undefined,
      effectiveWidth: 3200
    });
  });

  it('should parse pixel density descriptors (x)', () => {
    const srcset = 'image-1x.jpg 1x, image-2x.jpg 2x, image-3.5x.jpg 3.5x';
    const result = parseSrcset(srcset);
    expect(result).toHaveLength(3);
    expect(result[0].density).toBe(1);
    expect(result[1].density).toBe(2);
    expect(result[2].density).toBe(3.5);
    expect(result[2].effectiveWidth).toBe(3500);
  });

  it('should handle complex URLs with commas in query parameters', () => {
    const srcset = 'https://cdn.example.com/img?w=600&filters=blur(1,2) 600w, https://cdn.example.com/img?w=1200&filters=blur(1,2) 1200w';
    const result = parseSrcset(srcset);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const candidate1200 = result.find((r) => r.width === 1200);
    expect(candidate1200).toBeDefined();
  });

  it('should handle data URLs in srcset', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const srcset = `${dataUrl} 1x, https://example.com/high.png 2x`;
    const result = parseSrcset(srcset);
    expect(result).toHaveLength(2);
    expect(result[0].url.startsWith('data:image/png')).toBe(true);
    expect(result[1].url).toBe('https://example.com/high.png');
  });

  it('should resolve relative URLs against baseUrl', () => {
    const srcset = 'assets/thumb.jpg 300w, /assets/hero.jpg 1200w';
    const result = parseSrcset(srcset, 'https://example.com/blog/post-1');
    expect(result[0].url).toBe('https://example.com/blog/assets/thumb.jpg');
    expect(result[1].url).toBe('https://example.com/assets/hero.jpg');
  });

  describe('getHighestResolutionCandidate', () => {
    it('should return highest resolution candidate from width-based srcset', () => {
      const srcset = 'small.jpg 400w, ultra.jpg 3840w, medium.jpg 800w';
      const best = getHighestResolutionCandidate(srcset, 'fallback.jpg');
      expect(best).toBe('ultra.jpg');
    });

    it('should return highest resolution candidate from density-based srcset', () => {
      const srcset = 'img-1x.jpg 1x, img-3x.jpg 3x, img-2x.jpg 2x';
      const best = getHighestResolutionCandidate(srcset, 'img-1x.jpg');
      expect(best).toBe('img-3x.jpg');
    });

    it('should fallback to provided fallbackSrc if srcset is empty or invalid', () => {
      expect(getHighestResolutionCandidate('', 'https://example.com/orig.jpg')).toBe(
        'https://example.com/orig.jpg'
      );
      expect(getHighestResolutionCandidate(null, 'https://example.com/orig.jpg')).toBe(
        'https://example.com/orig.jpg'
      );
      expect(getHighestResolutionCandidate('   ', 'fallback.png')).toBe('fallback.png');
    });
  });
});
