import rateLimit from 'express-rate-limit';

export const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'TOO_MANY_REQUESTS',
    error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.'
  }
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'LOGIN_RATE_LIMIT_EXCEEDED',
    error: 'Terlalu banyak percobaan masuk. Silakan coba lagi setelah 15 menit.'
  }
});

export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'REGISTER_RATE_LIMIT_EXCEEDED',
    error: 'Terlalu banyak pendaftaran akun dari IP Anda. Silakan coba lagi nanti.'
  }
});

export const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'MFA_RATE_LIMIT_EXCEEDED',
    error: 'Batas maksimum percobaan MFA tercapai (maks 5x). Silakan coba lagi setelah 15 menit.'
  }
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
    error: 'Terlalu banyak permintaan reset kata sandi. Silakan tunggu 1 jam.'
  }
});

export const emailVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'VERIFICATION_RATE_LIMIT_EXCEEDED',
    error: 'Terlalu banyak percobaan verifikasi email. Silakan tunggu 15 menit.'
  }
});

export const aiChatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'AI_RATE_LIMIT_EXCEEDED',
    error: 'Batas kecepatan pesan AI tercapai (30 req/menit). Silakan perlambat jeda obrolan.'
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
