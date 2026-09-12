import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { checkUserAiUsageLimit, rollbackUserAiQuota, getDailyUsageStats } from '../../services/aiUsageLimiter.js';

describe('AI Quota Concurrency & IP Anti-Spoofing Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('prevents race conditions during simultaneous requests when quota is near limit', async () => {
    vi.stubEnv('DAILY_AI_LIMIT_FREE', '5');

    const testUserId = `concurrent-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const testIp = `10.0.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;

    // Launch 10 simultaneous requests in parallel
    const promises = Array.from({ length: 10 }).map(() =>
      checkUserAiUsageLimit(testUserId, testIp, 'Free', 'student')
    );

    const results = await Promise.all(promises);

    const allowedCount = results.filter(r => r.allowed).length;
    const deniedCount = results.filter(r => !r.allowed).length;

    // Exactly 5 should be allowed and 5 denied
    expect(allowedCount).toBe(5);
    expect(deniedCount).toBe(5);

    // Verify DB count equals exactly 5
    const stats = await getDailyUsageStats(testUserId, testIp);
    expect(stats.maxUsage).toBe(5);
  });

  it('atomically enforces guest IP quotas under high concurrency', async () => {
    vi.stubEnv('DAILY_AI_LIMIT_FREE', '3');

    const guestIp = `192.168.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;

    // Launch 8 simultaneous requests for guest IP
    const promises = Array.from({ length: 8 }).map(() =>
      checkUserAiUsageLimit('guest', guestIp, 'Free', 'guest')
    );

    const results = await Promise.all(promises);

    const allowed = results.filter(r => r.allowed);
    const denied = results.filter(r => !r.allowed);

    expect(allowed.length).toBe(3);
    expect(denied.length).toBe(5);

    const stats = await getDailyUsageStats('guest', guestIp);
    expect(stats.ipUsage).toBe(3);
  });

  it('correctly rolls back quota reservation if request fails before AI processing', async () => {
    vi.stubEnv('DAILY_AI_LIMIT_FREE', '1');

    const testUserId = `rollback-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const testIp = `10.1.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;

    // First request consumes the 1 slot
    const check1 = await checkUserAiUsageLimit(testUserId, testIp, 'Free', 'student');
    expect(check1.allowed).toBe(true);

    // Second request is denied
    const check2 = await checkUserAiUsageLimit(testUserId, testIp, 'Free', 'student');
    expect(check2.allowed).toBe(false);

    // Simulate request 1 failing validation and rolling back
    await rollbackUserAiQuota(testUserId, testIp);

    // Third request should now succeed as the slot was freed
    const check3 = await checkUserAiUsageLimit(testUserId, testIp, 'Free', 'student');
    expect(check3.allowed).toBe(true);
  });

  it('prevents guest quota bypass via spoofed X-Forwarded-For headers', async () => {
    vi.stubEnv('DAILY_AI_LIMIT_FREE', '2');

    const app = express();
    app.set('trust proxy', 1);
    app.use(express.json());

    app.post('/api/test-chat', async (req: Request, res: Response) => {
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const check = await checkUserAiUsageLimit('guest', clientIp, 'Free', 'guest');
      if (!check.allowed) {
        return res.status(429).json({ error: 'DAILY_LIMIT_EXCEEDED', message: check.message });
      }
      return res.json({ success: true, usage: check.dailyUsage });
    });

    const proxyIp = `203.0.113.${Math.floor(Math.random() * 200 + 10)}`;

    // Send 2 legitimate requests from same proxy IP
    const res1 = await request(app).post('/api/test-chat').set('X-Forwarded-For', proxyIp);
    expect(res1.status).toBe(200);

    const res2 = await request(app).post('/api/test-chat').set('X-Forwarded-For', proxyIp);
    expect(res2.status).toBe(200);

    // Attacker tries to append/spoof extra IPs in X-Forwarded-For header to bypass limit
    const res3Spoofed = await request(app)
      .post('/api/test-chat')
      .set('X-Forwarded-For', `1.1.1.1, ${proxyIp}`);

    // Express with trust proxy 1 evaluates the client IP based on trusted proxy hops and enforces limit
    expect(res3Spoofed.status).toBe(429);
    expect(res3Spoofed.body.error).toBe('DAILY_LIMIT_EXCEEDED');
  });
});
