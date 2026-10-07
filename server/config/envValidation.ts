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
  'local-dev-blind-index-hmac-secret-ruangtenang-32-chars',
  'local-dev-aes-encryption-key-ruangtenang-32-chars-long',
  'fallback-secret-for-development-ruangtenang-long-key-32',
  'ruangtenang-ai-studio-jwt-secret-long-secure-fallback-32',
  'ruangtenang-ai-studio-aes-encryption-key-fallback-32',
  'supersecret_jwt_key_ruangtenang_2026',
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
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
    'production-fixture-',
    'fixture-shared-secret-',
    'test-fixture-',
    'ci-only-',
    'dummy_key',
    'postgrespassword'
  ];

  return explicitDemoPatterns.some(pat => lower.includes(pat));
}

export function validateEnvironment(): void {
  const isProd = process.env.NODE_ENV === 'production';

  const jwtSecret = process.env.JWT_SECRET;
  const encryptionKey = process.env.ENCRYPTION_KEY || process.env.DATA_ENCRYPTION_KEY || process.env.ENCRYPTION_SECRET;
  const blindIndexSecret = process.env.BLIND_INDEX_SECRET;

  if (isProd) {
    const configuredOrigins = [process.env.APP_ORIGIN, process.env.CORS_ALLOWED_ORIGINS]
      .filter(Boolean)
      .join(',')
      .split(',')
      .map(origin => origin.trim());
    if (configuredOrigins.includes('*')) {
      throw new Error('FATAL SECURITY ERROR: Wildcard CORS origins are not allowed in production');
    }

    if (!jwtSecret) {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing');
    }
    if (jwtSecret.length < 32) {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be at least 32 characters long');
    }
    if (isKnownInsecureDemoSecret(jwtSecret)) {
      throw new Error('FATAL SECURITY ERROR: Insecure demo JWT_SECRET detected in production');
    }

    if (!encryptionKey || (!process.env.ENCRYPTION_KEY && !process.env.DATA_ENCRYPTION_KEY)) {
      throw new Error('FATAL SECURITY ERROR: ENCRYPTION_KEY environment variable is missing');
    }
    if (encryptionKey.length < 32) {
      throw new Error('FATAL SECURITY ERROR: ENCRYPTION_KEY must be at least 32 characters long');
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
    const turnSecret = process.env.TURN_SHARED_SECRET;
    const isTurnRequired = process.env.REQUIRE_TURN === 'true' || Boolean(turnUrl || turnUser || turnSecret || process.env.TURN_CREDENTIAL);

    if (isTurnRequired) {
      if (!turnUrl || !turnSecret) {
        throw new Error('FATAL SECURITY ERROR: TURN_URL and TURN_SHARED_SECRET are required when TURN is enabled in production');
      }
      if (turnSecret.length < 32) {
        throw new Error('FATAL SECURITY ERROR: TURN_SHARED_SECRET must be at least 32 characters long');
      }
      if (process.env.TURN_CREDENTIAL || isKnownInsecureDemoSecret(turnSecret) || isKnownInsecureDemoSecret(turnUser)) {
        throw new Error('FATAL SECURITY ERROR: Static or insecure TURN credentials are not allowed in production; use TURN_SHARED_SECRET');
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

  let secret = process.env.JWT_SECRET;
  if (isProd) {
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

  if (isProd) {
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

export const TURN_CREDENTIAL_TTL_SECONDS = 10 * 60;

export function getValidatedTurnConfig(): TurnConfig | null {
  const isProd = process.env.NODE_ENV === 'production';

  const turnUrl = process.env.TURN_URL;
  const turnUser = process.env.TURN_USERNAME;
  const turnSecret = process.env.TURN_SHARED_SECRET;
  const isTurnRequired = process.env.REQUIRE_TURN === 'true' || Boolean(turnUrl || turnUser || turnSecret || process.env.TURN_CREDENTIAL);

  if (isProd) {
    if (isTurnRequired) {
      if (!turnUrl || !turnSecret) {
        throw new Error('FATAL SECURITY ERROR: TURN_URL and TURN_SHARED_SECRET are required when TURN is enabled in production');
      }
      if (turnSecret.length < 32) {
        throw new Error('FATAL SECURITY ERROR: TURN_SHARED_SECRET must be at least 32 characters long');
      }
      if (process.env.TURN_CREDENTIAL || isKnownInsecureDemoSecret(turnSecret) || isKnownInsecureDemoSecret(turnUser)) {
        throw new Error('FATAL SECURITY ERROR: Static or insecure TURN credentials are not allowed in production; use TURN_SHARED_SECRET');
      }
      return createEphemeralTurnConfig(turnUrl, turnSecret, turnUser);
    }
    return null;
  }

  if (!turnUrl && !turnUser && !turnSecret && !process.env.TURN_CREDENTIAL) {
    return null;
  }

  if (!turnUrl || !turnSecret) return null;
  return createEphemeralTurnConfig(turnUrl, turnSecret, turnUser);
}

function createEphemeralTurnConfig(url: string, sharedSecret: string, usernamePrefix?: string): TurnConfig {
  const expiresAt = Math.floor(Date.now() / 1000) + TURN_CREDENTIAL_TTL_SECONDS;
  const username = `${expiresAt}:${usernamePrefix || 'ruangtenang'}`;
  const credential = crypto.createHmac('sha1', sharedSecret).update(username).digest('base64');
  return { url, username, credential };
}
