import { serverDb } from '../database.js';

export interface UsageLimitCheckResult {
  allowed: boolean;
  dailyUsage: number;
  dailyLimit: number;
  userTier: string;
  message?: string;
  reserved?: boolean;
}

/**
 * Get daily message limit based on user tier and role
 */
export function getUserDailyLimit(userTier?: string, userRole?: string): number {
  if (userRole === 'admin' || userTier === 'Developer') {
    return 999999;
  }
  if (userRole === 'konselor' || userTier === 'Pro') {
    const envPro = process.env.DAILY_AI_LIMIT_PRO;
    const parsed = envPro ? parseInt(envPro, 10) : NaN;
    return !isNaN(parsed) && parsed > 0 ? parsed : 100;
  }
  // Standard Free / Student Tier
  const envFree = process.env.DAILY_AI_LIMIT_FREE;
  const parsed = envFree ? parseInt(envFree, 10) : NaN;
  return !isNaN(parsed) && parsed > 0 ? parsed : 25;
}

/**
 * Atomically check and reserve AI usage limit in a single database transaction.
 * Prevents parallel race condition bypasses across concurrent incoming requests.
 */
export async function checkUserAiUsageLimit(
  userId?: string,
  clientIp?: string,
  userTier?: string,
  userRole?: string
): Promise<UsageLimitCheckResult> {
  const dailyLimit = getUserDailyLimit(userTier, userRole);
  if (dailyLimit >= 999999) {
    return { allowed: true, dailyUsage: 0, dailyLimit, userTier: userTier || 'Developer', reserved: false };
  }

  const today = new Date().toISOString().split('T')[0];
  const safeIp = clientIp || '127.0.0.1';
  const ipKey = `ip_${safeIp}`;
  const userKey = userId && userId !== 'guest' ? `user_${userId}` : null;

  return await serverDb.consumeQuotaTransaction(ipKey, userKey, today, dailyLimit, userTier);
}

/**
 * Helper to get current daily usage without incrementing
 */
export async function getDailyUsageStats(
  userId?: string,
  clientIp?: string
): Promise<{ ipUsage: number; userUsage: number; maxUsage: number }> {
  const today = new Date().toISOString().split('T')[0];
  const safeIp = clientIp || '127.0.0.1';
  const ipKey = `ip_${safeIp}`;
  const userKey = userId && userId !== 'guest' ? `user_${userId}` : null;

  const ipRecord = await serverDb.getDailyUsage(ipKey, today);
  const userRecord = userKey ? await serverDb.getDailyUsage(userKey, today) : { count: 0 };
  
  const ipUsage = typeof ipRecord === 'number' ? ipRecord : ipRecord.count;
  const userUsage = typeof userRecord === 'number' ? userRecord : userRecord.count;

  return {
    ipUsage,
    userUsage,
    maxUsage: Math.max(ipUsage, userUsage)
  };
}

/**
 * Secondary helper retained for API compatibility.
 * Since checkUserAiUsageLimit now performs atomic reservation,
 * recordUserAiUsage returns the current usage without double-incrementing.
 */
export async function recordUserAiUsage(
  userId?: string,
  clientIp?: string
): Promise<number> {
  const stats = await getDailyUsageStats(userId, clientIp);
  return stats.maxUsage;
}

/**
 * Rollback a reserved quota slot if the request failed before entering AI processing.
 */
export async function rollbackUserAiQuota(
  userId?: string,
  clientIp?: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const safeIp = clientIp || '127.0.0.1';
  const ipKey = `ip_${safeIp}`;
  const userKey = userId && userId !== 'guest' ? `user_${userId}` : null;

  await serverDb.rollbackQuotaTransaction(ipKey, userKey, today);
}
