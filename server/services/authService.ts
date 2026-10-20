import jwt, { type SignOptions } from 'jsonwebtoken';
import { Request, Response } from 'express';
import { UserRecord } from '../database.js';
import crypto from 'crypto';
import { getJwtSecret } from '../middleware/auth.js';
import { isProductionLikeEnvironment } from '../config/environment.js';

const COOKIE_NAME = 'rt_auth_token';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  tier: 'Free' | 'Pro' | 'Developer';
  sessionId: string;
  name: string;
  sessionType?: 'mobile';
}

export const authService = {
  /**
   * Generates JWT token for active user session.
   */
  generateSessionToken(payload: TokenPayload, expiresIn: SignOptions['expiresIn'] = '7d'): string {
    return jwt.sign(payload, getJwtSecret(), {
      expiresIn,
      issuer: 'ruangtenang',
      audience: 'ruangtenang-web',
      algorithm: 'HS256',
      subject: payload.userId,
      jwtid: crypto.randomUUID()
    });
  },

  generateMobileAccessToken(payload: TokenPayload): string {
    return this.generateSessionToken({ ...payload, sessionType: 'mobile' }, 15 * 60);
  },

  /** Browser mutations carry browser metadata; originless native clients stay legacy-compatible. */
  isBrowserRequest(req: Request): boolean {
    return Boolean(
      req.headers.origin || req.headers.referer || req.headers['sec-fetch-site'] ||
      req.headers['sec-fetch-mode'] || req.headers['sec-fetch-dest']
    );
  },

  /**
   * Sets HTTP-only, SameSite secure cookie on response.
   */
  setSessionCookie(res: Response, token: string): void {
    const isProduction = isProductionLikeEnvironment();
    const cookieOptions = {
      httpOnly: true, // Prevents JavaScript XSS token theft
      secure: isProduction, // Enforces HTTPS transmission in production
      sameSite: 'lax' as const, // Prevents cross-site request forgery while preserving UX
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    res.cookie(COOKIE_NAME, token, cookieOptions);
    res.cookie('ruangtenang_session', token, cookieOptions);
    // Deprecated legacy cookies: clear legacy if present
    res.clearCookie('token', { httpOnly: true, secure: isProduction, sameSite: 'lax' as const, path: '/' });
  },

  /**
   * Clears auth cookies upon logout.
   */
  clearSessionCookie(res: Response): void {
    const isProduction = isProductionLikeEnvironment();
    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };
    res.clearCookie(COOKIE_NAME, clearOptions);
    res.clearCookie('ruangtenang_session', clearOptions);
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
      campusId: user.campusId,
      mfaEnabled: user.mfaEnabled,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
};
