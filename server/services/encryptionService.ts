import crypto from 'crypto';
import { getValidatedEncryptionKey } from '../config/envValidation.js';

const ALGORITHM = 'aes-256-gcm';
let activeKeyVersion = process.env.ACTIVE_ENCRYPTION_KEY_VERSION || 'k1';

export const encryptionService = {
  getCurrentKeyVersion(): string {
    return activeKeyVersion;
  },

  setActiveKeyVersion(version: string): void {
    activeKeyVersion = version;
  },

  /**
   * Encrypts plaintext using AES-256-GCM with fail-closed semantics.
   * Throws an error if plaintext is missing/empty or if encryption fails.
   */
  encryptRequiredSensitive(plaintext: string, targetVersion?: string): string {
    if (!plaintext || typeof plaintext !== 'string' || plaintext.trim() === '') {
      throw new Error('ENCRYPTION_FAILED: Required sensitive field is empty or missing.');
    }
    const encrypted = this.encryptSensitive(plaintext, targetVersion);
    if (!encrypted || !this.isEncrypted(encrypted)) {
      throw new Error('ENCRYPTION_FAILED: Encryption produced invalid or empty output.');
    }
    return encrypted;
  },

  /**
   * Encrypts plaintext using AES-256-GCM with key versioning.
   * Canonical Format: [VERSION]:[IV(hex)]:[AUTHTAG(hex)]:[CIPHERTEXT(hex)]
   * Example: k1:<iv_hex>:<authTag_hex>:<encryptedData_hex>
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
      
      let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
      ciphertext += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      const ivHex = iv.toString('hex');

      return `${versionToUse}:${ivHex}:${authTag}:${ciphertext}`;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  },

  /**
   * Decrypts ciphertext using AES-256-GCM.
   * Supports:
   * 1. 4-part versioned hex or base64 format: `k1:<iv>:<authTag>:<ciphertext>`
   * 2. 3-part legacy format: `<iv>:<authTag>:<ciphertext>` (defaults to current key `k1`)
   * 3. Legacy JSON format: `{"iv":"...","authTag":"...","data":"..."}`
   * Gracefully falls back to original text or safe fallback on decryption error without crashing.
   */
  decryptSensitive(encryptedText: string | null | undefined): string | null {
    if (encryptedText === null || encryptedText === undefined || encryptedText === '') {
      return encryptedText || null;
    }

    const trimmed = encryptedText.trim();

    try {
      // 1. JSON format backward compatibility
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          const ivStr = parsed.iv;
          const tagStr = parsed.authTag || parsed.tag;
          const dataStr = parsed.data || parsed.encrypted || parsed.ciphertext;
          const version = parsed.version || activeKeyVersion;
          if (ivStr && tagStr && dataStr) {
            const key = getValidatedEncryptionKey(version);
            const isHex = /^[0-9a-fA-F]+$/.test(ivStr) && /^[0-9a-fA-F]+$/.test(tagStr);
            const iv = Buffer.from(ivStr, isHex ? 'hex' : 'base64');
            const authTag = Buffer.from(tagStr, isHex ? 'hex' : 'base64');
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);
            let plaintext = decipher.update(dataStr, isHex ? 'hex' : 'base64', 'utf8');
            plaintext += decipher.final('utf8');
            return plaintext;
          }
        } catch {}
      }

      // 2. Colon-separated format
      const parts = trimmed.split(':');
      if (parts.length === 4) {
        // [VERSION]:[IV]:[AUTHTAG]:[CIPHERTEXT]
        const [version, ivStr, tagStr, dataStr] = parts;
        const key = getValidatedEncryptionKey(version);
        const isHex = /^[0-9a-fA-F]+$/.test(ivStr) && /^[0-9a-fA-F]+$/.test(tagStr);
        const iv = Buffer.from(ivStr, isHex ? 'hex' : 'base64');
        const authTag = Buffer.from(tagStr, isHex ? 'hex' : 'base64');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let plaintext = decipher.update(dataStr, isHex ? 'hex' : 'base64', 'utf8');
        plaintext += decipher.final('utf8');
        return plaintext;
      } else if (parts.length === 3) {
        // Legacy 3-part format: [IV]:[AUTHTAG]:[CIPHERTEXT] -> default to k1 / activeKeyVersion
        const [ivStr, tagStr, dataStr] = parts;
        const key = getValidatedEncryptionKey(activeKeyVersion);
        const isHex = /^[0-9a-fA-F]+$/.test(ivStr) && /^[0-9a-fA-F]+$/.test(tagStr);
        const iv = Buffer.from(ivStr, isHex ? 'hex' : 'base64');
        const authTag = Buffer.from(tagStr, isHex ? 'hex' : 'base64');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let plaintext = decipher.update(dataStr, isHex ? 'hex' : 'base64', 'utf8');
        plaintext += decipher.final('utf8');
        return plaintext;
      }

      // Return plaintext if not in encrypted format
      return encryptedText;
    } catch (err: any) {
      if (this.isEncrypted(encryptedText)) {
        throw new Error(`Failed to decrypt sensitive data: ${err?.message || 'Authentication tag verification failed'}`);
      }
      console.warn(`[ENCRYPTION_WARNING] Decryption failed for payload (${err?.message || 'unknown error'}). Falling back to original string.`);
      return encryptedText;
    }
  },

  /**
   * Checks if string is already encrypted in canonical versioned or legacy format.
   */
  isEncrypted(text: string | null | undefined): boolean {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.includes('"iv"') && (trimmed.includes('"authTag"') || trimmed.includes('"tag"'))) {
      return true;
    }
    const parts = trimmed.split(':');
    if (parts.length === 4) {
      return /^[a-zA-Z0-9_-]+$/.test(parts[0]) && parts[1].length > 0 && parts[2].length > 0 && parts[3].length > 0;
    }
    if (parts.length === 3) {
      return parts[0].length >= 16 && parts[1].length >= 16 && parts[2].length > 0;
    }
    return false;
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
  },

  generateRandomKeyHex(): string {
    return crypto.randomBytes(32).toString('hex');
  }
};
