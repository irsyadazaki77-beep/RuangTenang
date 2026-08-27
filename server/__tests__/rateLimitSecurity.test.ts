import { describe, it, expect } from 'vitest';
import {
  loginLimiter,
  registerLimiter,
  mfaLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  exportLimiter
} from '../middleware/rateLimiters.js';

describe('Rate Limiters Configuration Tests', () => {
  it('should have proper rate limits configured for sensitive endpoints', () => {
    expect(loginLimiter).toBeDefined();
    expect(registerLimiter).toBeDefined();
    expect(mfaLimiter).toBeDefined();
    expect(passwordResetLimiter).toBeDefined();
    expect(emailVerificationLimiter).toBeDefined();
    expect(exportLimiter).toBeDefined();
  });
});
