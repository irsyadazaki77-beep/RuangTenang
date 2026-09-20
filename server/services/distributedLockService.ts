/**
 * Distributed Lock Service
 * Provides multi-instance safe locks for scheduled background jobs (e.g. data retention, migrations, batch tasks).
 * Utilizes Redis atomic lock (SET key val EX ttl NX) with graceful in-memory fallback.
 * 100% decoupled from RDBMS connection pool to eliminate database bottlenecks.
 */

import crypto from 'crypto';
import os from 'os';
import { redisService } from './redisService.js';

class MemoryLockStore {
  private static locks = new Map<string, { holder: string; expiresAt: number }>();

  static acquire(lockId: string, holder: string, ttlSeconds: number): boolean {
    const now = Date.now();
    const existing = this.locks.get(lockId);
    if (existing && now <= existing.expiresAt) {
      if (existing.holder === holder) {
        existing.expiresAt = now + ttlSeconds * 1000;
        return true;
      }
      return false;
    }
    this.locks.set(lockId, { holder, expiresAt: now + ttlSeconds * 1000 });
    return true;
  }

  static release(lockId: string, holder: string): boolean {
    const existing = this.locks.get(lockId);
    if (!existing || Date.now() > existing.expiresAt) {
      this.locks.delete(lockId);
      return true;
    }
    if (existing.holder === holder) {
      this.locks.delete(lockId);
      return true;
    }
    return false;
  }
}

export class DistributedLockService {
  private static instanceId = `${os.hostname()}-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;

  /**
   * Acquire a distributed lease lock for a specified duration (in seconds).
   * Returns true if lock was acquired, false if held by another active instance.
   */
  static async acquireLock(lockId: string, ttlSeconds: number = 300, customHolder?: string): Promise<boolean> {
    const holder = customHolder || this.instanceId;
    const redisLockKey = `lock:${lockId}`;

    try {
      if (await redisService.isHealthy()) {
        // 1. Try Redis Atomic Lock (SET key val EX ttl NX)
        const redisAcquired = await redisService.setnx(redisLockKey, holder, ttlSeconds);
        if (redisAcquired) {
          return true;
        }

        // Check if Redis lock exists and belongs to holder (renew lock)
        const existingHolder = await redisService.get<string>(redisLockKey);
        if (existingHolder && existingHolder === holder) {
          await redisService.set(redisLockKey, holder, ttlSeconds);
          return true;
        }

        return false;
      }
    } catch (err: any) {
      console.warn(`[DISTRIBUTED_LOCK] Redis healthy check/op failed, falling back to in-memory lock for ${lockId}:`, err.message);
    }

    // Graceful in-memory fallback
    return MemoryLockStore.acquire(lockId, holder, ttlSeconds);
  }

  /**
   * Release a previously acquired lock
   */
  static async releaseLock(lockId: string, customHolder?: string): Promise<boolean> {
    const holder = customHolder || this.instanceId;
    const redisLockKey = `lock:${lockId}`;

    try {
      if (await redisService.isHealthy()) {
        const currentRedisHolder = await redisService.get<string>(redisLockKey);
        if (currentRedisHolder === holder || !currentRedisHolder) {
          await redisService.del(redisLockKey);
          return true;
        }
        return false;
      }
    } catch (err: any) {
      console.warn(`[DISTRIBUTED_LOCK] Redis operation failed on release, falling back to in-memory for ${lockId}:`, err.message);
    }

    // Graceful in-memory fallback
    return MemoryLockStore.release(lockId, holder);
  }

  /**
   * Execute an action exclusively with lock protection.
   * If lock cannot be acquired, returns null without executing the action.
   */
  static async withLock<T>(
    lockId: string,
    ttlSeconds: number,
    action: () => Promise<T>
  ): Promise<{ executed: boolean; result?: T; reason?: string }> {
    const uniqueHolder = `${this.instanceId}-req-${crypto.randomBytes(4).toString('hex')}`;
    const acquired = await this.acquireLock(lockId, ttlSeconds, uniqueHolder);
    if (!acquired) {
      return {
        executed: false,
        reason: `Lock for ${lockId} is currently held by another worker instance.`,
      };
    }

    try {
      const result = await action();
      return { executed: true, result };
    } finally {
      await this.releaseLock(lockId, uniqueHolder);
    }
  }
}
