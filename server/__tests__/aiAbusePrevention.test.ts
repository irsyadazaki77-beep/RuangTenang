import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { aiAbuseLimiter, resetAbuseState } from '../middleware/aiAbuseLimiter.js';

const app = express();
app.set('trust proxy', true);
app.use(express.json());

// Dummy auth middleware to inject user when needed
app.use((req: any, res, next) => {
  if (req.headers['x-mock-auth']) {
    req.user = { userId: 'user-123' };
  }
  next();
});

app.post('/api/chat/stream', aiAbuseLimiter, (req: Request, res: Response) => {
  res.json({ success: true, message: 'Stream response' });
});

describe('AI Abuse Prevention & Rate Limiting', () => {
  beforeEach(() => {
    resetAbuseState();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('enforces lower burst limit for anonymous users', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/api/chat/stream').send({ message: 'test' });
      expect(res.status).not.toBe(429);
    }
    const res429 = await request(app).post('/api/chat/stream').send({ message: 'test' });
    expect(res429.status).toBe(429);
    expect(res429.body.code).toBe('RATE_LIMITED');
  });

  it('allows higher burst for authenticated users', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/chat/stream')
        .set('x-mock-auth', 'true')
        .send({ message: 'test' });
      expect(res.status).not.toBe(429);
    }
  });

  it('enforces global circuit breaker when budget exceeded', async () => {
    vi.stubEnv('GLOBAL_AI_BUDGET', '2');
    
    await request(app).post('/api/chat/stream').send({ message: '1' });
    await request(app).post('/api/chat/stream').send({ message: '2' });
    
    const res = await request(app).post('/api/chat/stream').send({ message: '3' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('GLOBAL_AI_LIMIT_REACHED');
  });

  it('tracks IP and client fingerprint separately for anonymous users to prevent simple rotation bypass', async () => {
    // We send 3 requests to exhaust the burst limit for anon.
    await request(app).post('/api/chat/stream').set('x-forwarded-for', '1.1.1.1').set('x-anonymous-id', 'client-a').send({ message: '1' });
    await request(app).post('/api/chat/stream').set('x-forwarded-for', '1.1.1.1').set('x-anonymous-id', 'client-a').send({ message: '1' });
    await request(app).post('/api/chat/stream').set('x-forwarded-for', '1.1.1.1').set('x-anonymous-id', 'client-a').send({ message: '1' });
    
    // Attacker rotates fingerprint but keeps same IP -> should be blocked by IP
    const resSameIp = await request(app).post('/api/chat/stream').set('x-forwarded-for', '1.1.1.1').set('x-anonymous-id', 'client-b').send({ message: '1' });
    expect(resSameIp.status).toBe(429);
    
    // Attacker rotates IP but keeps same fingerprint -> should be blocked by fingerprint
    const resSameFinger = await request(app).post('/api/chat/stream').set('x-forwarded-for', '2.2.2.2').set('x-anonymous-id', 'client-a').send({ message: '1' });
    expect(resSameFinger.status).toBe(429);

    // Normal user with completely different IP and different fingerprint -> allowed
    const resNormal = await request(app).post('/api/chat/stream').set('x-forwarded-for', '3.3.3.3').set('x-anonymous-id', 'client-c').send({ message: '1' });
    expect(resNormal.status).not.toBe(429);
  });
});
