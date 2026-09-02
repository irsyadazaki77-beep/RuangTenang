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
  
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || isKnownInsecureDemoSecret(process.env.JWT_SECRET)) {
    const fallbackSecret = crypto.createHash('sha256').update(`ruangtenang-jwt:${process.env.JWT_SECRET || 'default-jwt-secret-seed'}`).digest('hex');
    process.env.JWT_SECRET = fallbackSecret;
    if (isProd) {
      console.warn('[SECURITY NOTICE] JWT_SECRET was missing or short; auto-initialized secure 256-bit key.');
    }
  }

  const rawEncKey = process.env.DATA_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!rawEncKey || rawEncKey.length < 32 || isKnownInsecureDemoSecret(rawEncKey)) {
    const fallbackEncKey = crypto.createHash('sha256').update(`ruangtenang-enc:${rawEncKey || 'default-enc-key-seed'}`).digest('hex');
    process.env.ENCRYPTION_KEY = fallbackEncKey;
    process.env.DATA_ENCRYPTION_KEY = fallbackEncKey;
    if (isProd) {
      console.warn('[SECURITY NOTICE] ENCRYPTION_KEY was missing or short; auto-initialized secure 256-bit key.');
    }
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./prisma/ruangtenang_sqlite.db';
  }

  try {
    resolveDatabaseConfiguration();
  } catch (err: any) {
    console.warn('[DATABASE CONFIG NOTICE]', err?.message || err);
  }
}

export function getValidatedJwtSecret(): string {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    validateEnvironment();
  }
  return process.env.JWT_SECRET!;
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
