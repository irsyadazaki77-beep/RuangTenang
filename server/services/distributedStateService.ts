/**
 * Persistent Distributed State Service
 * Handles multi-instance rate-limiting, SOS cooldowns, security throttling, and circuit breakers.
 * 100% backed by Redis atomic operations (SETNX, EX, INCR, PEXPIRE) with graceful in-memory fallback.
 * Eliminates RDBMS connection pool bottlenecks by removing distributed state table queries.
 */

import { redisService } from './redisService.js';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetTime: number;
}

export interface SosCooldownResult {
  inCooldown: boolean;
  remainingSeconds: number;
  lastDispatchTimestamp?: number;
}

class MemoryStateStore {
  private static store = new Map<string, { value: string; expiresAt: number }>();

  static set(compositeKey: string, value: any, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    this.store.set(compositeKey, { value: valueStr, expiresAt });
  }

  static get<T = any>(compositeKey: string): T | null {
    const entry = this.store.get(compositeKey);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(compositeKey);
      return null;
    }
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return entry.value as any;
    }
  }

  static delete(compositeKey: string): void {
    this.store.delete(compositeKey);
  }

  static clear(): void {
    this.store.clear();
  }

  static incr(compositeKey: string, windowSeconds: number): number {
    const entry = this.store.get(compositeKey);
    let count = 1;
    const now = Date.now();
    if (entry && now <= entry.expiresAt) {
      try {
        count = parseInt(entry.value, 10) + 1;
      } catch {
        count = 1;
      }
      entry.value = count.toString();
    } else {
      this.set(compositeKey, "1", windowSeconds);
    }
    return count;
  }
}

export class DistributedStateService {
  /**
   * Set a key-value pair with TTL in seconds
   */
  static async set(category: string, key: string, value: any, ttlSeconds: number): Promise<void> {
    const compositeKey = `${category}:${key}`;
    try {
      if (await redisService.isHealthy()) {
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
        await redisService.set(compositeKey, valueStr, ttlSeconds);
        return;
      }
    } catch (err: any) {
      console.warn(`[DISTRIBUTED_STATE] Redis set failed for ${compositeKey}:`, err.message);
    }
    MemoryStateStore.set(compositeKey, value, ttlSeconds);
  }

  /**
   * Get value by key, returning null if expired or missing
   */
  static async get<T = any>(category: string, key: string): Promise<T | null> {
    const compositeKey = `${category}:${key}`;
    try {
      if (await redisService.isHealthy()) {
        return await redisService.get<T>(compositeKey);
      }
    } catch (err: any) {
      console.warn(`[DISTRIBUTED_STATE] Redis get failed for ${compositeKey}:`, err.message);
    }
    return MemoryStateStore.get<T>(compositeKey);
  }

  /**
   * Delete a key
   */
  static async delete(category: string, key: string): Promise<void> {
    const compositeKey = `${category}:${key}`;
    try {
      if (await redisService.isHealthy()) {
        await redisService.del(compositeKey);
        return;
      }
    } catch (err: any) {
      console.warn(`[DISTRIBUTED_STATE] Redis delete failed for ${compositeKey}:`, err.message);
    }
    MemoryStateStore.delete(compositeKey);
  }

  /**
   * Sliding window / Token rate-limiting safe for multi-instance deployments
   * Uses Redis atomic INCR and EXPIRE operations
   */
  static async checkRateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number,
    category: string = 'RATE_LIMIT'
  ): Promise<RateLimitResult> {
    const compositeKey = `${category}:${key}`;
    const now = Date.now();

    try {
      if (await redisService.isHealthy()) {
        const currentCount = await redisService.incr(compositeKey, windowSeconds);
        const resetTime = now + windowSeconds * 1000;

        const allowed = currentCount <= maxRequests;
        const remaining = Math.max(0, maxRequests - currentCount);

        return {
          allowed,
          count: currentCount,
          remaining,
          resetTime,
        };
      }
    } catch (err: any) {
      console.warn(`[DISTRIBUTED_STATE] Redis rate limit check failed for ${key}, using in-memory:`, err.message);
    }

    const currentCount = MemoryStateStore.incr(compositeKey, windowSeconds);
    const resetTime = now + windowSeconds * 1000;
    const allowed = currentCount <= maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount);

    return {
      allowed,
      count: currentCount,
      remaining,
      resetTime,
    };
  }

  /**
   * Emergency SOS Cooldown check (Multi-instance safe)
   */
  static async checkSosCooldown(userId: string, defaultCooldownSeconds = 180): Promise<SosCooldownResult> {
    const record = await this.get<{ timestamp: number } | number>('SOS_COOLDOWN', userId);
    if (!record) {
      return { inCooldown: false, remainingSeconds: 0 };
    }

    const lastTimestamp = typeof record === 'number' ? record : record.timestamp;
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - lastTimestamp) / 1000);

    if (elapsedSeconds < defaultCooldownSeconds) {
      const remainingSeconds = defaultCooldownSeconds - elapsedSeconds;
      return {
        inCooldown: true,
        remainingSeconds,
        lastDispatchTimestamp: lastTimestamp,
      };
    }

    return { inCooldown: false, remainingSeconds: 0 };
  }

  /**
   * Record an SOS dispatch cooldown
   */
  static async recordSosDispatch(userId: string, cooldownSeconds = 180): Promise<void> {
    await this.set('SOS_COOLDOWN', userId, { timestamp: Date.now() }, cooldownSeconds);
  }

  /**
   * Security Throttling (e.g. failed login attempts, abuse defense)
   */
  static async checkSecurityThrottle(identifier: string): Promise<{ locked: boolean; remainingSeconds: number }> {
    const record = await this.get<{ lockedUntil: number }>('SECURITY_LOCK', identifier);
    if (!record) return { locked: false, remainingSeconds: 0 };

    const remaining = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    if (remaining > 0) {
      return { locked: true, remainingSeconds: remaining };
    }
    return { locked: false, remainingSeconds: 0 };
  }

  /**
   * Record security lock / throttle
   */
  static async lockSecurityIdentifier(identifier: string, lockoutSeconds: number): Promise<void> {
    const lockedUntil = Date.now() + lockoutSeconds * 1000;
    await this.set('SECURITY_LOCK', identifier, { lockedUntil }, lockoutSeconds);
  }

  /**
   * Clean expired state records in bulk (No-op as Redis handles TTL automatically)
   */
  static async cleanExpired(): Promise<number> {
    return 0;
  }

  /**
   * Clears in-memory store for unit & integration testing
   */
  static async clearAllForTesting(): Promise<void> {
    MemoryStateStore.clear();
    try {
      if (await redisService.isHealthy()) {
        await redisService.flushdb();
      }
    } catch {
      // ignore in test
    }
  }
}
