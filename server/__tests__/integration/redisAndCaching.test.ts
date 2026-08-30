import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { redisService } from '../../services/redisService.js';
import { DistributedStateService } from '../../services/distributedStateService.js';
import { DistributedLockService } from '../../services/distributedLockService.js';
import counselorsRouter from '../../routes/counselors.js';
import appointmentsRouter from '../../routes/appointments.js';
import { prisma } from '../../database.js';

const app = express();
app.use(express.json());
app.use('/api/v1/counselors', counselorsRouter);
app.use('/api/counselors', counselorsRouter);
app.use('/api/appointments', appointmentsRouter);

describe('Redis & Caching Layer Integration Tests (Task Phase 1)', () => {
  beforeEach(async () => {
    await redisService.flush();
    redisService.forceOffline(false);
  });

  afterAll(async () => {
    await redisService.flush();
  });

  describe('a. Cache Hit/Miss and TTL Expiration', () => {
    it('handles cache set, hit, miss, and TTL expiration correctly', async () => {
      const key = 'test:cache:ttl';
      const payload = { id: 101, name: 'Budi Test' };

      // Cache Miss initially
      const missVal = await redisService.get(key);
      expect(missVal).toBeNull();

      // Set key with 1 second TTL
      await redisService.set(key, payload, 1);

      // Cache Hit
      const hitVal = await redisService.get<{ id: number; name: string }>(key);
      expect(hitVal).toBeDefined();
      expect(hitVal?.name).toBe('Budi Test');

      // Wait 1.1s for TTL expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Expired -> Cache Miss
      const expiredVal = await redisService.get(key);
      expect(expiredVal).toBeNull();
    });

    it('returns X-Cache: MISS on first GET /api/v1/counselors and X-Cache: HIT on subsequent request', async () => {
      await prisma.counselors.deleteMany({ where: { id: 'c-test-cache-1' } });
      await prisma.counselors.create({
        data: {
          id: 'c-test-cache-1',
          name: 'Dr. Test Cache',
          role: 'Psikolog Test',
          specialties: JSON.stringify(['Anxiety']),
          imageUrl: 'https://example.com/c.jpg',
          availability: JSON.stringify(['Senin']),
          rating: 4.8,
          isVerified: true,
          licenseNumber: 'SIPP: 12345678',
        },
      });

      // First Request -> MISS
      const res1 = await request(app).get('/api/v1/counselors?page=1&limit=10');
      expect(res1.status).toBe(200);
      expect(res1.headers['x-cache']).toBe('MISS');

      // Second Request -> HIT
      const res2 = await request(app).get('/api/v1/counselors?page=1&limit=10');
      expect(res2.status).toBe(200);
      expect(res2.headers['x-cache']).toBe('HIT');

      await prisma.counselors.deleteMany({ where: { id: 'c-test-cache-1' } });
    });
  });

  describe('b. Graceful In-Memory Fallback when Redis is Offline', () => {
    it('fallback seamlessly to in-memory cache when Redis is forced offline', async () => {
      redisService.forceOffline(true);
      expect(await redisService.isHealthy()).toBe(false);

      const key = 'fallback:test:key';
      const val = { status: 'in-memory-active' };

      await redisService.set(key, val, 60);

      const retrieved = await redisService.get<{ status: string }>(key);
      expect(retrieved).toBeDefined();
      expect(retrieved?.status).toBe('in-memory-active');

      await redisService.del(key);
      expect(await redisService.get(key)).toBeNull();
    });

    it('DistributedStateService operates properly when Redis is offline', async () => {
      redisService.forceOffline(true);

      const category = 'RATE_LIMIT_OFFLINE';
      const userKey = 'usr-test-offline-123';

      const res1 = await DistributedStateService.checkRateLimit(userKey, 3, 60, category);
      expect(res1.allowed).toBe(true);
      expect(res1.count).toBe(1);

      const res2 = await DistributedStateService.checkRateLimit(userKey, 3, 60, category);
      expect(res2.allowed).toBe(true);
      expect(res2.count).toBe(2);

      const res3 = await DistributedStateService.checkRateLimit(userKey, 3, 60, category);
      expect(res3.allowed).toBe(true);
      expect(res3.count).toBe(3);

      const res4 = await DistributedStateService.checkRateLimit(userKey, 3, 60, category);
      expect(res4.allowed).toBe(false);
      expect(res4.count).toBe(4);
    });
  });

  describe('c. Race Condition Prevention on Cron Job Lock', () => {
    it('prevents multiple instances from acquiring the same active lock concurrently', async () => {
      const lockId = 'cron-retention-job-lock';

      // Instance 1 acquires lock
      const acquired1 = await DistributedLockService.acquireLock(lockId, 60, 'worker-node-1');
      expect(acquired1).toBe(true);

      // Instance 2 attempts to acquire same lock
      const acquired2 = await DistributedLockService.acquireLock(lockId, 60, 'worker-node-2');
      expect(acquired2).toBe(false);

      // Instance 1 releases lock
      const released = await DistributedLockService.releaseLock(lockId, 'worker-node-1');
      expect(released).toBe(true);

      // Instance 2 can now acquire lock
      const acquired2AfterRelease = await DistributedLockService.acquireLock(lockId, 60, 'worker-node-2');
      expect(acquired2AfterRelease).toBe(true);

      await DistributedLockService.releaseLock(lockId, 'worker-node-2');
    });

    it('ensures withLock executes action exclusively for only one concurrent task', async () => {
      const lockId = 'cron-retention-withlock-test';
      let executionCount = 0;

      const task1 = DistributedLockService.withLock(lockId, 10, async () => {
        executionCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'task1-done';
      });

      const task2 = DistributedLockService.withLock(lockId, 10, async () => {
        executionCount += 1;
        return 'task2-done';
      });

      const [res1, res2] = await Promise.all([task1, task2]);

      // Exactly one task executed successfully
      const executedResults = [res1, res2].filter((r) => r.executed);
      expect(executedResults.length).toBe(1);
      expect(executionCount).toBe(1);
    });
  });
});
