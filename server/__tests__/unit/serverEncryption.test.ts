process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 'a').toString('base64');
process.env.ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY;
process.env.ENCRYPTION_SECRET = process.env.DATA_ENCRYPTION_KEY;

import { describe, it, expect } from 'vitest';
import { encryptionService } from '../../services/encryptionService.js';
import { validateEnvironment } from '../../config/envValidation.js';
import crypto from 'crypto';

describe('Server Encryption Unit & Security Tests', () => {
  describe('Key Versioning (k1: canonical format)', () => {
    it('should return null for null/empty input', () => {
      expect(encryptionService.encryptSensitive(null)).toBeNull();
      expect(encryptionService.encryptSensitive('')).toBeNull();
      expect(encryptionService.decryptSensitive(null)).toBeNull();
      expect(encryptionService.decryptSensitive('')).toBeNull();
    });

    it('should encrypt with "k1:" prefix and 4-part structure', () => {
      const plaintext = 'pesan rahasia';
      const ciphertext = encryptionService.encryptSensitive(plaintext);

      expect(ciphertext).toBeDefined();
      expect(typeof ciphertext).toBe('string');
      expect(ciphertext!.startsWith('k1:')).toBe(true);

      const parts = ciphertext!.split(':');
      expect(parts.length).toBe(4);
      expect(parts[0]).toBe('k1'); // Version
      expect(parts[1].length).toBeGreaterThanOrEqual(24); // IV (12 bytes hex)
      expect(parts[2].length).toBeGreaterThanOrEqual(32); // AuthTag (16 bytes hex)
      expect(parts[3].length).toBeGreaterThan(0); // Ciphertext
    });

    it('should decrypt k1-versioned ciphertext and restore exact plaintext', () => {
      const plaintext = 'pesan rahasia yang sangat penting';
      const ciphertext = encryptionService.encryptSensitive(plaintext);
      const decrypted = encryptionService.decryptSensitive(ciphertext);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Backward Compatibility & Graceful Error Handling', () => {
    it('should decrypt legacy v1-versioned ciphertext cleanly', () => {
      const plaintext = 'Data Sensitif Legacy v1';
      const ciphertextV1 = encryptionService.encryptSensitive(plaintext, 'v1');
      expect(ciphertextV1!.startsWith('v1:')).toBe(true);

      const decrypted = encryptionService.decryptSensitive(ciphertextV1);
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt legacy 3-part format (<iv>:<tag>:<ciphertext>) without version prefix', () => {
      const plaintext = 'Data Sensitif Format Lama Tiga Bagian';
      const key = Buffer.from(process.env.DATA_ENCRYPTION_KEY!, 'base64');
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      const legacy3Part = `${iv.toString('hex')}:${authTag}:${encrypted}`;

      const decrypted = encryptionService.decryptSensitive(legacy3Part);
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt legacy JSON format ({"iv":"...","authTag":"...","data":"..."})', () => {
      const plaintext = 'Data Sensitif JSON Lama';
      const key = Buffer.from(process.env.DATA_ENCRYPTION_KEY!, 'base64');
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');

      const legacyJson = JSON.stringify({
        iv: iv.toString('hex'),
        authTag: authTag,
        data: encrypted
      });

      const decrypted = encryptionService.decryptSensitive(legacyJson);
      expect(decrypted).toBe(plaintext);
    });

    it('should return unencrypted plain strings safely without crashing', () => {
      const normalText = 'Halo ini bukan data terenkripsi';
      const result = encryptionService.decryptSensitive(normalText);
      expect(result).toBe(normalText);
    });

    it('should throw structured error on corrupted ciphertext without crashing the process', () => {
      // 4-part structure with corrupted authTag or data
      const corruptedCiphertext = 'k1:0123456789abcdef01234567:badtag0123456789abcdef0123456789:badciphertext';
      expect(() => {
        encryptionService.decryptSensitive(corruptedCiphertext);
      }).toThrow(/Failed to decrypt sensitive data/i);
    });
  });

  describe('Environment Variable Strict Production Validation', () => {
    it('should throw fatal security error in production if ENCRYPTION_KEY is shorter than 32 characters', () => {
      const originalEnv = { ...process.env };

      try {
        process.env.NODE_ENV = 'production';
        delete process.env.IS_AI_STUDIO_PREVIEW;
        delete process.env.PREVIEW_MODE;
        process.env.JWT_SECRET = 'random-unique-production-token-signing-key-4928174921';
        process.env.BLIND_INDEX_SECRET = 'random-unique-blind-index-token-key-19482018471';
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

        // Set short encryption key (< 32 characters)
        process.env.ENCRYPTION_KEY = 'short-key';
        delete process.env.ENCRYPTION_SECRET;
        delete process.env.DATA_ENCRYPTION_KEY;

        expect(() => {
          validateEnvironment();
        }).toThrow(/FATAL SECURITY ERROR: ENCRYPTION_SECRET \/ ENCRYPTION_KEY must be at least 32 characters/i);
      } finally {
        process.env = originalEnv;
      }
    });

    it('should throw fatal security error in production if JWT_SECRET is shorter than 32 characters or insecure default', () => {
      const originalEnv = { ...process.env };

      try {
        process.env.NODE_ENV = 'production';
        delete process.env.IS_AI_STUDIO_PREVIEW;
        delete process.env.PREVIEW_MODE;
        process.env.BLIND_INDEX_SECRET = 'random-unique-blind-index-token-key-19482018471';
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
        process.env.ENCRYPTION_KEY = Buffer.alloc(32, 'x').toString('hex');

        // Short JWT_SECRET
        process.env.JWT_SECRET = 'short-jwt-secret';
        expect(() => validateEnvironment()).toThrow(/JWT_SECRET must be at least 32 characters/i);

        // Insecure demo secret
        process.env.JWT_SECRET = 'ruangtenang-prod-jwt-secret-key-32chars-minimum-fallback-key-2026';
        expect(() => validateEnvironment()).toThrow(/Insecure demo JWT_SECRET detected in production/i);
      } finally {
        process.env = originalEnv;
      }
    });

    it('should pass validation in production when keys satisfy strict 32+ char length', () => {
      const originalEnv = { ...process.env };

      try {
        process.env.NODE_ENV = 'production';
        delete process.env.IS_AI_STUDIO_PREVIEW;
        delete process.env.PREVIEW_MODE;
        process.env.JWT_SECRET = 'random-unique-production-token-signing-key-4928174921';
        process.env.BLIND_INDEX_SECRET = 'random-unique-blind-index-token-key-19482018471';
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
        process.env.ENCRYPTION_KEY = Buffer.alloc(32, 'x').toString('hex'); // 64 hex chars

        expect(() => {
          validateEnvironment();
        }).not.toThrow();
      } finally {
        process.env = originalEnv;
      }
    });
  });
});
