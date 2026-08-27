import { describe, expect, it } from 'vitest';
import { getPhq9Severity, getGad7Severity } from '../clinicalScoring';

describe('Clinical Scoring Boundaries', () => {
  describe('PHQ-9 Severity', () => {
    it('should return Minimal for scores 0-4', () => {
      expect(getPhq9Severity(0)).toBe('Minimal');
      expect(getPhq9Severity(4)).toBe('Minimal');
    });

    it('should return Ringan for scores 5-9', () => {
      expect(getPhq9Severity(5)).toBe('Ringan');
      expect(getPhq9Severity(9)).toBe('Ringan');
    });

    it('should return Sedang for scores 10-14', () => {
      expect(getPhq9Severity(10)).toBe('Sedang');
      expect(getPhq9Severity(14)).toBe('Sedang');
    });

    it('should return Sedang-Berat for scores 15-19', () => {
      expect(getPhq9Severity(15)).toBe('Sedang-Berat');
      expect(getPhq9Severity(19)).toBe('Sedang-Berat');
    });

    it('should return Berat for scores >= 20', () => {
      expect(getPhq9Severity(20)).toBe('Berat');
      expect(getPhq9Severity(27)).toBe('Berat');
    });
  });

  describe('GAD-7 Severity', () => {
    it('should return Minimal for scores 0-4', () => {
      expect(getGad7Severity(0)).toBe('Minimal');
      expect(getGad7Severity(4)).toBe('Minimal');
    });

    it('should return Ringan for scores 5-9', () => {
      expect(getGad7Severity(5)).toBe('Ringan');
      expect(getGad7Severity(9)).toBe('Ringan');
    });

    it('should return Sedang for scores 10-14', () => {
      expect(getGad7Severity(10)).toBe('Sedang');
      expect(getGad7Severity(14)).toBe('Sedang');
    });

    it('should return Berat for scores >= 15', () => {
      expect(getGad7Severity(15)).toBe('Berat');
      expect(getGad7Severity(21)).toBe('Berat');
    });
  });
});
