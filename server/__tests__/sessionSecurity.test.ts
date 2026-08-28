import { describe, it, expect, beforeAll } from 'vitest';
import { authService } from '../services/authService.js';
import jwt from 'jsonwebtoken';
import { getJwtSecret, requireAuth, optionalAuth } from '../middleware/auth.js';
import { Request, Response, NextFunction } from 'express';
import { serverDb } from '../database.js';

describe('Session and JWT Hardening Tests', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-32-chars-long-minimum-ruangtenang';
  });

  it('should generate JWT with correct issuer, audience, subject, and algorithm', () => {
    const payload = {
      userId: 'user_123',
      email: 'mahasiswa@ui.ac.id',
      role: 'mahasiswa' as const,
      tier: 'Free' as const,
      sessionId: 'sess_abc123',
      name: 'Mahasiswa Test'
    };

    const token = authService.generateSessionToken(payload);
    expect(token).toBeDefined();

    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'ruangtenang',
      audience: 'ruangtenang-web',
      algorithms: ['HS256']
    }) as any;

    expect(decoded.userId).toBe('user_123');
    expect(decoded.sub).toBe('user_123');
    expect(decoded.iss).toBe('ruangtenang');
    expect(decoded.aud).toBe('ruangtenang-web');
    expect(decoded.jti).toBeDefined();
  });

  it('should reject JWT forged with incorrect issuer or audience', async () => {
    const badToken = jwt.sign(
      { userId: 'user_123', role: 'admin' },
      getJwtSecret(),
      { issuer: 'evil-issuer', audience: 'evil-aud', algorithm: 'HS256' }
    );

    const req = { cookies: { ruangtenang_session: badToken }, headers: {} } as unknown as Request;
    const res = { 
      status: (code: number) => ({ json: (data: any) => ({ code, data }) }),
      clearCookie: () => {} 
    } as unknown as Response;

    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    const result: any = await requireAuth(req, res, next);
    expect(nextCalled).toBe(false);
    expect(result.code).toBe(401);
  });

  it('should reject JWT forged with wrong algorithm', async () => {
    const badToken = jwt.sign(
      { userId: 'user_123', role: 'admin' },
      getJwtSecret(),
      { issuer: 'ruangtenang', audience: 'ruangtenang-web', algorithm: 'HS512' }
    );

    const req = { cookies: { ruangtenang_session: badToken }, headers: {} } as unknown as Request;
    const res = { 
      status: (code: number) => ({ json: (data: any) => ({ code, data }) }),
      clearCookie: () => {} 
    } as unknown as Response;

    const next: NextFunction = () => {};
    const result: any = await requireAuth(req, res, next);
    expect(result.code).toBe(401);
  });

  it('should reject expired JWT', async () => {
    const expiredToken = jwt.sign(
      { userId: 'user_123', role: 'admin' },
      getJwtSecret(),
      { issuer: 'ruangtenang', audience: 'ruangtenang-web', algorithm: 'HS256', expiresIn: '-1s' }
    );

    const req = { cookies: { ruangtenang_session: expiredToken }, headers: {} } as unknown as Request;
    const res = { 
      status: (code: number) => ({ json: (data: any) => ({ code, data }) }),
      clearCookie: () => {} 
    } as unknown as Response;

    const next: NextFunction = () => {};
    const result: any = await requireAuth(req, res, next);
    expect(result.code).toBe(401);
  });

  it('optionalAuth should not crash on invalid token and should clear cookie', async () => {
    const badToken = 'invalid.token.string';
    const req = { cookies: { ruangtenang_session: badToken }, headers: {} } as any as Request;
    
    let clearCookieCount = 0;
    const res = { 
      clearCookie: () => { clearCookieCount++; } 
    } as unknown as Response;

    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await optionalAuth(req, res, next);
    expect(nextCalled).toBe(true);
    expect(req.user).toBeUndefined();
    expect(clearCookieCount).toBeGreaterThan(0);
  });
});
