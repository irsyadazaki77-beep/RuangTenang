import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encryptData, decryptData, isClientCryptoAvailable } from '../../lib/clientCrypto';
import { clientDb } from '../../lib/clientDb';

describe('Client Crypto & Fail-Closed Storage Validation', () => {
  beforeEach(() => {
    clientDb.clearAllMemory();
  });

  it('WebCrypto success: encrypts and decrypts sensitive payload correctly', async () => {
    const sensitivePayload = JSON.stringify({ mood: 'anxious', note: 'Rahasia pribadi konseling' });
    const encrypted = await encryptData(sensitivePayload);

    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe('string');
    // Must NOT be plaintext or fb64
    expect(encrypted.startsWith('fb64:')).toBe(false);
    expect(encrypted).not.toContain('Rahasia pribadi');

    const decrypted = await decryptData(encrypted);
    expect(decrypted).toBe(sensitivePayload);
  });

  it('WebCrypto unavailable: fails closed and throws CRYPTO_UNAVAILABLE without fb64 fallback', async () => {
    const originalCrypto = window.crypto;
    try {
      // Simulate unavailable SubtleCrypto
      Object.defineProperty(window, 'crypto', {
        value: {
          ...originalCrypto,
          subtle: undefined
        },
        configurable: true
      });

      const isAvailable = await isClientCryptoAvailable();
      expect(isAvailable).toBe(false);

      await expect(encryptData('secret data')).rejects.toThrow(/CRYPTO_UNAVAILABLE/);
    } finally {
      Object.defineProperty(window, 'crypto', {
        value: originalCrypto,
        configurable: true
      });
    }
  });

  it('crypto failure: rejects truncated or corrupted ciphertext', async () => {
    // Insufficient buffer length
    await expect(decryptData('dGVzdA==')).rejects.toThrow(/CORRUPTED_CIPHERTEXT/);
    
    // Tampered data should fail AES-GCM authentication
    const valid = await encryptData('my authentic note');
    const bytes = Uint8Array.from(atob(valid), c => c.charCodeAt(0));
    // Tamper with ciphertext byte
    bytes[bytes.length - 1] ^= 0xff;
    const tampered = btoa(String.fromCharCode(...bytes));

    await expect(decryptData(tampered)).rejects.toThrow();
  });

  it('sensitive data never persisted as fb64 plaintext: rejects legacy fb64 and protects clientDb', async () => {
    // 1. DecryptData must refuse fb64 plaintext
    const fakeFb64 = 'fb64:' + btoa(encodeURIComponent('leaked sensitive note'));
    const result = await decryptData(fakeFb64);
    expect(result).toBe(''); // Rejected

    // 2. ClientDb fails closed: when crypto unavailable, stores in volatile memory only
    const originalCrypto = window.crypto;
    try {
      Object.defineProperty(window, 'crypto', {
        value: {
          ...originalCrypto,
          subtle: undefined
        },
        configurable: true
      });

      await clientDb.saveEncrypted('test_sensitive_key', 'private consultation journal');
      
      // Accessible via getDecrypted in current session RAM
      const fetched = await clientDb.getDecrypted('test_sensitive_key');
      expect(fetched).toBe('private consultation journal');

      // Wiped on session termination/logout
      clientDb.clearAllMemory();
      const afterClear = await clientDb.getDecrypted('test_sensitive_key');
      expect(afterClear).toBeNull();
    } finally {
      Object.defineProperty(window, 'crypto', {
        value: originalCrypto,
        configurable: true
      });
    }
  });
});
