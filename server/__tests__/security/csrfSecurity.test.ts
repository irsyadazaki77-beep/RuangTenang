import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';
import { csrfProtection } from '../../middleware/csrf.js';

describe('CSRF Security Middleware Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    process.env.NODE_ENV = 'production';
    process.env.APP_ORIGIN = 'https://ruangtenang.ui.ac.id';

    app = express();
    app.use(express.json());
    app.use(cookieParser());
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

  it('should REJECT POST request with session cookie if Origin is missing in production', async () => {
    const res = await supertest(app)
      .post('/api/resource')
      .set('Cookie', ['ruangtenang_session=valid-session-cookie']);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_ORIGIN_MISSING');
  });

  it('should REJECT POST request with session cookie if Origin is untrusted', async () => {
    const res = await supertest(app)
      .post('/api/resource')
      .set('Cookie', ['ruangtenang_session=valid-session-cookie'])
      .set('Origin', 'https://malicious-site.com');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_FORBIDDEN');
  });

  it('should ALLOW POST request with session cookie if Origin matches APP_ORIGIN', async () => {
    const res = await supertest(app)
      .post('/api/resource')
      .set('Cookie', ['ruangtenang_session=valid-session-cookie'])
      .set('Origin', 'https://ruangtenang.ui.ac.id');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
