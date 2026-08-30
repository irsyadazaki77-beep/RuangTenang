import { describe, it, expect } from 'vitest';
import { sanitizeInput } from '../../security.js';
import { scanAndSanitizePII } from '../../services/piiService.js';

describe('Security Utilities', () => {
  describe('stripPII', () => {
    it('should strip email addresses', () => {
      const input = 'My email is budi.santoso@ui.ac.id please contact me';
      const result = scanAndSanitizePII(input).sanitizedText;
      expect(result).toBe('My email is [EMAIL_TERSEMBUNYI] please contact me');
    });

    it('should strip Indonesian phone numbers', () => {
      const input = 'Call me at 081234567890 or +6281234567890.';
      const result = scanAndSanitizePII(input).sanitizedText;
      expect(result).toBe('Call me at [NOMOR_HP_TERSEMBUNYI] or [NOMOR_HP_TERSEMBUNYI].');
    });

    it('should strip NIMs', () => {
      const input = 'My student ID is 1234567890.';
      const result = scanAndSanitizePII(input).sanitizedText;
      expect(result).toBe('My student ID is [NIM_TERSEMBUNYI].');
    });

    it('should strip explicit self-identifying names', () => {
      const input = 'Halo, nama saya Budi Santoso dan saya sedih.';
      const result = scanAndSanitizePII(input).sanitizedText;
      expect(result).toBe('Halo, nama saya [MAHASISWA] dan saya sedih.');
    });

    it('should handle empty or null input', () => {
      expect(scanAndSanitizePII('').sanitizedText).toBe('');
      // @ts-ignore testing invalid input
      expect(scanAndSanitizePII(null).sanitizedText).toBe('');
    });
  });

  describe('sanitizeInput', () => {
    it('should strip HTML tags', () => {
      const input = '<script>alert("xss")</script><p>Hello</p>';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello');
    });

    it('should truncate to max length', () => {
      const input = 'a'.repeat(2000);
      const result = sanitizeInput(input, 1000);
      expect(result.length).toBe(1000);
    });
  });
});