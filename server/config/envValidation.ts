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
  'local-development-fallback',
  'secret_password_here',
  'ruangtenang_secure_user',
  'local-dev-blind-index-hmac-secret-ruangtenang-32-chars',
  'local-dev-aes-encryption-key-ruangtenang-32-chars-long',
  'fallback-secret-for-development-ruangtenang-long-key-32',
  'ruangtenang-ai-studio-jwt-secret-long-secure-fallback-32',
  'ruangtenang-ai-studio-aes-encryption-key-fallback-32',
  'sk-d0671b185a4c476b9ef52cf949034e35',
  'turn_test_credential_2026',
  'supersecret_jwt_key_ruangtenang_2026',
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  'dev_turn_credential_2026',
  'postgrespassword'
];

export function isKnownInsecureDemoSecret(secret?: string): boolean {
  if (!secret) return false;
  const lower = secret.toLowerCase().trim();

  if (KNOWN_INSECURE_DEMO_SECRETS.some(s => lower === s.toLowerCase().trim())) {
    return true;
  }

  const explicitDemoPatterns = [
    'secret-key-123',
    'super-secret-key',
    'change-me-in-production',
    'local-dev-',
    'local-development-fallback',
    'fallback-secret-for-development',
    'ruangtenang-ai-studio-jwt-secret-long-secure-fallback',
    'ruangtenang-ai-studio-aes-encryption-key-fallback',
    'secret_password_here',
    'dummy_key',
    'postgrespassword'
  ];

  return explicitDemoPatterns.some(pat => lower.includes(pat));
}

export function validateEnvironment(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const isPreview = process.env.IS_AI_STUDIO_PREVIEW === 'true' || process.env.PREVIEW_MODE === 'true';

  const jwtSecret = process.env.JWT_SECRET;
  const encryptionKey = process.env.ENCRYPTION_SECRET || process.env.DATA_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  const blindIndexSecret = process.env.BLIND_INDEX_SECRET;

  if (isProd && !isPreview) {
    if (!jwtSecret) {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing');
    }
    if (jwtSecret.length < 32) {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be at least 32 characters long');
    }
    if (isKnownInsecureDemoSecret(jwtSecret)) {
      throw new Error('FATAL SECURITY ERROR: Insecure demo JWT_SECRET detected in production');
    }

    if (!encryptionKey) {
      throw new Error('FATAL SECURITY ERROR: ENCRYPTION_KEY environment variable is missing');
    }
    if (encryptionKey.length < 32) {
      throw new Error('FATAL SECURITY ERROR: ENCRYPTION_SECRET / ENCRYPTION_KEY must be at least 32 characters long');
    }
    if (isKnownInsecureDemoSecret(encryptionKey)) {
      throw new Error('FATAL SECURITY ERROR: Insecure demo ENCRYPTION_KEY detected in production');
    }

    // Validate Database Configuration early (PostgreSQL required in production)
    resolveDatabaseConfiguration();

    if (!blindIndexSecret) {
      throw new Error('FATAL SECURITY ERROR: BLIND_INDEX_SECRET environment variable is missing in production');
    }
    if (blindIndexSecret.length < 32) {
      throw new Error('FATAL SECURITY ERROR: BLIND_INDEX_SECRET must be at least 32 characters long');
    }
    if (isKnownInsecureDemoSecret(blindIndexSecret)) {
      throw new Error('FATAL SECURITY ERROR: Insecure demo BLIND_INDEX_SECRET detected in production');
    }

    // TURN Server Config validation in production
    const turnUrl = process.env.TURN_URL;
    const turnUser = process.env.TURN_USERNAME;
    const turnCred = process.env.TURN_CREDENTIAL;
    const isTurnRequired = process.env.REQUIRE_TURN === 'true' || Boolean(turnUrl || turnUser || turnCred);

    if (isTurnRequired) {
      if (!turnUrl || !turnUser || !turnCred) {
        throw new Error('FATAL SECURITY ERROR: TURN_URL, TURN_USERNAME, and TURN_CREDENTIAL are required when TURN is enabled in production');
      }
      if (turnCred.length < 8) {
        throw new Error('FATAL SECURITY ERROR: TURN_CREDENTIAL must be at least 8 characters long');
      }
      if (isKnownInsecureDemoSecret(turnCred) || isKnownInsecureDemoSecret(turnUser)) {
        throw new Error('FATAL SECURITY ERROR: Insecure demo TURN_CREDENTIAL or TURN_USERNAME detected in production');
      }
    }
  } else {
    // Local development/test or Preview: safely set development test fixtures if completely unset
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'dev-only-jwt-secret-ruangtenang-key-32chars';
    }
    if (!process.env.ENCRYPTION_KEY && !process.env.ENCRYPTION_SECRET && !process.env.DATA_ENCRYPTION_KEY) {
      process.env.ENCRYPTION_SECRET = 'dev-only-aes-encryption-key-ruangtenang-32chars';
      process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET;
      process.env.DATA_ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET;
    }
    if (!process.env.BLIND_INDEX_SECRET) {
      process.env.BLIND_INDEX_SECRET = 'dev-only-blind-index-hmac-secret-32chars';
    }
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'file:./prisma/ruangtenang_sqlite.db';
    }
  }
}

