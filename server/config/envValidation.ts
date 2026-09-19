/**
 * Server Environment & Secrets Production Readiness Validator
 * Canonical Module for RuangTenang Data Privacy & Security
 */

import crypto from 'crypto';
import { resolveDatabaseConfiguration } from './databaseConfig.js';

const KNOWN_INSECURE_DEMO_SECRETS = [
  'secret-key-123',
  'jwt-secret',
  'super-secret-key',
  'default-key',
  'ruangtenang-secret',
  'change-me-in-production',
  'secret',
  '1234567890',
  'fallback-key-2026',
  'ruangtenang-prod-jwt-secret-key-32chars-minimum-fallback-key-2026',
  'local-development-fallback'
];

export function validateEnvironment(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const isPreview = process.env.IS_AI_STUDIO_PREVIEW === 'true' || process.env.PREVIEW_MODE === 'true';
  const jwtSecret = process.env.JWT_SECRET;
  const encryptionKey = process.env.ENCRYPTION_SECRET || process.env.DATA_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  const blindIndexSecret = process.env.BLIND_INDEX_SECRET;

  if (isProd && !isPreview) {
    if (!jwtSecret) {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production.');
    }
    if (jwtSecret.length < 32) {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be at least 32 characters long in production.');
    }
    if (isKnownInsecureDemoSecret(jwtSecret)) {
      throw new Error('FATAL SECURITY ERROR: Insecure demo JWT_SECRET detected in production.');
    }
    if (!encryptionKey) {
      throw new Error('FATAL SECURITY ERROR: ENCRYPTION_SECRET or ENCRYPTION_KEY environment variable is missing in production.');
    }
    if (encryptionKey.length < 32) {
      throw new Error('FATAL SECURITY ERROR: ENCRYPTION_SECRET / ENCRYPTION_KEY must be at least 32 characters or 64 hex characters long in production.');
    }
    if (isKnownInsecureDemoSecret(encryptionKey)) {
      throw new Error('FATAL SECURITY ERROR: Insecure demo ENCRYPTION_SECRET / ENCRYPTION_KEY detected in production.');
    }
    // Validate Database Configuration in Production
    resolveDatabaseConfiguration();

    if (!blindIndexSecret) {
      throw new Error('FATAL SECURITY ERROR: BLIND_INDEX_SECRET environment variable is missing in production.');
    }
    if (blindIndexSecret.length < 32) {
      throw new Error('FATAL SECURITY ERROR: BLIND_INDEX_SECRET must be at least 32 characters long in production.');
    }
    if (isKnownInsecureDemoSecret(blindIndexSecret)) {
      throw new Error('FATAL SECURITY ERROR: Insecure demo BLIND_INDEX_SECRET detected in production.');
    }
  } else {
    // Local development/test or Preview: safely set development secrets if completely unset
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'fallback-secret-for-development-ruangtenang-long-key-32';
    }
    if (!process.env.ENCRYPTION_KEY && !process.env.ENCRYPTION_SECRET && !process.env.DATA_ENCRYPTION_KEY) {
      process.env.ENCRYPTION_SECRET = 'local-dev-aes-encryption-key-ruangtenang-32-chars-long';
      process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET;
      process.env.DATA_ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET;
    }
    if (!process.env.BLIND_INDEX_SECRET) {
      process.env.BLIND_INDEX_SECRET = 'local-dev-blind-index-hmac-secret-ruangtenang-32-chars';
    }
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'file:./prisma/ruangtenang_sqlite.db';
    }
  }
}

export function getValidatedJwtSecret(): string {
  let secret = process.env.JWT_SECRET;
  if (!secret) {
    secret = 'ruangtenang-ai-studio-jwt-secret-long-secure-fallback-32';
    process.env.JWT_SECRET = secret;
  }
  return secret;
}

function isKnownInsecureDemoSecret(secret: string): boolean {
  return KNOWN_INSECURE_DEMO_SECRETS.some(s => secret.toLowerCase() === s.toLowerCase() || secret.toLowerCase().includes(s.toLowerCase()));
}

export function getValidatedEncryptionKey(version: string = 'k1'): Buffer {
  let rawKey: string | undefined;
  const upperVer = version.toUpperCase();
  
  if (version === 'v1' || version === 'k1') {
    rawKey = process.env.ENCRYPTION_SECRET ||
             process.env.DATA_ENCRYPTION_KEY || 
             process.env.ENCRYPTION_KEY || 
             process.env[`ENCRYPTION_KEY_${upperVer}`] || 
             process.env[`DATA_ENCRYPTION_KEY_${upperVer}`] ||
             process.env[`ENCRYPTION_SECRET_${upperVer}`];
  } else {
    rawKey = process.env[`ENCRYPTION_SECRET_${upperVer}`] ||
             process.env[`ENCRYPTION_KEY_${upperVer}`] || 
             process.env[`DATA_ENCRYPTION_KEY_${upperVer}`] || 
             process.env.ENCRYPTION_SECRET ||
             process.env.DATA_ENCRYPTION_KEY || 
             process.env.ENCRYPTION_KEY;
  }

  if (!rawKey) {
    rawKey = `ruangtenang-ai-studio-aes-encryption-key-fallback-32-${version}`;
    process.env.ENCRYPTION_KEY = rawKey;
    process.env.DATA_ENCRYPTION_KEY = rawKey;
  }

  // 1. 64-char hex string (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  // 2. Base64 encoded 32-byte key
  try {
    const b64Buf = Buffer.from(rawKey, 'base64');
    if (b64Buf.length === 32 && /^[A-Za-z0-9+/=]+$/.test(rawKey)) {
      return b64Buf;
    }
  } catch {}

  // 3. Exact 32 bytes UTF-8 string
  const utf8Buf = Buffer.from(rawKey, 'utf8');
  if (utf8Buf.length === 32) {
    return utf8Buf;
  }

  // 4. Derive 32-byte key deterministically from passphrase using SHA-256
  return crypto.createHash('sha256').update(rawKey).digest();
}
