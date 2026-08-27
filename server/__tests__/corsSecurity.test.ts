import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import cors from 'cors';
import supertest from 'supertest';

describe('CORS Production Hardening Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    process.env.NODE_ENV = 'production';
    process.env.APP_ORIGIN = 'https://ruangtenang.ui.ac.id';
    process.env.CORS_ALLOWED_ORIGINS = 'https://app.ruangtenang.id';

    app = express();
    const isProd = process.env.NODE_ENV === 'production';
    
    const allowedOrigins = new Set<string>();
    if (process.env.APP_ORIGIN) allowedOrigins.add(process.env.APP_ORIGIN.trim().toLowerCase());
    if (process.env.CORS_ALLOWED_ORIGINS) {
      process.env.CORS_ALLOWED_ORIGINS.split(',').forEach(o => {
        if (o.trim()) allowedOrigins.add(o.trim().toLowerCase());
      });
    }

    app.use(cors({
      origin: (origin, callback) => {
        if (!origin) {
          if (isProd) return callback(new Error('CORS Blocked: Missing origin in production.'));
          return callback(null, true);
        }
        const lowerOrigin = origin.toLowerCase();
        if (isProd) {
          if (allowedOrigins.has(lowerOrigin)) return callback(null, true);
          return callback(new Error(`CORS Blocked: Origin ${origin} is not allowed.`));
        } else {
          const isAIStudioPreview = lowerOrigin.endsWith('.run.app') || lowerOrigin.endsWith('.studio') || lowerOrigin === 'https://ai.studio';
          if (allowedOrigins.has(lowerOrigin) || isAIStudioPreview) return callback(null, true);
          return callback(new Error(`CORS Blocked: Origin ${origin} is not allowed.`));
        }
      },
      credentials: true
    }));

    app.get('/api/test-cors', (req, res) => {
      res.json({ success: true });
    });
  });

  afterAll(() => {
    delete process.env.APP_ORIGIN;
    delete process.env.CORS_ALLOWED_ORIGINS;
    process.env.NODE_ENV = 'test';
  });

  it('should allow exact matched origin from APP_ORIGIN in production', async () => {
    const res = await supertest(app)
      .get('/api/test-cors')
      .set('Origin', 'https://ruangtenang.ui.ac.id');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://ruangtenang.ui.ac.id');
  });

  it('should allow exact matched origin from CORS_ALLOWED_ORIGINS in production', async () => {
    const res = await supertest(app)
      .get('/api/test-cors')
      .set('Origin', 'https://app.ruangtenang.id');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://app.ruangtenang.id');
  });

  it('should REJECT preview domains like *.run.app in production mode', async () => {
    const res = await supertest(app)
      .get('/api/test-cors')
      .set('Origin', 'https://random-preview.aistudio-hub.run.app');
    expect(res.status).toBe(500); // CORS error handled by Express error handler
  });

  it('should REJECT lookalike domains in production mode', async () => {
    const res = await supertest(app)
      .get('/api/test-cors')
      .set('Origin', 'https://ruangtenang.ui.ac.id.attacker.com');
    expect(res.status).toBe(500);
  });
});