export function getValidatedJwtSecret(): string {
  const isProd = process.env.NODE_ENV === 'production';
  const isPreview = process.env.IS_AI_STUDIO_PREVIEW === 'true' || process.env.PREVIEW_MODE === 'true';

  let secret = process.env.JWT_SECRET;
  if (isProd && !isPreview) {
    if (!secret) {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production');
    }
    if (secret.length < 32 || isKnownInsecureDemoSecret(secret)) {
      throw new Error('FATAL SECURITY ERROR: Insecure or short JWT_SECRET detected in production');
    }
  }
  if (!secret) {
    secret = 'dev-only-jwt-secret-ruangtenang-key-32chars';
    process.env.JWT_SECRET = secret;
  }
  return secret;
}

export function getValidatedEncryptionKey(version: string = 'k1'): Buffer {
  const isProd = process.env.NODE_ENV === 'production';
  const isPreview = process.env.IS_AI_STUDIO_PREVIEW === 'true' || process.env.PREVIEW_MODE === 'true';

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

  if (isProd && !isPreview) {
    if (!rawKey) {
      throw new Error('FATAL SECURITY ERROR: Encryption key environment variable is missing in production');
    }
    if (rawKey.length < 32 || isKnownInsecureDemoSecret(rawKey)) {
      throw new Error('FATAL SECURITY ERROR: Insecure or short encryption key detected in production');
    }
  }

  if (!rawKey) {
    rawKey = 'dev-only-aes-encryption-key-ruangtenang-32chars';
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

export interface TurnConfig {
  url?: string;
  username?: string;
  credential?: string;
}

export function getValidatedTurnConfig(): TurnConfig | null {
  const isProd = process.env.NODE_ENV === 'production';
  const isPreview = process.env.IS_AI_STUDIO_PREVIEW === 'true' || process.env.PREVIEW_MODE === 'true';

  const turnUrl = process.env.TURN_URL;
  const turnUser = process.env.TURN_USERNAME;
  const turnCred = process.env.TURN_CREDENTIAL;
  const isTurnRequired = process.env.REQUIRE_TURN === 'true' || Boolean(turnUrl || turnUser || turnCred);

  if (isProd && !isPreview) {
    if (isTurnRequired) {
      if (!turnUrl || !turnUser || !turnCred) {
        throw new Error('FATAL SECURITY ERROR: TURN_URL, TURN_USERNAME, and TURN_CREDENTIAL are required when TURN is enabled in production');
      }
      if (turnCred.length < 8) {
        throw new Error('FATAL SECURITY ERROR: TURN_CREDENTIAL must be at least 8 characters long');
      }
      if (isKnownInsecureDemoSecret(turnCred) || isKnownInsecureDemoSecret(turnUser)) {
        throw new Error('FATAL SECURITY ERROR: Insecure demo TURN_CREDENTIAL or TURN_USERNAME detected in production');
      }
      return { url: turnUrl, username: turnUser, credential: turnCred };
    }
    return null;
  }

  if (!turnUrl && !turnUser && !turnCred) {
    return null;
  }

  return {
    url: turnUrl || 'turn:turn.ruangtenang.ui.ac.id:3478',
    username: turnUser || 'dev_turn_user',
    credential: turnCred || 'dev_turn_credential_2026'
  };
}
