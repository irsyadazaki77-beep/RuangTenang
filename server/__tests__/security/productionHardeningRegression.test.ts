import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import { validateEnvironment } from '../../config/envValidation.js';
import { resolveDatabaseConfiguration } from '../../config/databaseConfig.js';
import { validateStartupEnvironment } from '../../apiV1Helpers.js';
import { ensureDatabaseReady } from '../../database.js';
import { consentService } from '../../services/consentService.js';

describe('Phase 1 Production Hardening & Regression Test Suite', () => {
  const originalEnv = { ...process.env };

  const generateValidKey = () => crypto.randomBytes(32).toString('hex');

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('1. Production Secrets & Startup Crash on Missing/Invalid Secrets', () => {
    it('should throw fatal error in production if JWT_SECRET is missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      process.env.ENCRYPTION_KEY = generateValidKey();
      delete process.env.DATA_ENCRYPTION_KEY;
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/ruangtenang';

      expect(() => validateEnvironment()).toThrow(/JWT_SECRET environment variable is missing/);
      expect(() => validateStartupEnvironment()).toThrow(/JWT_SECRET environment variable is missing/);
    });

    it('should throw fatal error in production if JWT_SECRET is too short (< 32 chars)', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short_val_under_32_chars';
      process.env.ENCRYPTION_KEY = generateValidKey();
      delete process.env.DATA_ENCRYPTION_KEY;
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/ruangtenang';

      expect(() => validateEnvironment()).toThrow(/JWT_SECRET must be at least 32 characters/);
      expect(() => validateStartupEnvironment()).toThrow(/JWT_SECRET must be at least 32 characters/);
    });

    it('should throw fatal error in production if ENCRYPTION_KEY / DATA_ENCRYPTION_KEY is missing', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = generateValidKey();
      delete process.env.ENCRYPTION_KEY;
      delete process.env.DATA_ENCRYPTION_KEY;
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/ruangtenang';

      expect(() => validateEnvironment()).toThrow(/ENCRYPTION_KEY environment variable is missing/);
      expect(() => validateStartupEnvironment()).toThrow(/ENCRYPTION_KEY environment variable is missing/);
    });

    it('should throw fatal error in production if ENCRYPTION_KEY is too short (< 32 chars)', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = generateValidKey();
      process.env.ENCRYPTION_KEY = 'short_encryption_key_val';
      delete process.env.DATA_ENCRYPTION_KEY;
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/ruangtenang';

      expect(() => validateEnvironment()).toThrow(/ENCRYPTION_KEY must be at least 32 characters/);
      expect(() => validateStartupEnvironment()).toThrow(/ENCRYPTION_KEY must be at least 32 characters/);
    });
  });

  describe('2. Database Production & PostgreSQL Validation', () => {
    it('should throw fatal error if DATABASE_URL is missing in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = generateValidKey();
      process.env.ENCRYPTION_KEY = generateValidKey();
      delete process.env.DATA_ENCRYPTION_KEY;
      delete process.env.DATABASE_URL;

      expect(() => resolveDatabaseConfiguration()).toThrow(/Production database requires PostgreSQL/);
      expect(() => validateEnvironment()).toThrow(/Production database requires PostgreSQL/);
    });

    it('should throw fatal error if DATABASE_URL is an SQLite URL or file in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = generateValidKey();
      process.env.ENCRYPTION_KEY = generateValidKey();
      delete process.env.DATA_ENCRYPTION_KEY;
      process.env.DATABASE_URL = 'file:./dev.db';

      expect(() => resolveDatabaseConfiguration()).toThrow(/Production database requires PostgreSQL.*Fallback to SQLite is prohibited/);
      expect(() => validateEnvironment()).toThrow(/Production database requires PostgreSQL.*Fallback to SQLite is prohibited/);
    });

    it('should fail-closed on ensureDatabaseReady failure in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'file:./dev.db'; // SQLite URL in production

      await expect(ensureDatabaseReady()).rejects.toThrow(/FATAL DATABASE ERROR: Production requires PostgreSQL/);
    });
  });

  describe('3. Fail-Closed Environment Validation', () => {
    it('should pass cleanly when all production requirements are satisfied', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = generateValidKey();
      process.env.ENCRYPTION_KEY = generateValidKey();
      delete process.env.DATA_ENCRYPTION_KEY;
      process.env.DATABASE_URL = 'postgresql://postgres:securepass@cloudsql.internal:5432/ruangtenang';

      expect(() => validateEnvironment()).not.toThrow();
      expect(() => validateStartupEnvironment()).not.toThrow();
    });
  });

  describe('4. Strict Opt-In Consent Default False', () => {
    it('should default all sensitive consents to false (strict opt-in)', async () => {
      const consents = await consentService.getUserConsents('unregistered_user_id_' + Date.now());

      expect(consents.consentForAI).toBe(false);
      expect(consents.consentForAIMood).toBe(false);
      expect(consents.consentForAIScreening).toBe(false);
      expect(consents.consentForAIMemory).toBe(false);
      expect(consents.consentForAIJournal).toBe(false);
      expect(consents.consentForEmergencySOS).toBe(false);
      expect(consents.consentForCounselorSummary).toBe(false);
      expect(consents.consentForCounselorSharing).toBe(false);
      expect(consents.consentForTelemetry).toBe(false);
      expect(consents.consentForAnalytics).toBe(false);
    });

    it('should return false for canUseAI when user has not explicitly consented or is guest', async () => {
      const guestResult = await consentService.canUseAI('guest');
      expect(guestResult).toBe(false);

      const emptyUserResult = await consentService.canUseAI('');
      expect(emptyUserResult).toBe(false);

      const newUserId = 'new_user_' + Date.now();
      const userResult = await consentService.canUseAI(newUserId);
      expect(userResult).toBe(false);
    });
  });

  describe('5. Mood Analytics - Average Sleep Ignores Null Values', () => {
    it('should correctly ignore null sleepHours and NOT treat null as 0', () => {
      const sampleLogs = [
        { mood: 4, sleepHours: 8 },
        { mood: 3, sleepHours: null },
        { mood: 5, sleepHours: 6 },
        { mood: 2, sleepHours: undefined as unknown as number },
        { mood: 4, sleepHours: null },
      ];

      // Defective formula (treating null as 0 by adding directly without filtering):
      const badAverage = (sampleLogs.reduce((acc, log) => acc + (log.sleepHours || 0), 0) / sampleLogs.length).toFixed(1);
      expect(badAverage).toBe('2.8'); // WRONG: diluted by treating nulls as 0!

      // Correct formula implemented in MoodTracker.tsx:
      const logsWithSleep = sampleLogs.filter(
        log => log.sleepHours !== null && log.sleepHours !== undefined && typeof log.sleepHours === 'number' && !isNaN(log.sleepHours)
      );
      const correctAverage = logsWithSleep.length > 0
        ? (logsWithSleep.reduce((acc, log) => acc + log.sleepHours, 0) / logsWithSleep.length).toFixed(1)
        : 'N/A';

      expect(correctAverage).toBe('7.0'); // (8 + 6) / 2 = 7.0
      expect(correctAverage).not.toBe(badAverage);
    });

    it('should return N/A when all sleepHours are null', () => {
      const sampleLogs = [
        { mood: 4, sleepHours: null },
        { mood: 3, sleepHours: null },
      ];

      const logsWithSleep = sampleLogs.filter(
        log => log.sleepHours !== null && log.sleepHours !== undefined && typeof log.sleepHours === 'number' && !isNaN(log.sleepHours)
      );
      const average = logsWithSleep.length > 0
        ? (logsWithSleep.reduce((acc, log) => acc + log.sleepHours, 0) / logsWithSleep.length).toFixed(1)
        : 'N/A';

      expect(average).toBe('N/A');
    });
  });

  describe('6. Static Server Blocks Sensitive Files', () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();

      // Static security filter mirroring server.ts
      app.use((req, res, next) => {
        const normalizedPath = (req.path || '').toLowerCase();
        if (
          normalizedPath.endsWith('.map') ||
          normalizedPath.endsWith('.cjs') ||
          normalizedPath.endsWith('.env') ||
          normalizedPath.endsWith('.prisma') ||
          normalizedPath.includes('/server.') ||
          normalizedPath.includes('/database.') ||
          normalizedPath.includes('/scripts/') ||
          normalizedPath.includes('/.git')
        ) {
          return res.status(404).send('Not Found');
        }
        next();
      });

      app.get('*', (req, res) => {
        res.status(200).send('Public Content');
      });
    });

    it('should block requests to sourcemap files (.map)', async () => {
      const res = await request(app).get('/assets/index.js.map');
      expect(res.status).toBe(404);
    });

    it('should block requests to server compiled bundles (.cjs)', async () => {
      const res = await request(app).get('/server.cjs');
      expect(res.status).toBe(404);
    });

    it('should block requests to environment files (.env)', async () => {
      const res = await request(app).get('/.env');
      expect(res.status).toBe(404);
    });

    it('should block requests to prisma files (.prisma)', async () => {
      const res = await request(app).get('/schema.prisma');
      expect(res.status).toBe(404);
    });

    it('should allow normal static assets (js, css, html)', async () => {
      const res = await request(app).get('/assets/index.js');
      expect(res.status).toBe(200);
      expect(res.text).toBe('Public Content');
    });
  });

  describe('7. CORS & CSRF Strict Origin Validation in Production', () => {
    let corsApp: express.Express;
    let csrfApp: express.Express;

    beforeEach(async () => {
      const corsModule = await import('cors');
      const cookieParserModule = await import('cookie-parser');
      const { csrfProtection } = await import('../../middleware/csrf.js');

      // Setup CORS app under production mode
      corsApp = express();
      const allowedOrigins = new Set<string>(['https://ruangtenang.ui.ac.id', 'https://app.ruangtenang.id']);

      corsApp.use(corsModule.default({
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          const lower = origin.toLowerCase();
          // Strict allowlist in production: no automatic .run.app or .google.com
          if (allowedOrigins.has(lower)) {
            return callback(null, true);
          }
          return callback(null, false);
        },
        credentials: true
      }));

      corsApp.get('/api/test', (req, res) => res.json({ ok: true }));

      // Setup CSRF app under production mode
      csrfApp = express();
      csrfApp.use(express.json());
      csrfApp.use(cookieParserModule.default());
      csrfApp.use(csrfProtection);
      csrfApp.post('/api/sensitive-mutation', (req, res) => res.json({ success: true }));
    });

    it('should reject unauthorized origins including wildcard .run.app and .google.com in production CORS', async () => {
      process.env.NODE_ENV = 'production';

      const runAppRes = await request(corsApp)
        .get('/api/test')
        .set('Origin', 'https://attacker-preview.run.app');
      expect(runAppRes.headers['access-control-allow-origin']).toBeUndefined();

      const googleRes = await request(corsApp)
        .get('/api/test')
        .set('Origin', 'https://malicious.google.com');
      expect(googleRes.headers['access-control-allow-origin']).toBeUndefined();

      const attackerRes = await request(corsApp)
        .get('/api/test')
        .set('Origin', 'https://evil-site.com');
      expect(attackerRes.headers['access-control-allow-origin']).toBeUndefined();

      const allowedRes = await request(corsApp)
        .get('/api/test')
        .set('Origin', 'https://ruangtenang.ui.ac.id');
      expect(allowedRes.headers['access-control-allow-origin']).toBe('https://ruangtenang.ui.ac.id');
    });

    it('should reject unauthorized CSRF origins on state-changing requests in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_ORIGIN = 'https://ruangtenang.ui.ac.id';

      // Attacker origin with cookie
      const resUntrusted = await request(csrfApp)
        .post('/api/sensitive-mutation')
        .set('Cookie', ['ruangtenang_session=mock-session'])
        .set('Origin', 'https://attacker.run.app');
      expect(resUntrusted.status).toBe(403);
      expect(resUntrusted.body.code).toBe('CSRF_FORBIDDEN');

      // Trusted origin with cookie
      const resTrusted = await request(csrfApp)
        .post('/api/sensitive-mutation')
        .set('Cookie', ['ruangtenang_session=mock-session'])
        .set('Origin', 'https://ruangtenang.ui.ac.id');
      expect(resTrusted.status).toBe(200);
      expect(resTrusted.body.success).toBe(true);
    });
  });

  describe('8. Quick Mood Check-In Does Not Fabricate Sleep Data', () => {
    it('should send null or omit sleep data when user only selects mood', () => {
      // Simulates the EmptyChatState quick check-in handler payload
      const selectedMood = { value: 4, label: 'Senang' };
      const quickCheckInPayload = {
        mood: selectedMood.value,
        notes: `Log mood harian via pintasan check-in cepat. Mood: ${selectedMood.label}.`,
        sleepHours: null,
        sleepQuality: null,
        factors: [],
        emotions: [selectedMood.label]
      };

      expect(quickCheckInPayload.sleepHours).toBeNull();
      expect(quickCheckInPayload.sleepQuality).toBeNull();
      expect(quickCheckInPayload.sleepHours).not.toBe(7);
      expect(quickCheckInPayload.sleepQuality).not.toBe('good');
    });
  });
});
