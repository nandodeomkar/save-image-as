import { describe, it, expect } from 'vitest';
import {
  sanitizeFilename,
  extractBaseName,
  formatFilename,
  previewFilename
} from '../src/utils/filename-helper';

describe('Filename Helper & Sanitizer', () => {
  describe('sanitizeFilename', () => {
    it('should strip invalid filesystem characters', () => {
      const dirty = 'photo/with\\invalid:*?"<>|chars.png';
      const clean = sanitizeFilename(dirty);
      expect(clean).not.toMatch(/[/\\:*?"<>|]/);
      expect(clean).toBe('photo-with-invalid-chars.png');
    });

    it('should collapse multiple hyphens and whitespace', () => {
      const input = 'my   awesome---cool___image';
      expect(sanitizeFilename(input)).toBe('my-awesome-cool-image');
    });

    it('should remove leading and trailing dots or hyphens', () => {
      expect(sanitizeFilename('..---image-name.---')).toBe('image-name');
    });

    it('should fallback to image for empty or blank inputs', () => {
      expect(sanitizeFilename('')).toBe('image');
      expect(sanitizeFilename('   ')).toBe('image');
      expect(sanitizeFilename('///:::***')).toBe('image');
    });

    it('should handle Windows reserved device names', () => {
      expect(sanitizeFilename('CON')).toBe('CON-file');
      expect(sanitizeFilename('prn')).toBe('prn-file');
      expect(sanitizeFilename('aux')).toBe('aux-file');
      expect(sanitizeFilename('nul')).toBe('nul-file');
      expect(sanitizeFilename('com1')).toBe('com1-file');
      expect(sanitizeFilename('lpt9')).toBe('lpt9-file');
    });

    it('should truncate excessively long names to specified length', () => {
      const longName = 'a'.repeat(300);
      const sanitized = sanitizeFilename(longName, 50);
      expect(sanitized.length).toBe(50);
    });
  });

  describe('extractBaseName', () => {
    it('should extract base filename from standard URL', () => {
      const url = 'https://example.com/assets/images/banner-photo.jpg?size=large#hash';
      expect(extractBaseName(url)).toBe('banner-photo');
    });

    it('should extract decoded URL base name', () => {
      const url = 'https://example.com/assets/my%20cool%20picture.png';
      expect(extractBaseName(url)).toBe('my-cool-picture');
    });

    it('should fallback to alt text if url is data URL or blank', () => {
      const dataUrl = 'data:image/png;base64,...';
      expect(extractBaseName(dataUrl, 'Golden Retriever puppy')).toBe('Golden-Retriever-puppy');
    });

    it('should fallback to page title if alt text is missing', () => {
      expect(extractBaseName('', '', 'Cute Cat Photos Gallery')).toBe('Cute-Cat-Photos-Gallery');
    });

    it('should handle blob URL gracefully', () => {
      const blobUrl = 'blob:https://example.com/3f4e5d6c-7b8a-9f0e-1d2c-3b4a5f6e7d8c';
      expect(extractBaseName(blobUrl, 'Blob Alt')).toBe('Blob-Alt');
    });
  });

  describe('formatFilename', () => {
    const mockMetadata = {
      url: 'https://example.com/products/headphones.png',
      altText: 'Noise Cancelling Headphones',
      pageTitle: 'Audio Store | Best Deals',
      pageDomain: 'audiostore.com',
      naturalWidth: 1920,
      naturalHeight: 1080
    };

    it('should format default template [name].[ext]', () => {
      const filename = formatFilename('[name].[ext]', mockMetadata, 'jpeg');
      expect(filename).toBe('headphones.jpg');
    });

    it('should format custom template with domain and page title tokens', () => {
      const filename = formatFilename(
        '[domain]-[name]-[ext]',
        mockMetadata,
        'webp'
      );
      expect(filename).toBe('audiostore.com-headphones-webp.webp');
    });

    it('should handle case-insensitive tokens', () => {
      const filename = formatFilename(
        '[DOMAIN]-[NAME].[EXT]',
        mockMetadata,
        'png'
      );
      expect(filename).toBe('audiostore.com-headphones.png');
    });

    it('should automatically append extension if omitted from template', () => {
      const filename = formatFilename('[domain]-[name]', mockMetadata, 'png');
      expect(filename).toBe('audiostore.com-headphones.png');
    });

    it('should support date, year, month, and day tokens', () => {
      const filename = formatFilename('[name]-[year]-[month]-[day].[ext]', mockMetadata, 'avif');
      const now = new Date();
      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      expect(filename).toBe(`headphones-${year}-${month}-${day}.avif`);
    });

    it('should support width, height, and dimensions tokens', () => {
      const filename = formatFilename('[name]-[dimensions].[ext]', mockMetadata, 'png');
      expect(filename).toBe('headphones-1920x1080.png');
    });

    it('should support timestamp token', () => {
      const filename = formatFilename('[name]-[timestamp].[ext]', mockMetadata, 'gif');
      expect(filename).toMatch(/^headphones-\d+\.gif$/);
    });
  });

  describe('previewFilename', () => {
    it('should generate a preview with default sample data', () => {
      const preview = previewFilename('[name].[ext]', undefined, 'webp');
      expect(preview).toBe('sample-nature-wallpaper.webp');
    });

    it('should generate a preview with custom sample data', () => {
      const preview = previewFilename(
        '[domain]_[dimensions]_[name].[ext]',
        { pageDomain: 'custom.com', naturalWidth: 800, naturalHeight: 600 },
        'jpeg'
      );
      expect(preview).toBe('custom.com-800x600-sample-nature-wallpaper.jpg');
    });
  });
});
