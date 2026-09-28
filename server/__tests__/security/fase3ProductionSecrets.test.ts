import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateEnvironment,
  getValidatedJwtSecret,
  getValidatedEncryptionKey,
  getValidatedTurnConfig,
  isKnownInsecureDemoSecret
} from '../../config/envValidation.js';
import { resolveDatabaseConfiguration } from '../../config/databaseConfig.js';

describe('FASE 3 — Production Secrets & Fail-Closed Security Tests', () => {
  const snapshotEnv = { ...process.env };

  beforeEach(() => {
    // Reset process.env to clean snapshot before each test
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshotEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, snapshotEnv);
  });

  afterEach(() => {
    // Clean up process.env modifications
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshotEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, snapshotEnv);
  });

  it('missing JWT secret in production → startup fails', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.IS_AI_STUDIO_PREVIEW;
    delete process.env.PREVIEW_MODE;

    delete process.env.JWT_SECRET;
    process.env.ENCRYPTION_KEY = 'a-very-long-valid-encryption-key-for-prod-32chars!';
    process.env.BLIND_INDEX_SECRET = 'a-very-long-valid-blind-index-key-for-prod-32chars!';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    expect(() => validateEnvironment()).toThrow(/JWT_SECRET environment variable is missing/i);
    expect(() => getValidatedJwtSecret()).toThrow(/JWT_SECRET environment variable is missing/i);
  });

  it('insecure or demo JWT secret in production → startup fails', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.IS_AI_STUDIO_PREVIEW;
    delete process.env.PREVIEW_MODE;

    process.env.JWT_SECRET = 'supersecret_jwt_key_ruangtenang_2026';
    process.env.ENCRYPTION_KEY = 'a-very-long-valid-encryption-key-for-prod-32chars!';
    process.env.BLIND_INDEX_SECRET = 'a-very-long-valid-blind-index-key-for-prod-32chars!';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    expect(() => validateEnvironment()).toThrow(/Insecure demo JWT_SECRET detected/i);
  });

  it('missing encryption secret in production → startup fails', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.IS_AI_STUDIO_PREVIEW;
    delete process.env.PREVIEW_MODE;

    process.env.JWT_SECRET = 'a-very-long-valid-jwt-secret-key-for-prod-32chars!';
    delete process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_SECRET;
    delete process.env.DATA_ENCRYPTION_KEY;
    process.env.BLIND_INDEX_SECRET = 'a-very-long-valid-blind-index-key-for-prod-32chars!';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    expect(() => validateEnvironment()).toThrow(/ENCRYPTION_KEY environment variable is missing/i);
    expect(() => getValidatedEncryptionKey()).toThrow(/Encryption key environment variable is missing/i);
  });

  it('missing TURN credential when TURN is required in production → startup fails', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.IS_AI_STUDIO_PREVIEW;
    delete process.env.PREVIEW_MODE;

    process.env.JWT_SECRET = 'a-very-long-valid-jwt-secret-key-for-prod-32chars!';
    process.env.ENCRYPTION_KEY = 'a-very-long-valid-encryption-key-for-prod-32chars!';
    process.env.BLIND_INDEX_SECRET = 'a-very-long-valid-blind-index-key-for-prod-32chars!';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    process.env.REQUIRE_TURN = 'true';
    process.env.TURN_URL = 'turn:turn.example.com:3478';
    process.env.TURN_USERNAME = 'valid_user';
    delete process.env.TURN_CREDENTIAL;

    expect(() => validateEnvironment()).toThrow(/TURN_URL, TURN_USERNAME, and TURN_CREDENTIAL are required/i);
    expect(() => getValidatedTurnConfig()).toThrow(/TURN_URL, TURN_USERNAME, and TURN_CREDENTIAL are required/i);
  });

  it('non-PostgreSQL / SQLite database config in production → startup fails', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.IS_AI_STUDIO_PREVIEW;
    delete process.env.PREVIEW_MODE;

    process.env.DATABASE_URL = 'file:./prisma/ruangtenang_sqlite.db';

    expect(() => resolveDatabaseConfiguration()).toThrow(/Production database requires PostgreSQL/i);
  });

  it('isKnownInsecureDemoSecret correctly flags dangerous fallback patterns', () => {
    expect(isKnownInsecureDemoSecret('secret_password_here')).toBe(true);
    expect(isKnownInsecureDemoSecret('local-development-fallback')).toBe(true);
    expect(isKnownInsecureDemoSecret('fallback-secret-for-development')).toBe(true);
    expect(isKnownInsecureDemoSecret('super-secret-key')).toBe(true);
    expect(isKnownInsecureDemoSecret('ruangtenang_secure_user')).toBe(true);
    expect(isKnownInsecureDemoSecret('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')).toBe(true);
    expect(isKnownInsecureDemoSecret('a-random-secure-production-key-98347109283471029384712093')).toBe(false);
  });
});
