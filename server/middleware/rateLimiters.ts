import expressRateLimit from 'express-rate-limit';
import { isProductionLikeEnvironment } from '../config/environment.js';
import { redisService } from '../services/redisService.js';
import { metricsService } from '../services/metricsService.js';

type LocalCounter = { totalHits: number; resetTime: Date };
let storeSequence = 0;
let localFallbackHits = 0;
let fallbackActive = false;
let lastFallbackAlertAt = 0;

export class DistributedRateLimitStore {
  readonly localKeys = false;
  private readonly prefix = `ruangtenang:rate-limit:${++storeSequence}:`;
  private windowMs = 60_000;
  private readonly localCounters = new Map<string, LocalCounter>();

  init(options: { windowMs: number }) {
    this.windowMs = options.windowMs;
  }

  async increment(key: string) {
    const redisKey = `${this.prefix}${key}`;
    const shared = await redisService.incrementRateLimit(redisKey, this.windowMs);
    if (shared) {
      fallbackActive = false;
      return { totalHits: shared.count, resetTime: shared.resetTime };
    }

    fallbackActive = true;
    localFallbackHits++;
    const now = Date.now();
    let current = this.localCounters.get(key);
    if (!current || current.resetTime.getTime() <= now) {
      current = { totalHits: 0, resetTime: new Date(now + this.windowMs) };
    }
    current.totalHits++;
    this.localCounters.set(key, current);

    if (isProductionLikeEnvironment() && now - lastFallbackAlertAt > 30_000) {
      lastFallbackAlertAt = now;
      console.error('[SECURITY_ALERT] Distributed rate limiting is using per-process counters because Redis is unavailable.');
    }
    return { totalHits: current.totalHits, resetTime: current.resetTime };
  }

  async decrement(key: string) {
    const redisKey = `${this.prefix}${key}`;
    if (await redisService.decrementRateLimit(redisKey)) return;
    const current = this.localCounters.get(key);
    if (current && current.totalHits > 0) current.totalHits--;
  }

  async resetKey(key: string) {
    this.localCounters.delete(key);
    await redisService.del(`${this.prefix}${key}`);
  }

  async resetAll() {
    this.localCounters.clear();
    await redisService.delPattern(`${this.prefix}*`);
  }
}

const rateLimit = (options: any) => expressRateLimit({
  ...options,
  store: new DistributedRateLimitStore(),
  handler: (req: any, res: any, next: any, optionsUsed: any) => {
    metricsService.recordSecurityEvent('rate_limit_exceeded');
    if (options.handler) return options.handler(req, res, next, optionsUsed);
    return res.status(optionsUsed.statusCode).send(optionsUsed.message);
  },
});

export function getRateLimitStoreMetrics() {
  return {
    fallbackActive,
    localFallbackHits,
  };
}

export function getRateLimitStorePrometheus() {
  return [
    '# HELP ruangtenang_rate_limit_local_fallback_active Whether Redis-backed rate limiting is currently degraded.',
    '# TYPE ruangtenang_rate_limit_local_fallback_active gauge',
    `ruangtenang_rate_limit_local_fallback_active ${fallbackActive ? 1 : 0}`,
    '# HELP ruangtenang_rate_limit_local_fallback_hits Requests counted using per-process fallback counters.',
    '# TYPE ruangtenang_rate_limit_local_fallback_hits counter',
    `ruangtenang_rate_limit_local_fallback_hits ${localFallbackHits}`,
  ].join('\n');
}

const isTestEnv = () => process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

export const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 300, // Balanced general API quota per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv(),
  message: {
    success: false,
    code: 'TOO_MANY_REQUESTS',
    error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.'
  }
});

// Strict Brute-Force & Credential Stuffing Defense
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5, // Max 5 login attempts per 15 minutes window
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv(),
  message: {
    success: false,
    code: 'LOGIN_RATE_LIMIT_EXCEEDED',
    error: 'Terlalu banyak percobaan masuk (maks 5x). Demi keamanan akun Anda, silakan coba lagi setelah 15 menit.'
  }
});

export const mobileRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv(),
  message: {
    success: false,
    code: 'MOBILE_REFRESH_RATE_LIMIT_EXCEEDED',
    error: 'Terlalu banyak permintaan refresh sesi. Silakan coba lagi nanti.'
  }
});

// Sybil & Bot Account Creation Defense
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5, // Max 5 registrations per IP per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv(),
  message: {
    success: false,
    code: 'REGISTER_RATE_LIMIT_EXCEEDED',
    error: 'Terlalu banyak pendaftaran akun dari perangkat atau IP Anda. Silakan coba lagi nanti.'
  }
});

