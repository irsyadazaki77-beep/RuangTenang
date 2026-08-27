import { serverDb } from '../database.js';

export interface UsageLimitCheckResult {
  allowed: boolean;
  dailyUsage: number;
  dailyLimit: number;
  userTier: string;
  message?: string;
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
 * Check whether user or IP has exceeded daily limit
 */
export async function checkUserAiUsageLimit(
  userId?: string,
  clientIp?: string,
  userTier?: string,
  userRole?: string
): Promise<UsageLimitCheckResult> {
  const dailyLimit = getUserDailyLimit(userTier, userRole);
  if (dailyLimit >= 999999) {
    return { allowed: true, dailyUsage: 0, dailyLimit, userTier: userTier || 'Developer' };
  }

  const today = new Date().toISOString().split('T')[0];
  const ipKey = `ip_${clientIp || '127.0.0.1'}`;
  const userKey = userId && userId !== 'guest' ? `user_${userId}` : null;

  const ipUsage = await serverDb.getDailyUsage(ipKey, today);
  const userUsage = userKey ? await serverDb.getDailyUsage(userKey, today) : 0;
  const currentUsage = Math.max(ipUsage, userUsage);

  if (currentUsage >= dailyLimit) {
    return {
      allowed: false,
      dailyUsage: currentUsage,
      dailyLimit,
      userTier: userTier || 'Free',
      message: `Batas penggunaan AI harian Anda telah tercapai (${currentUsage}/${dailyLimit} pesan hari ini) demi menjaga ketersediaan kuota API. Kuota Anda akan tereset otomatis besok pada tengah malam. Silakan manfaatkan layanan Konseling Kampus jika Anda membutuhkan teman bicara.`
    };
  }

  return {
    allowed: true,
    dailyUsage: currentUsage,
    dailyLimit,
    userTier: userTier || 'Free'
  };
}

/**
 * Increment user's daily usage count
 */
export async function recordUserAiUsage(
  userId?: string,
  clientIp?: string
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const ipKey = `ip_${clientIp || '127.0.0.1'}`;
  await serverDb.incrementDailyUsage(ipKey, today);

  if (userId && userId !== 'guest') {
    const userKey = `user_${userId}`;
    return await serverDb.incrementDailyUsage(userKey, today);
  }

  return 0;
}
