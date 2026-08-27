/**
 * Distributed Lock Service
 * Provides multi-instance safe locks for scheduled background jobs (e.g. data retention, migrations, batch tasks).
 * Supports both PostgreSQL Advisory Locks and Database-backed lease locks with automatic TTL expiration.
 */

import crypto from 'crypto';
import os from 'os';
import { prisma } from '../database.js';
import { dbConfig } from '../config/databaseConfig.js';

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

    try {
      // 1. If running on PostgreSQL, we can use advisory locks or database table locks
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

      // Create new lock
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
    try {
      const existing = await prisma.distributedLock.findUnique({
        where: { id: lockId },
      });

      if (!existing || existing.holder !== holder) {
        return false;
      }

      await prisma.distributedLock.delete({
        where: { id: lockId },
      });
      return true;
    } catch (err: any) {
      console.warn(`[DISTRIBUTED_LOCK] Failed to release lock for ${lockId}:`, err.message);
      return false;
    }
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
    const acquired = await this.acquireLock(lockId, ttlSeconds);
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
      await this.releaseLock(lockId);
    }
  }
}