export const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv(),
  message: {
    success: false,
    code: 'MFA_RATE_LIMIT_EXCEEDED',
    error: 'Batas maksimum percobaan MFA tercapai (maks 5x). Silakan coba lagi setelah 15 menit.'
  }
});

// Password Reset Email Flood Defense
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 reset requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv(),
  message: {
    success: false,
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
    error: 'Terlalu banyak permintaan reset kata sandi (maks 3x per jam). Silakan periksa kotak masuk atau coba lagi nanti.'
  }
});

export const emailVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv(),
  message: {
    success: false,
    code: 'VERIFICATION_RATE_LIMIT_EXCEEDED',
    error: 'Terlalu banyak percobaan verifikasi email. Silakan tunggu 15 menit.'
  }
});

// AI Chat Rate Limiter (Granular per User ID / IP)
export const aiChatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 15, // Max 15 messages/minute (protects against Gemini API quota exhaustion & automated spam)
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  skip: () => isTestEnv(),
  keyGenerator: (req: any) => req.user?.userId || req.ip || 'anonymous',
  message: {
    success: false,
    code: 'AI_RATE_LIMIT_EXCEEDED',
    error: 'Batas kecepatan pesan AI tercapai (maks 15 pesan/menit). Ambil jeda sejenak untuk bernapas sebelum melanjutkan 🌿.'
  }
});

// Bound memory- and CPU-intensive document parsing before Multer buffers request bodies.
export const attachmentUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv(),
  message: {
    success: false,
    code: 'ATTACHMENT_UPLOAD_RATE_LIMIT_EXCEEDED',
    error: 'Batas unggah lampiran tercapai. Silakan coba lagi nanti.'
  }
});

// AI Counselor Simulation Rate Limiter
export const counselorAiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: any) => req.user?.userId || req.ip || 'anonymous',
  message: {
    success: false,
    code: 'COUNSELOR_AI_RATE_LIMIT_EXCEEDED',
    error: 'Batas interaksi simulasi konselor tercapai (maks 10 interaksi/menit). Silakan tunggu sebentar.'
  }
});

// Expensive AI Session Summarization Limiter
export const aiSummaryLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 mins
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: any) => req.user?.userId || req.ip || 'anonymous',
  message: {
    success: false,
    code: 'AI_SUMMARY_RATE_LIMIT_EXCEEDED',
    error: 'Batas permintaan ringkasan AI tercapai (maks 5x per 5 menit). Silakan coba lagi nanti.'
  }
});

export const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'ADMIN_RATE_LIMIT_EXCEEDED',
    error: 'Terlalu banyak permintaan admin. Silakan tunggu sebentar.'
  }
});

export const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'EXPORT_RATE_LIMIT_EXCEEDED',
    error: 'Batas unduh ekspor data tercapai (maks 5x per 15 menit).'
  }
});

export const diagnosticsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: process.env.NODE_ENV === 'test' ? 50 : 5, // 5 requests per min in production/dev
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: any) => req.user?.userId || req.ip || 'unknown',
  message: {
    success: false,
    code: 'DIAGNOSTICS_RATE_LIMIT_EXCEEDED',
    error: 'Batas penggunaan diagnostik AI tercapai (maks 5 req/menit).'
  }
});

export const accountDeletionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: process.env.NODE_ENV === 'test' ? 100 : (isProductionLikeEnvironment() ? 5 : 15),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: any) => req.user?.userId || req.ip || 'unknown',
  message: {
    success: false,
    code: 'DELETION_RATE_LIMIT_EXCEEDED',
    error: 'Batas percobaan penghapusan akun tercapai. Silakan coba lagi setelah 15 menit.'
  }
});

export const adminDeletionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: process.env.NODE_ENV === 'test' ? 100 : (isProductionLikeEnvironment() ? 5 : 10),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: any) => req.user?.userId || req.ip || 'unknown',
  message: {
    success: false,
    code: 'ADMIN_DELETION_RATE_LIMIT_EXCEEDED',
    error: 'Batas percobaan penghapusan akun oleh admin tercapai. Silakan coba lagi setelah 15 menit.'
  }
});

// Dedicated Client Telemetry Rate Limiter (Max 10 requests per 15 minutes to prevent log spamming)
export const clientTelemetryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10, // Strictly capped at 10 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    error: 'Terlalu banyak laporan telemetry (maksimal 10x per 15 menit). Silakan tunggu.'
  }
});
