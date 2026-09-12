process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 'a').toString('base64');
import { describe, it, expect } from 'vitest';
import { encryptionService } from '../../services/encryptionService.js';

describe('Server Encryption Unit Tests', () => {
  it('should return null for null/empty input', () => {
    expect(encryptionService.encryptSensitive(null)).toBeNull();
    expect(encryptionService.encryptSensitive('')).toBeNull();
    expect(encryptionService.decryptSensitive(null)).toBeNull();
    expect(encryptionService.decryptSensitive('')).toBeNull();
  });

  it('should encrypt and decrypt string values cleanly', () => {
    const plaintext = 'Sensitif: Data Mahasiswa';
    const ciphertext = encryptionService.encryptSensitive(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(ciphertext).toContain('v1:');

    const decrypted = encryptionService.decryptSensitive(ciphertext);
    expect(decrypted).toBe(plaintext);
  });
});
