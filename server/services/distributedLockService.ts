/**
 * Distributed Lock Service
 * Provides multi-instance safe locks for scheduled background jobs (e.g. data retention, migrations, batch tasks).
 * Utilizes Redis atomic lock (SET key val NX EX) with DB lease lock fallback.
 */

import crypto from 'crypto';
import os from 'os';
import { prisma } from '../database.js';
import { redisService } from './redisService.js';

export class DistributedLockService {
  private static instanceId = `${os.hostname()}-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;

  /**
   * Acquire a distributed lease lock for a specified duration (in seconds).
   * Returns true if lock was acquired, false if held by another active instance.
   */
  static async acquireLock(lockId: string, ttlSeconds: number = 300, customHolder?: string): Promise<boolean> {
    const holder = customHolder || this.instanceId;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    const redisLockKey = `lock:${lockId}`;

    // 1. Try Redis Atomic Lock (SET key val NX EX)
    const redisAcquired = await redisService.setnx(redisLockKey, holder, ttlSeconds);
    if (redisAcquired) {
      // Sync to DB for monitoring/fallback
      try {
        await prisma.distributedLock.upsert({
          where: { id: lockId },
          create: {
            id: lockId,
            holder,
            acquiredAt: now,
            expiresAt,
          },
          update: {
            holder,
            acquiredAt: now,
            expiresAt,
          },
        });
      } catch (_) {}

      return true;
    }

    // Check if Redis lock exists and belongs to holder (renew lock)
    const existingHolder = await redisService.get<string>(redisLockKey);
    if (existingHolder) {
      if (existingHolder === holder) {
        await redisService.set(redisLockKey, holder, ttlSeconds);
        return true;
      }
      // Redis lock is actively held by another instance
      return false;
    }

    // 2. Fallback to Database Lock if Redis did not acquire
    try {
      const existing = await prisma.distributedLock.findUnique({
        where: { id: lockId },
      });

      if (existing) {
        // If expired or already held by this instance, renew lock
        if (new Date(existing.expiresAt).getTime() <= now.getTime() || existing.holder === holder) {
          await prisma.distributedLock.update({
            where: { id: lockId },
            data: {
              holder,
              acquiredAt: now,
              expiresAt,
            },
          });
          return true;
        }
        // Held by another active instance
        return false;
      }

      // Create new DB lock if not existing in DB
      await prisma.distributedLock.create({
        data: {
          id: lockId,
          holder,
          acquiredAt: now,
          expiresAt,
        },
      });
      return true;
    } catch (err: any) {
      console.warn(`[DISTRIBUTED_LOCK] Failed to acquire lock for ${lockId}:`, err.message);
      return false;
    }
  }

  /**
   * Release a previously acquired lock
   */
  static async releaseLock(lockId: string, customHolder?: string): Promise<boolean> {
    const holder = customHolder || this.instanceId;
    const redisLockKey = `lock:${lockId}`;

    let released = false;

    // 1. Release from Redis
    const currentRedisHolder = await redisService.get<string>(redisLockKey);
    if (currentRedisHolder === holder || !currentRedisHolder) {
      await redisService.del(redisLockKey);
      released = true;
    }

    // 2. Release from DB
    try {
      const existing = await prisma.distributedLock.findUnique({
        where: { id: lockId },
      });

      if (existing && existing.holder === holder) {
        await prisma.distributedLock.delete({
          where: { id: lockId },
        });
        released = true;
      }
    } catch (err: any) {
      console.warn(`[DISTRIBUTED_LOCK] Failed to release DB lock for ${lockId}:`, err.message);
    }

    return released;
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

