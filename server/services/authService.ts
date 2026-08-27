import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { serverDb, UserRecord } from '../database';
import { emailService } from './emailService';
import { safeLog } from '../security';
import crypto from 'crypto';
import { getJwtSecret } from '../middleware/auth';

const COOKIE_NAME = 'ruangtenang_session';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'mahasiswa' | 'konselor' | 'admin' | 'guest';
  tier: 'Free' | 'Pro' | 'Developer';
  sessionId: string;
  name: string;
}

export const authService = {
  /**
   * Generates JWT token for active user session.
   */
  generateSessionToken(payload: TokenPayload): string {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
  },

  /**
   * Sets HTTP-only secure cookie on response.
   */
  setSessionCookie(res: Response, token: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    res.cookie(COOKIE_NAME, token, cookieOptions);
    // Legacy fallback cookie for existing client compat
    res.cookie('token', token, cookieOptions);
  },

  /**
   * Clears auth cookies upon logout.
   */
  clearSessionCookie(res: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };
    res.clearCookie(COOKIE_NAME, clearOptions);
    res.clearCookie('token', clearOptions);
  },

  /**
   * Generates a 6-digit cryptographic numeric code.
   */
  generate6DigitCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  },

  /**
   * Sanitizes User record for client response (removes passwordHash, mfaCode, etc.)
   */
  sanitizeUser(user: UserRecord) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tier: user.tier,
      university: user.university,
      mfaEnabled: user.mfaEnabled,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
};
