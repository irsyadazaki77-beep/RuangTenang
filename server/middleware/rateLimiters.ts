import rateLimit from 'express-rate-limit';

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
  keyGenerator: (req: any) => req.user?.userId || req.ip || 'anonymous',
  message: {
    success: false,
    code: 'AI_RATE_LIMIT_EXCEEDED',
    error: 'Batas kecepatan pesan AI tercapai (maks 15 pesan/menit). Ambil jeda sejenak untuk bernapas sebelum melanjutkan 🌿.'
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
  max: process.env.NODE_ENV === 'production' ? 5 : (process.env.NODE_ENV === 'test' ? 100 : 15),
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
  max: process.env.NODE_ENV === 'production' ? 5 : (process.env.NODE_ENV === 'test' ? 100 : 10),
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
