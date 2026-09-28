import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnvironment, getValidatedJwtSecret, getValidatedEncryptionKey } from '../../config/envValidation.js';
import { resolveDatabaseConfiguration } from '../../config/databaseConfig.js';

describe('FASE 3: Production Secrets & Fail-Closed Security Tests', () => {
  const snapshotEnv = { ...process.env };

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshotEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, snapshotEnv);
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshotEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, snapshotEnv);
  });

  it('1. Missing JWT_SECRET in production throws fatal startup error', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.IS_AI_STUDIO_PREVIEW;
    delete process.env.PREVIEW_MODE;
    delete process.env.JWT_SECRET;
    process.env.ENCRYPTION_KEY = 'valid-production-encryption-key-32-chars!!';
    process.env.BLIND_INDEX_SECRET = 'valid-production-blind-index-key-32-chars!!';
    process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';

    expect(() => validateEnvironment()).toThrow(/JWT_SECRET environment variable is missing/i);
    expect(() => getValidatedJwtSecret()).toThrow(/FATAL SECURITY ERROR: JWT_SECRET/i);
  });

  it('2. Insecure or demo JWT_SECRET in production throws fatal startup error', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.IS_AI_STUDIO_PREVIEW;
    delete process.env.PREVIEW_MODE;
    process.env.JWT_SECRET = 'secret'; // Short & insecure demo secret
    process.env.ENCRYPTION_KEY = 'valid-production-encryption-key-32-chars!!';
    process.env.BLIND_INDEX_SECRET = 'valid-production-blind-index-key-32-chars!!';
    process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';

    expect(() => validateEnvironment()).toThrow(/JWT_SECRET must be at least 32 characters long|Insecure demo JWT_SECRET/i);
  });

  it('3. Missing ENCRYPTION_KEY in production throws fatal startup error', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.IS_AI_STUDIO_PREVIEW;
    delete process.env.PREVIEW_MODE;
    process.env.JWT_SECRET = 'valid-production-jwt-secret-32-chars-long!!';
    delete process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_SECRET;
    delete process.env.DATA_ENCRYPTION_KEY;
    process.env.BLIND_INDEX_SECRET = 'valid-production-blind-index-key-32-chars!!';
    process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';

    expect(() => validateEnvironment()).toThrow(/ENCRYPTION_KEY environment variable is missing/i);
    expect(() => getValidatedEncryptionKey()).toThrow(/FATAL SECURITY ERROR: Encryption key/i);
  });

  it('4. Missing BLIND_INDEX_SECRET in production throws fatal startup error', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.IS_AI_STUDIO_PREVIEW;
    delete process.env.PREVIEW_MODE;
    process.env.JWT_SECRET = 'valid-production-jwt-secret-32-chars-long!!';
    process.env.ENCRYPTION_KEY = 'valid-production-encryption-key-32-chars!!';
    delete process.env.BLIND_INDEX_SECRET;
    process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';

    expect(() => validateEnvironment()).toThrow(/BLIND_INDEX_SECRET environment variable is missing/i);
  });

  it('5. Insecure TURN credentials in production throws fatal startup error', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.IS_AI_STUDIO_PREVIEW;
    delete process.env.PREVIEW_MODE;
    process.env.JWT_SECRET = 'valid-production-jwt-secret-32-chars-long!!';
    process.env.ENCRYPTION_KEY = 'valid-production-encryption-key-32-chars!!';
    process.env.BLIND_INDEX_SECRET = 'valid-production-blind-index-key-32-chars!!';
    process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
    process.env.TURN_URL = 'turn:turn.ruangtenang.ui.ac.id:3478';
    process.env.TURN_USERNAME = 'ruangtenang_secure_user';
    process.env.TURN_CREDENTIAL = 'secret_password_here'; // Hardcoded demo password

    expect(() => validateEnvironment()).toThrow(/Insecure demo TURN_CREDENTIAL/i);
  });

  it('6. Production database requiring SQLite file throws fatal startup error', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.IS_AI_STUDIO_PREVIEW;
    delete process.env.PREVIEW_MODE;
    process.env.DATABASE_URL = 'file:./prisma/ruangtenang_sqlite.db';

    expect(() => resolveDatabaseConfiguration()).toThrow(/Production database requires PostgreSQL/i);
  });

  it('7. Valid production secrets pass environment validation cleanly', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.IS_AI_STUDIO_PREVIEW;
    delete process.env.PREVIEW_MODE;
    process.env.JWT_SECRET = 'prod-jwt-secret-key-that-is-at-least-32-characters-long!!';
    process.env.ENCRYPTION_KEY = 'prod-encryption-secret-key-that-is-32-characters!!';
    process.env.BLIND_INDEX_SECRET = 'prod-blind-index-secret-key-that-is-32-characters!!';
    process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';

    expect(() => validateEnvironment()).not.toThrow();
  });
});
