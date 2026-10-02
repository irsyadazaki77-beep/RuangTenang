import { afterEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { validateEnvironment, getValidatedTurnConfig } from '../../config/envValidation.js';
import { centralizedErrorHandler } from '../../apiV1Helpers.js';
import { authService } from '../../services/authService.js';
import { logger } from '../../utils/logger.js';

const originalEnv = { ...process.env };

function setValidProductionEnvironment() {
  process.env.NODE_ENV = 'production';
  delete process.env.PREVIEW_MODE;
  delete process.env.IS_AI_STUDIO_PREVIEW;
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  process.env.BLIND_INDEX_SECRET = crypto.randomBytes(32).toString('hex');
  process.env.DATABASE_URL = 'postgresql://fixture:fixture@localhost:5432/fixture';
  delete process.env.TURN_URL;
  delete process.env.TURN_USERNAME;
  delete process.env.TURN_SHARED_SECRET;
  delete process.env.TURN_CREDENTIAL;
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe('Fase 12 production secrets hardening', () => {
  it.each(['JWT_SECRET', 'ENCRYPTION_KEY', 'BLIND_INDEX_SECRET', 'DATABASE_URL'])(
    'fails production validation when required %s is missing, including preview mode',
    (name) => {
      setValidProductionEnvironment();
      delete process.env[name];
      process.env.PREVIEW_MODE = 'true';
      expect(() => validateEnvironment()).toThrow();
    }
  );

  it('keeps Gemini optional and TURN disabled unless configured', () => {
    setValidProductionEnvironment();
    delete process.env.GEMINI_API_KEY;
    expect(() => validateEnvironment()).not.toThrow();
    expect(getValidatedTurnConfig()).toBeNull();
  });

  it('rejects wildcard CORS origins when production credentials are enabled', () => {
    setValidProductionEnvironment();
    process.env.CORS_ALLOWED_ORIGINS = '*';
    expect(() => validateEnvironment()).toThrow(/Wildcard CORS origins are not allowed/);
  });

  it('derives one hour TURN REST credentials from the server-only shared secret', () => {
    setValidProductionEnvironment();
    process.env.TURN_URL = 'turn:turn.example.test:3478';
    process.env.TURN_USERNAME = 'fixture-user';
    process.env.TURN_SHARED_SECRET = crypto.randomBytes(32).toString('hex');
    const config = getValidatedTurnConfig();
    expect(config?.url).toBe(process.env.TURN_URL);
    expect(config?.username).toMatch(/^\d+:fixture-user$/);
    expect(Number(config?.username?.split(':')[0])).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(config?.credential).toBe(crypto.createHmac('sha1', process.env.TURN_SHARED_SECRET!).update(config!.username!).digest('base64'));
    expect(config?.credential).not.toBe(process.env.TURN_SHARED_SECRET);
  });

  it('rejects legacy static TURN credentials in production', () => {
    setValidProductionEnvironment();
    process.env.TURN_URL = 'turn:turn.example.test:3478';
    process.env.TURN_SHARED_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.TURN_CREDENTIAL = 'legacy-fixture-turn-credential';
    expect(() => validateEnvironment()).toThrow(/Static or insecure TURN credentials/);
  });

  it('returns safe production errors and omits exception messages from logs', () => {
    process.env.NODE_ENV = 'production';
    const secretMarker = 'fixture-secret-must-never-appear';
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response: { status?: number; body?: unknown } = {};
    const res = {
      status(code: number) { response.status = code; return this; },
      json(body: unknown) { response.body = body; return this; }
    };
    const req = { requestId: 'request-fixture', originalUrl: '/api/fixture', url: '/api/fixture', method: 'GET' };
    centralizedErrorHandler(new Error(`database password=${secretMarker}`), req as never, res as never, (() => undefined) as never);
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain(secretMarker);
    expect(consoleSpy.mock.calls.flat().join(' ')).not.toContain(secretMarker);
  });

  it('does not expose messages from production client errors either', () => {
    process.env.NODE_ENV = 'production';
    const secretMarker = 'fixture-path-or-secret-on-4xx';
    const response: { body?: unknown } = {};
    const res = {
      status() { return this; },
      json(body: unknown) { response.body = body; return this; }
    };
    const req = { requestId: 'request-fixture', originalUrl: '/api/fixture', url: '/api/fixture', method: 'GET' };
    centralizedErrorHandler(Object.assign(new Error(secretMarker), { statusCode: 400 }), req as never, res as never, (() => undefined) as never);
    expect(JSON.stringify(response.body)).not.toContain(secretMarker);
  });

  it('does not write underlying exception messages to production logs', () => {
    process.env.NODE_ENV = 'production';
    const secretMarker = 'fixture-api-key-never-log';
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logger.error('fixture-event', new Error(secretMarker));
    expect(consoleSpy.mock.calls.flat().join(' ')).not.toContain(secretMarker);
  });

  it('sets production authentication cookies as HttpOnly, Secure and SameSite=Lax', () => {
    process.env.NODE_ENV = 'production';
    const cookieOptions: Array<Record<string, unknown>> = [];
    const res = {
      cookie(_name: string, _value: string, options: Record<string, unknown>) { cookieOptions.push(options); return this; },
      clearCookie() { return this; }
    };
    authService.setSessionCookie(res as never, 'fixture-token');
    expect(cookieOptions.length).toBeGreaterThan(0);
    for (const options of cookieOptions) {
      expect(options.httpOnly).toBe(true);
      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe('lax');
    }
  });

  it('excludes production env files from Docker build context and does not mount them', () => {
    const dockerignore = fs.readFileSync(path.resolve(process.cwd(), '.dockerignore'), 'utf8');
    const compose = fs.readFileSync(path.resolve(process.cwd(), 'docker-compose.prod.yml'), 'utf8');
    const dockerfile = fs.readFileSync(path.resolve(process.cwd(), 'Dockerfile'), 'utf8');
    const viteConfig = fs.readFileSync(path.resolve(process.cwd(), 'vite.config.ts'), 'utf8');
    expect(dockerignore).toMatch(/^\.env\*/m);
    expect(dockerignore).toMatch(/^!\.env\.example$/m);
    expect(compose).not.toMatch(/\.env\.production\s*:/i);
    expect(compose).toContain('DATABASE_URL: ${DATABASE_URL:?DATABASE_URL is required}');
    expect(dockerfile).not.toMatch(/^ARG\s+(JWT_SECRET|ENCRYPTION_KEY|BLIND_INDEX_SECRET|DATABASE_URL|GEMINI_API_KEY)/mi);
    expect(dockerfile).not.toMatch(/^ENV\s+(JWT_SECRET|ENCRYPTION_KEY|BLIND_INDEX_SECRET|DATABASE_URL|GEMINI_API_KEY)/mi);
    expect(viteConfig).toContain("envPrefix: 'VITE_PUBLIC_'");
  });
});
