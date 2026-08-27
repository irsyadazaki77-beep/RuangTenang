import crypto from 'crypto';
import { getValidatedEncryptionKey } from '../config/envValidation.js';

const ALGORITHM = 'aes-256-gcm';
let activeKeyVersion = process.env.ACTIVE_ENCRYPTION_KEY_VERSION || 'v1';

export const encryptionService = {
  getCurrentKeyVersion(): string {
    return activeKeyVersion;
  },

  setActiveKeyVersion(version: string): void {
    activeKeyVersion = version;
  },

  /**
   * Encrypts plaintext using AES-256-GCM with the active key version.
   * Output Format: [VERSION]:[IV(base64)]:[AUTHTAG(base64)]:[CIPHERTEXT(base64)]
   */
  encryptSensitive(plaintext: string | null | undefined, targetVersion?: string): string | null {
    if (plaintext === null || plaintext === undefined || plaintext === '') {
      return plaintext || null;
    }

    const versionToUse = targetVersion || activeKeyVersion;

    try {
      const key = getValidatedEncryptionKey(versionToUse);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      
      let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
      ciphertext += cipher.final('base64');
      const authTag = cipher.getAuthTag().toString('base64');
      const ivBase64 = iv.toString('base64');

      return `${versionToUse}:${ivBase64}:${authTag}:${ciphertext}`;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  },

  /**
   * Decrypts ciphertext using AES-256-GCM by parsing the embedded key version.
   */
  decryptSensitive(encryptedText: string | null | undefined): string | null {
    if (encryptedText === null || encryptedText === undefined || encryptedText === '') {
      return encryptedText || null;
    }

    // Parse version prefix dynamically for Key Versioning support (e.g., v1, v2)
    const versionMatch = encryptedText.match(/^(v\d+):/);
    if (!versionMatch) {
      // Return plaintext if legacy unencrypted format is encountered
      return encryptedText;
    }

    const version = versionMatch[1];

    try {
      const key = getValidatedEncryptionKey(version);
      const parts = encryptedText.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format');
      }

      const [, ivBase64, authTagBase64, ciphertext] = parts;
      
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');
      
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');
      
      return plaintext;
    } catch (error) {
      console.error(`Decryption failed for sensitive field using key version ${version}.`);
      throw new Error('Failed to decrypt sensitive data');
    }
  },

  /**
   * Checks if string is already encrypted in canonical versioned format.
   */
  isEncrypted(text: string | null | undefined): boolean {
    if (!text || typeof text !== 'string') return false;
    return /^v\d+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/.test(text);
  },

  /**
   * Re-encrypts ciphertext using the currently active key version.
   */
  reencryptWithCurrentKey(encryptedText: string | null | undefined): string | null {
    if (!encryptedText) return encryptedText || null;
    const decrypted = this.decryptSensitive(encryptedText);
    return this.encryptSensitive(decrypted, activeKeyVersion);
  },

  generateRandomKeyBase64(): string {
    return crypto.randomBytes(32).toString('base64');
  }
};
