import { describe, it, expect, beforeEach } from 'vitest';
import { inspectElement } from '../src/content/dom-inspector';
import { parseBackgroundImageValue, extractCssBackgroundImage } from '../src/content/css-background';
import { extractInlineSvg, isSvgElement } from '../src/content/svg-extractor';
import { extractCanvasData } from '../src/content/canvas-extractor';

describe('DOM Element Inspector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.title = 'Test Image Page';
  });

  describe('CSS Background Extractor', () => {
    it('should parse simple url string', () => {
      const url = parseBackgroundImageValue('url("https://example.com/hero.jpg")');
      expect(url).toBe('https://example.com/hero.jpg');
    });

    it('should parse unquoted and single-quoted url string', () => {
      expect(parseBackgroundImageValue("url('https://example.com/photo.png')")).toBe(
        'https://example.com/photo.png'
      );
      expect(parseBackgroundImageValue('url(https://example.com/photo.png)')).toBe(
        'https://example.com/photo.png'
      );
    });

    it('should return null for none or gradient values without url', () => {
      expect(parseBackgroundImageValue('none')).toBeNull();
      expect(parseBackgroundImageValue('linear-gradient(to right, red, yellow)')).toBeNull();
    });

    it('should extract background-image from element computed style', () => {
      const div = document.createElement('div');
      div.style.backgroundImage = 'url("https://example.com/bg.webp")';
      document.body.appendChild(div);

      // In JSDOM, element.style provides inline styles reflected in getComputedStyle
      const bg = extractCssBackgroundImage(div);
      expect(bg).toBe('https://example.com/bg.webp');
    });

    it('should extract background-image from parent container if child is empty wrapper', () => {
      const container = document.createElement('div');
      container.style.backgroundImage = 'url("https://example.com/container-bg.jpg")';
      const childSpan = document.createElement('span');
      container.appendChild(childSpan);
      document.body.appendChild(container);

      const bg = extractCssBackgroundImage(childSpan);
      expect(bg).toBe('https://example.com/container-bg.jpg');
    });
  });

  describe('SVG Extractor', () => {
    it('should identify SVG element and child elements', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      svg.appendChild(path);
      document.body.appendChild(svg);

      expect(isSvgElement(svg)).toBe(true);
      expect(isSvgElement(path)).toBe(true);
    });

    it('should extract inline SVG markup with valid namespace and dimensions', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('width', '200');
      svg.setAttribute('height', '200');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '50');
      circle.setAttribute('cy', '50');
      circle.setAttribute('r', '40');
      svg.appendChild(circle);
      document.body.appendChild(svg);

      const result = extractInlineSvg(circle);
      expect(result).not.toBeNull();
      expect(result?.width).toBe(200);
      expect(result?.height).toBe(200);
      expect(result?.svgContent).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(result?.svgContent).toContain('<circle');
    });
  });

  describe('Canvas Extractor', () => {
    it('should extract canvas data URL', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      document.body.appendChild(canvas);

      // In JSDOM canvas.toDataURL returns a data URL
      const result = extractCanvasData(canvas);
      expect(result).not.toBeNull();
      expect(result?.width).toBe(320);
      expect(result?.height).toBe(240);
      expect(result?.dataUrl.startsWith('data:image/png')).toBe(true);
    });
  });

  describe('Comprehensive inspectElement', () => {
    it('should inspect standard <img> element with src', () => {
      const img = document.createElement('img');
      img.src = 'https://example.com/cat.jpg';
      img.alt = 'A cute cat';
      document.body.appendChild(img);

      const result = inspectElement(img);
      expect(result).not.toBeNull();
      expect(result?.elementType).toBe('img');
      expect(result?.url).toBe('https://example.com/cat.jpg');
      expect(result?.altText).toBe('A cute cat');
      expect(result?.pageTitle).toBe('Test Image Page');
    });

    it('should inspect <img> element with srcset and select highest resolution', () => {
      const img = document.createElement('img');
      img.src = 'https://example.com/cat-400.jpg';
      img.setAttribute(
        'srcset',
        'https://example.com/cat-400.jpg 400w, https://example.com/cat-1600.jpg 1600w, https://example.com/cat-800.jpg 800w'
      );
      document.body.appendChild(img);

      const result = inspectElement(img);
      expect(result).not.toBeNull();
      expect(result?.elementType).toBe('img');
      expect(result?.url).toBe('https://example.com/cat-1600.jpg');
    });

    it('should inspect <picture> container and choose high-res source', () => {
      const picture = document.createElement('picture');
      const source1 = document.createElement('source');
      source1.setAttribute('srcset', 'https://example.com/hero-mobile.webp 600w');
      const source2 = document.createElement('source');
      source2.setAttribute('srcset', 'https://example.com/hero-desktop.webp 1920w');
      const img = document.createElement('img');
      img.src = 'https://example.com/hero-fallback.jpg';

      picture.appendChild(source1);
      picture.appendChild(source2);
      picture.appendChild(img);
      document.body.appendChild(picture);

      const result = inspectElement(img);
      expect(result).not.toBeNull();
      expect(result?.elementType).toBe('picture');
      expect(result?.url).toBe('https://example.com/hero-desktop.webp');
    });

    it('should inspect child path of inline <svg>', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 50 50');
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      svg.appendChild(rect);
      document.body.appendChild(svg);

      const result = inspectElement(rect);
      expect(result).not.toBeNull();
      expect(result?.elementType).toBe('svg-inline');
      expect(result?.svgContent).toContain('<svg');
      expect(result?.url.startsWith('data:image/svg+xml')).toBe(true);
    });

    it('should inspect CSS background image on div container', () => {
      const div = document.createElement('div');
      div.style.backgroundImage = 'url("https://example.com/banner.png")';
      document.body.appendChild(div);

      const result = inspectElement(div);
      expect(result).not.toBeNull();
      expect(result?.elementType).toBe('css-background');
      expect(result?.url).toBe('https://example.com/banner.png');
    });

    it('should inspect <video> poster attribute', () => {
      const video = document.createElement('video');
      video.poster = 'https://example.com/poster.jpg';
      document.body.appendChild(video);

      const result = inspectElement(video);
      expect(result).not.toBeNull();
      expect(result?.elementType).toBe('video-poster');
      expect(result?.url).toBe('https://example.com/poster.jpg');
    });

    it('should inspect <a> link pointing to image file', () => {
      const link = document.createElement('a');
      link.href = 'https://example.com/fullsize.png';
      link.textContent = 'View fullsize photo';
      document.body.appendChild(link);

      const result = inspectElement(link);
      expect(result).not.toBeNull();
      expect(result?.elementType).toBe('link-image');
      expect(result?.url).toBe('https://example.com/fullsize.png');
      expect(result?.altText).toBe('View fullsize photo');
    });

    it('should return null for plain text element without background image', () => {
      const p = document.createElement('p');
      p.textContent = 'Just standard paragraph text.';
      document.body.appendChild(p);

      const result = inspectElement(p);
      expect(result).toBeNull();
    });
  });
});
