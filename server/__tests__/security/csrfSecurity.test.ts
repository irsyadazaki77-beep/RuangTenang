import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';
import { csrfProtection, csrfRouter } from '../../middleware/csrf.js';

describe('CSRF Security Middleware Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    process.env.NODE_ENV = 'production';
    process.env.APP_ORIGIN = 'https://ruangtenang.ui.ac.id';

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api', csrfRouter);
    app.use(csrfProtection);

    app.get('/api/resource', (req, res) => {
      res.json({ success: true, method: 'GET' });
    });

    app.post('/api/resource', (req, res) => {
      res.json({ success: true, method: 'POST' });
    });
  });

  afterAll(() => {
    delete process.env.APP_ORIGIN;
    process.env.NODE_ENV = 'test';
  });

  it('should generate a valid CSRF token and set XSRF-TOKEN cookie', async () => {
    const res = await supertest(app).get('/api/csrf-token');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.csrfToken).toBeDefined();
    expect(res.body.csrfToken.length).toBe(64); // 32 bytes in hex = 64 characters
    
    const setCookie = res.headers['set-cookie']?.[0];
    expect(setCookie).toContain('XSRF-TOKEN=');
  });

  it('should allow GET requests without origin (safe method)', async () => {
    const res = await supertest(app).get('/api/resource');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should allow POST requests with pure Bearer token without session cookie', async () => {
    const res = await supertest(app)
      .post('/api/resource')
      .set('Authorization', 'Bearer dummy-token');
    expect(res.status).toBe(200);
  });

  it('should REJECT POST request with session cookie if Origin is missing in production and csrf-token is also missing', async () => {
    const res = await supertest(app)
      .post('/api/resource')
      .set('Cookie', ['ruangtenang_session=valid-session-cookie']);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_ORIGIN_MISSING');
  });

  it('should REJECT POST request with session cookie if Origin is untrusted', async () => {
    const res = await supertest(app)
      .post('/api/resource')
      .set('Cookie', ['ruangtenang_session=valid-session-cookie', 'XSRF-TOKEN=valid-token'])
      .set('x-csrf-token', 'valid-token')
      .set('Origin', 'https://malicious-site.com');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_FORBIDDEN');
  });

  it('should REJECT POST request if CSRF token cookie and header mismatch', async () => {
    const res = await supertest(app)
      .post('/api/resource')
      .set('Cookie', ['ruangtenang_session=valid-session-cookie', 'XSRF-TOKEN=token-a'])
      .set('x-csrf-token', 'token-b')
      .set('Origin', 'https://ruangtenang.ui.ac.id');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_FORBIDDEN');
  });

  it('should REJECT POST request if CSRF token is missing completely', async () => {
    const res = await supertest(app)
      .post('/api/resource')
      .set('Cookie', ['ruangtenang_session=valid-session-cookie'])
      .set('Origin', 'https://ruangtenang.ui.ac.id');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_FORBIDDEN');
  });

  it('should ALLOW POST request with session cookie if Origin matches APP_ORIGIN and CSRF token is valid', async () => {
    const res = await supertest(app)
      .post('/api/resource')
      .set('Cookie', ['ruangtenang_session=valid-session-cookie', 'XSRF-TOKEN=valid-token'])
      .set('x-csrf-token', 'valid-token')
      .set('Origin', 'https://ruangtenang.ui.ac.id');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should ALLOW POST request from platform preview domain without session cookie', async () => {
    const res = await supertest(app)
      .post('/api/resource')
      .set('Host', 'ais-dev-ygw5xydfvpld32tbemu5xl-120957595740.asia-southeast1.run.app')
      .set('Origin', 'https://ais-dev-ygw5xydfvpld32tbemu5xl-120957595740.asia-southeast1.run.app')
      .set('x-requested-with', 'XMLHttpRequest');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should ALLOW POST request from ai.studio preview origin', async () => {
    const res = await supertest(app)
      .post('/api/resource')
      .set('Origin', 'https://ai.studio')
      .set('x-requested-with', 'XMLHttpRequest');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
