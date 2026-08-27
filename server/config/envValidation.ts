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
  const jwtSecret = process.env.JWT_SECRET;
  const encryptionKey = process.env.DATA_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;

  if (isProd) {
    if (!jwtSecret) {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production.');
    }
    if (jwtSecret.length < 32) {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be at least 32 characters long in production.');
    }
    if (KNOWN_INSECURE_DEMO_SECRETS.some(s => jwtSecret.toLowerCase() === s.toLowerCase() || jwtSecret.toLowerCase().includes(s.toLowerCase()))) {
      throw new Error('FATAL SECURITY ERROR: Insecure or compromise-prone JWT_SECRET detected in production.');
    }

    if (!encryptionKey) {
      throw new Error('FATAL SECURITY ERROR: ENCRYPTION_KEY environment variable is missing in production.');
    }
    if (encryptionKey.length < 32) {
      throw new Error('FATAL SECURITY ERROR: ENCRYPTION_KEY must be at least 32 characters long in production.');
    }
    if (KNOWN_INSECURE_DEMO_SECRETS.some(s => encryptionKey.toLowerCase() === s.toLowerCase() || encryptionKey.toLowerCase().includes(s.toLowerCase()))) {
      throw new Error('FATAL SECURITY ERROR: Insecure or compromise-prone ENCRYPTION_KEY detected in production.');
    }

    // Validate PostgreSQL Database Configuration
    resolveDatabaseConfiguration();
  } else {
    // Local dev: set secure-looking development defaults if missing
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'local-dev-jwt-secret-ruangtenang-32-chars-long-test-key';
    }
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = 'local-dev-aes-encryption-key-ruangtenang-32-chars-long';
    }
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'file:./prisma/ruangtenang_sqlite.db';
    }
  }
}

export function getValidatedJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';
  if (!secret) {
    if (isProd) {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET is missing in production execution.');
    }
    return 'local-dev-jwt-secret-ruangtenang-32-chars-long-test-key';
  }
  if (isProd && (secret.length < 32 || isKnownInsecureDemoSecret(secret))) {
    throw new Error('FATAL SECURITY ERROR: Insecure JWT_SECRET in production.');
  }
  return secret;
}

function isKnownInsecureDemoSecret(secret: string): boolean {
  return KNOWN_INSECURE_DEMO_SECRETS.some(s => secret.toLowerCase() === s.toLowerCase() || secret.toLowerCase().includes(s.toLowerCase()));
}

export function getValidatedEncryptionKey(version: string = 'v1'): Buffer {
  let rawKey: string | undefined;
  if (version === 'v1') {
    rawKey = process.env.DATA_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  } else {
    rawKey = process.env[`ENCRYPTION_KEY_${version.toUpperCase()}`] || process.env[`DATA_ENCRYPTION_KEY_${version.toUpperCase()}`];
  }

  const isProd = process.env.NODE_ENV === 'production';

  if (!rawKey) {
    if (isProd) {
      throw new Error(`FATAL SECURITY ERROR: ENCRYPTION_KEY for version ${version} is missing in production.`);
    }
    rawKey = `local-dev-aes-encryption-key-ruangtenang-32-chars-long-${version}`;
  }

  if (isProd && (rawKey.length < 32 || isKnownInsecureDemoSecret(rawKey))) {
    throw new Error(`FATAL SECURITY ERROR: Insecure ENCRYPTION_KEY for version ${version} in production.`);
  }

  try {
    const key = Buffer.from(rawKey, 'base64');
    if (key.length === 32) {
      return key;
    }
  } catch {}

  // Derive 32-byte key deterministically from the passphrase string
  return crypto.createHash('sha256').update(rawKey).digest();
}
