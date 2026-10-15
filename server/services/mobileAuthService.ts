import crypto from 'crypto';
import { Request } from 'express';
import { prisma, serverDb, UserRecord } from '../database.js';
import { authService, TokenPayload } from './authService.js';
import { metricsService } from './metricsService.js';

export const MOBILE_ACCESS_TTL_SECONDS = 15 * 60;
export const MOBILE_REFRESH_TTL_DAYS = 30;
const mobileRefreshTable = (client: any) => client.mobileRefreshToken;

const hashRefreshToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const hashSessionId = (sessionId: string) => crypto.createHash('sha256').update(sessionId).digest('hex');
const newRefreshToken = () => crypto.randomBytes(32).toString('base64url');

function tokenPayload(user: UserRecord, sessionId: string): TokenPayload {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
    sessionId,
    name: user.name,
    sessionType: 'mobile',
  };
}

export const mobileAuthService = {
  async createSession(user: UserRecord, req: Request) {
    const sessionId = crypto.randomUUID();
    const refreshToken = newRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + MOBILE_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Native mobile client';

    await serverDb.addActiveSession(user.id, {
      sessionId,
      device: 'Native mobile/desktop',
      ip: clientIp,
      userAgent,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    });

    try {
      await mobileRefreshTable(prisma).create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          sessionId,
          familyId: crypto.randomUUID(),
          tokenHash: hashRefreshToken(refreshToken),
          expiresAt: refreshExpiresAt,
        },
      });
    } catch (error) {
      await serverDb.removeActiveSession(user.id, sessionId);
      throw error;
    }

    metricsService.recordAuthSession('mobile', req.headers['x-client-version']);

    return {
      success: true,
      accessToken: authService.generateMobileAccessToken(tokenPayload(user, sessionId)),
      tokenType: 'Bearer',
      accessTokenExpiresIn: MOBILE_ACCESS_TTL_SECONDS,
      refreshToken,
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
      user: authService.sanitizeUser(user),
    };
  },

  async refresh(rawToken: string): Promise<{ ok: true; result: Record<string, any> } | { ok: false; code: 'INVALID_REFRESH_TOKEN' | 'REFRESH_TOKEN_REUSED' }> {
    const tokenHash = hashRefreshToken(rawToken);
    const rotatedToken = newRefreshToken();
    const now = new Date();
    const rotatedExpiry = new Date(now.getTime() + MOBILE_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    const outcome = await prisma.$transaction(async (tx: any) => {
      const table = mobileRefreshTable(tx);
      const current = await table.findUnique({ where: { tokenHash } });
      if (!current) return { kind: 'invalid' as const };

      if (current.consumedAt || current.revokedAt) {
        await table.updateMany({
          where: { familyId: current.familyId, revokedAt: null },
          data: { revokedAt: now },
        });
        await tx.userSession.deleteMany({ where: { userId: current.userId, id: hashSessionId(current.sessionId) } });
        return { kind: 'reused' as const };
      }

      if (current.expiresAt <= now) {
        await table.updateMany({ where: { id: current.id, revokedAt: null }, data: { revokedAt: now } });
        await tx.userSession.deleteMany({ where: { userId: current.userId, id: hashSessionId(current.sessionId) } });
        return { kind: 'invalid' as const };
      }

      const claimed = await table.updateMany({
        where: { id: current.id, consumedAt: null, revokedAt: null },
        data: { consumedAt: now },
      });
      if (claimed.count !== 1) {
        await table.updateMany({ where: { familyId: current.familyId, revokedAt: null }, data: { revokedAt: now } });
        await tx.userSession.deleteMany({ where: { userId: current.userId, id: hashSessionId(current.sessionId) } });
        return { kind: 'reused' as const };
      }

      await table.create({
        data: {
          id: crypto.randomUUID(),
          userId: current.userId,
          sessionId: current.sessionId,
          familyId: current.familyId,
          tokenHash: hashRefreshToken(rotatedToken),
          expiresAt: rotatedExpiry,
        },
      });
      return { kind: 'rotated' as const, current };
    });

    if (outcome.kind === 'invalid') return { ok: false, code: 'INVALID_REFRESH_TOKEN' };
    if (outcome.kind === 'reused') return { ok: false, code: 'REFRESH_TOKEN_REUSED' };

    const user = await serverDb.getUserById(outcome.current.userId);
    if (!user || !await serverDb.isSessionActive(user.id, outcome.current.sessionId)) {
      await this.revokeSession(outcome.current.userId, outcome.current.sessionId, outcome.current.familyId);
      return { ok: false, code: 'INVALID_REFRESH_TOKEN' };
    }

    return {
      ok: true,
      result: {
        success: true,
        accessToken: authService.generateMobileAccessToken(tokenPayload(user, outcome.current.sessionId)),
        tokenType: 'Bearer',
        accessTokenExpiresIn: MOBILE_ACCESS_TTL_SECONDS,
        refreshToken: rotatedToken,
        refreshTokenExpiresAt: rotatedExpiry.toISOString(),
        user: authService.sanitizeUser(user),
      },
    };
  },

  async revoke(rawToken: string): Promise<void> {
    const current = await mobileRefreshTable(prisma).findUnique({ where: { tokenHash: hashRefreshToken(rawToken) } });
    if (!current) return;
    await this.revokeSession(current.userId, current.sessionId, current.familyId);
  },

  async revokeSession(userId: string, sessionId: string, familyId: string): Promise<void> {
    const now = new Date();
    await prisma.$transaction(async (tx: any) => {
      await mobileRefreshTable(tx).updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.userSession.deleteMany({ where: { userId, id: hashSessionId(sessionId) } });
    });
  },

  isRefreshTokenFormatValid(token: unknown): token is string {
    return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
  },
};
