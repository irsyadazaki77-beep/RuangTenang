/**
 * Persistent Distributed State Service
 * Handles multi-instance rate-limiting, SOS cooldowns, security throttling, and circuit breakers.
 * Backed by DistributedState table in the database.
 */

import { prisma } from '../database.js';

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

export class DistributedStateService {
  /**
   * Set a key-value pair with TTL in seconds
   */
  static async set(category: string, key: string, value: any, ttlSeconds: number): Promise<void> {
    const compositeKey = `${category}:${key}`;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

    try {
      await prisma.distributedState.upsert({
        where: { key: compositeKey },
        create: {
          key: compositeKey,
          category,
          value: valueStr,
          expiresAt,
        },
        update: {
          category,
          value: valueStr,
          expiresAt,
          updatedAt: new Date(),
        },
      });
    } catch (err: any) {
      // Non-blocking fallback if DB error
      console.warn(`[DISTRIBUTED_STATE] Failed to persist state for key ${compositeKey}:`, err.message);
    }
  }

  /**
   * Get value by key, returning null if expired or missing
   */
  static async get<T = any>(category: string, key: string): Promise<T | null> {
    const compositeKey = `${category}:${key}`;
    try {
      const record = await prisma.distributedState.findUnique({
        where: { key: compositeKey },
      });

      if (!record) return null;

      if (new Date(record.expiresAt).getTime() <= Date.now()) {
        // Expired, asynchronously clean up
        prisma.distributedState.delete({ where: { key: compositeKey } }).catch(() => {});
        return null;
      }

      try {
        return JSON.parse(record.value) as T;
      } catch {
        return record.value as unknown as T;
      }
    } catch (err: any) {
      console.warn(`[DISTRIBUTED_STATE] Failed to read state for key ${compositeKey}:`, err.message);
      return null;
    }
  }

  /**
   * Delete a key
   */
  static async delete(category: string, key: string): Promise<void> {
    const compositeKey = `${category}:${key}`;
    try {
      await prisma.distributedState.delete({
        where: { key: compositeKey },
      });
    } catch {
      // Ignored if key doesn't exist
    }
  }

  /**
   * Sliding window / Token rate-limiting safe for multi-instance deployments
   */
  static async checkRateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number,
    category: string = 'RATE_LIMIT'
  ): Promise<RateLimitResult> {
    const compositeKey = `${category}:${key}`;
    const now = Date.now();
    const expiresAt = new Date(now + windowSeconds * 1000);

    try {
      const record = await prisma.distributedState.findUnique({
        where: { key: compositeKey },
      });

      let currentCount = 0;
      let existingExpiry = expiresAt;

      if (record && new Date(record.expiresAt).getTime() > now) {
        currentCount = parseInt(record.value, 10) || 0;
        existingExpiry = record.expiresAt;
      }

      currentCount += 1;
      const resetTime = existingExpiry.getTime();

      // Upsert new count
      await prisma.distributedState.upsert({
        where: { key: compositeKey },
        create: {
          key: compositeKey,
          category,
          value: String(currentCount),
          expiresAt: existingExpiry,
        },
        update: {
          value: String(currentCount),
          expiresAt: existingExpiry,
        },
      });

      const allowed = currentCount <= maxRequests;
      const remaining = Math.max(0, maxRequests - currentCount);

      return {
        allowed,
        count: currentCount,
        remaining,
        resetTime,
      };
    } catch (err: any) {
      // Graceful degradation: allow on DB failure
      console.warn(`[DISTRIBUTED_STATE] Rate limit check DB fallback for ${key}:`, err.message);
      return {
        allowed: true,
        count: 1,
        remaining: maxRequests - 1,
        resetTime: now + windowSeconds * 1000,
      };
    }
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
   * Clean expired state records in bulk
   */
  static async cleanExpired(): Promise<number> {
    try {
      const res = await prisma.distributedState.deleteMany({
        where: {
          expiresAt: {
            lte: new Date(),
          },
        },
      });
      return res.count;
    } catch {
      return 0;
    }
  }
}
