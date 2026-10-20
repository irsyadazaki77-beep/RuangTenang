import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { prisma, serverDb } from '../../database.js';
import authRouter from '../../routes/auth.js';
import { getJwtSecret } from '../../middleware/auth.js';
import { mobileAuthService } from '../../services/mobileAuthService.js';
import { MOBILE_ACCESS_TTL_SECONDS, MOBILE_REFRESH_TTL_DAYS } from '../../services/mobileAuthService.js';

const email = 'mobile-refresh-security@test.com';
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRouter);

const requestContext = {
  ip: '127.0.0.1',
  socket: { remoteAddress: '127.0.0.1' },
  headers: { 'user-agent': 'RuangTenangNative/1' },
} as any;

describe('Mobile authentication and rotating refresh tokens', () => {
  beforeAll(async () => {
    await prisma.users.deleteMany({ where: { email } });
    await prisma.users.create({
      data: {
        id: 'mobile-refresh-security-user',
        name: 'Mobile Security User',
        email,
        passwordHash: await bcrypt.hash('Password123!', 4),
        role: 'mahasiswa',
        tier: 'Free',
        emailVerified: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.users.deleteMany({ where: { email } });
  });

  it('returns 15-minute access JWTs and opaque refresh tokens without setting cookies', async () => {
    const response = await request(app)
      .post('/api/auth/mobile/login')
      .send({ email, password: 'Password123!' });

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.body.token).toBeUndefined();
    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const claims = jwt.verify(response.body.accessToken, getJwtSecret(), {
      issuer: 'ruangtenang', audience: 'ruangtenang-web', algorithms: ['HS256'],
    }) as jwt.JwtPayload;
    expect(claims.exp! - claims.iat!).toBe(MOBILE_ACCESS_TTL_SECONDS);
    expect(claims.sessionType).toBe('mobile');

    const saved = await (prisma as any).mobileRefreshToken.findUnique({
      where: { tokenHash: crypto.createHash('sha256').update(response.body.refreshToken).digest('hex') },
    });
    expect(saved).toBeTruthy();
    expect(saved.tokenHash).not.toBe(response.body.refreshToken);
    expect(saved.expiresAt.getTime() - saved.createdAt.getTime()).toBeGreaterThanOrEqual(MOBILE_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000 - 1000);
    expect(saved.expiresAt.getTime() - saved.createdAt.getTime()).toBeLessThanOrEqual(MOBILE_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000 + 1000);
    await mobileAuthService.revoke(response.body.refreshToken);
  });

  it('rotates refresh tokens once and revokes the session family when a consumed token is replayed', async () => {
    const user = await serverDb.getUserByEmail(email);
    const first = await mobileAuthService.createSession(user!, requestContext);
    const firstClaims = jwt.decode(first.accessToken) as jwt.JwtPayload;
    const rotated = await mobileAuthService.refresh(first.refreshToken);

    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;
    expect(rotated.result.refreshToken).not.toBe(first.refreshToken);

    const replay = await mobileAuthService.refresh(first.refreshToken);
    expect(replay).toEqual({ ok: false, code: 'REFRESH_TOKEN_REUSED' });
    expect(await serverDb.isSessionActive(user!.id, String(firstClaims.sessionId))).toBe(false);
    expect(await mobileAuthService.refresh(rotated.result.refreshToken)).toEqual({ ok: false, code: 'REFRESH_TOKEN_REUSED' });
  });

  it('rejects expired refresh tokens and revokes their associated session', async () => {
    const user = await serverDb.getUserByEmail(email);
    const bundle = await mobileAuthService.createSession(user!, requestContext);
    const hash = crypto.createHash('sha256').update(bundle.refreshToken).digest('hex');
    await (prisma as any).mobileRefreshToken.update({
      where: { tokenHash: hash },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await mobileAuthService.refresh(bundle.refreshToken)).toEqual({ ok: false, code: 'INVALID_REFRESH_TOKEN' });
    const claims = jwt.decode(bundle.accessToken) as jwt.JwtPayload;
    expect(await serverDb.isSessionActive(user!.id, String(claims.sessionId))).toBe(false);
  });

  it('revokes a mobile session on logout and rejects browser traffic on native endpoints', async () => {
    const user = await serverDb.getUserByEmail(email);
    const bundle = await mobileAuthService.createSession(user!, requestContext);
    const logout = await request(app).post('/api/auth/mobile/logout').send({ refreshToken: bundle.refreshToken });
    expect(logout.status).toBe(200);
    expect(logout.headers['set-cookie']).toBeUndefined();
    expect(await mobileAuthService.refresh(bundle.refreshToken)).toMatchObject({ ok: false });

    const browserAttempt = await request(app)
      .post('/api/auth/mobile/refresh')
      .set('Origin', 'http://localhost:3000')
      .send({ refreshToken: bundle.refreshToken });
    expect(browserAttempt.status).toBe(400);
    expect(browserAttempt.body.code).toBe('NATIVE_CLIENT_REQUIRED');
  });

  it('keeps the legacy originless native token response during migration, without creating cookies', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Password123!' });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.headers['set-cookie']).toBeUndefined();
  });
});
