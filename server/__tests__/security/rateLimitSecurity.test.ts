import { describe, it, expect, vi, afterEach } from 'vitest';
import { DistributedRateLimitStore, getRateLimitStoreMetrics } from '../../middleware/rateLimiters.js';
import { redisService } from '../../services/redisService.js';
import {
  loginLimiter,
  registerLimiter,
  mfaLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  exportLimiter
} from '../../middleware/rateLimiters.js';

describe('Rate Limiters Configuration Tests', () => {
  it('should have proper rate limits configured for sensitive endpoints', () => {
    expect(loginLimiter).toBeDefined();
    expect(registerLimiter).toBeDefined();
    expect(mfaLimiter).toBeDefined();
    expect(passwordResetLimiter).toBeDefined();
    expect(emailVerificationLimiter).toBeDefined();
    expect(exportLimiter).toBeDefined();
  });
});

describe('Shared rate-limit storage resilience', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses atomic shared Redis counters when Redis is healthy', async () => {
    const store = new DistributedRateLimitStore();
    store.init({ windowMs: 60_000 } as any);
    const resetTime = new Date(Date.now() + 60_000);
    const redisCounter = vi.spyOn(redisService, 'incrementRateLimit').mockResolvedValue({ count: 2, resetTime });
    const result = await store.increment('user-key');
    expect(result.totalHits).toBe(2);
    expect(result.resetTime).toBe(resetTime);
    expect(redisCounter).toHaveBeenCalledOnce();
  });

  it('continues enforcing limits in local memory and reports degraded mode when Redis is unavailable', async () => {
    const store = new DistributedRateLimitStore();
    store.init({ windowMs: 60_000 } as any);
    vi.spyOn(redisService, 'incrementRateLimit').mockResolvedValue(null);
    const before = getRateLimitStoreMetrics().localFallbackHits;
    const first = await store.increment('offline-client');
    const second = await store.increment('offline-client');
    expect(first.totalHits).toBe(1);
    expect(second.totalHits).toBe(2);
    expect(getRateLimitStoreMetrics().fallbackActive).toBe(true);
    expect(getRateLimitStoreMetrics().localFallbackHits).toBe(before + 2);
  });
});
