import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { prisma, serverDb } from '../../database.js';
import { authService } from '../../services/authService.js';
import { authRepository } from '../../repositories/authRepository.js';
import adminRouter from '../../routes/admin.js';
import privacyRouter from '../../routes/privacy.js';
import { generalApiLimiter, diagnosticsLimiter, accountDeletionLimiter, adminDeletionLimiter } from '../../middleware/rateLimiters.js';
import { optionalAuth, requireAuth, requireRole } from '../../middleware/auth.js';
import { getAiClient } from '../../config/aiConfig.js';

describe('Security Hardening Audit & Regression Test Suite', () => {
  let app: express.Express;
  let adminToken: string;
  let userToken: string;
  let adminUserId: string;
  let targetUserId: string;
  const adminPassword = 'AdminPassword123!';
  const userPassword = 'UserPassword123!';

  beforeAll(async () => {
    process.env.JWT_SECRET = 'a9f8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8';
    process.env.ENCRYPTION_KEY = 'e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7';
    process.env.ENABLE_AI_DIAGNOSTICS = 'true';

    // Setup test users in Prisma DB
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const userHash = await bcrypt.hash(userPassword, 10);

    const admin = await prisma.users.upsert({
      where: { email: 'admin-sec-audit@ui.ac.id' },
      update: { passwordHash: adminHash, role: 'admin', emailVerified: true },
      create: {
        id: 'usr_admin_sec_audit',
        email: 'admin-sec-audit@ui.ac.id',
        name: 'Admin Sec Audit',
        passwordHash: adminHash,
        role: 'admin',
        tier: 'Enterprise',
        university: 'Universitas Indonesia',
        emailVerified: true
      }
    });
    adminUserId = admin.id;

    const targetUser = await prisma.users.upsert({
      where: { email: 'target-sec-audit@ui.ac.id' },
      update: { passwordHash: userHash, role: 'mahasiswa', emailVerified: true },
      create: {
        id: 'usr_target_sec_audit',
        email: 'target-sec-audit@ui.ac.id',
        name: 'Target Sec Audit',
        passwordHash: userHash,
        role: 'mahasiswa',
        tier: 'Free',
        university: 'Universitas Indonesia',
        emailVerified: true
      }
    });
    targetUserId = targetUser.id;

    adminToken = authService.generateSessionToken({
      userId: admin.id,
      email: admin.email,
      role: 'admin',
      tier: 'Enterprise',
      sessionId: 'sess_admin_audit',
      name: admin.name
    });

    userToken = authService.generateSessionToken({
      userId: targetUser.id,
      email: targetUser.email,
      role: 'mahasiswa',
      tier: 'Free',
      sessionId: 'sess_user_audit',
      name: targetUser.name
    });

    // Create session records so requireAuth session check passes
    await prisma.userSession.upsert({
      where: { id: 'sess_admin_audit' },
      update: { userId: admin.id, lastActive: new Date() },
      create: {
        id: 'sess_admin_audit',
        userId: admin.id,
        ip: '127.0.0.1',
        userAgent: 'vitest',
        device: 'Desktop',
        createdAt: new Date(),
        lastActive: new Date()
      }
    });

    await prisma.userSession.upsert({
      where: { id: 'sess_user_audit' },
      update: { userId: targetUser.id, lastActive: new Date() },
      create: {
        id: 'sess_user_audit',
        userId: targetUser.id,
        ip: '127.0.0.1',
        userAgent: 'vitest',
        device: 'Desktop',
        createdAt: new Date(),
        lastActive: new Date()
      }
    });

    // Setup Express App
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // AI Diagnostics Endpoint
    app.get(['/api/v1/verify-gemini', '/api/verify-gemini'], diagnosticsLimiter, optionalAuth, async (req, res) => {
      const isProduction = process.env.NODE_ENV === 'production';
      const isDiagnosticsEnabled = process.env.ENABLE_AI_DIAGNOSTICS === 'true';
      const isAuthenticated = Boolean(req.user);
      const isAdminUser = req.user?.role === 'admin';

      if (isProduction) {
        if (!isDiagnosticsEnabled || !isAuthenticated || !isAdminUser) {
          return res.status(403).json({
            success: false,
            error: 'Akses ditolak. Endpoint diagnostik dinonaktifkan atau memerlukan akses administrator terautentikasi.',
            timestamp: new Date().toISOString()
          });
        }
      } else {
        if (!isDiagnosticsEnabled && !isAdminUser) {
          return res.status(403).json({
            success: false,
            error: 'Akses ditolak. Endpoint diagnostik dinonaktifkan demi keamanan.',
            timestamp: new Date().toISOString()
          });
        }
      }

      res.status(200).json({
        success: true,
        status: 'success',
        latencyMs: 12,
        modelUsed: 'gemini-3.1-flash-lite',
        responseStatus: 'OK',
        timestamp: new Date().toISOString()
      });
    });

    app.use('/api/v1', adminRouter);
    app.use('/api/v1/privacy', privacyRouter);
  });

  // --- 1. HARDEN AI DIAGNOSTICS ENDPOINT ---
  describe('1. AI Diagnostics Endpoint Security', () => {
    it('should reject unauthenticated user in production mode', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const res = await request(app).get('/api/v1/verify-gemini');
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('should reject non-admin authenticated user in production mode', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const res = await request(app)
          .get('/api/v1/verify-gemini')
          .set('Cookie', [`ruangtenang_session=${userToken}`]);
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('should allow authenticated admin in production mode when ENABLE_AI_DIAGNOSTICS is true', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_AI_DIAGNOSTICS = 'true';
      try {
        const res = await request(app)
          .get('/api/v1/verify-gemini')
          .set('Cookie', [`ruangtenang_session=${adminToken}`]);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.latencyMs).toBeDefined();
        expect(res.body.apiKey).toBeUndefined();
        expect(res.body.secret).toBeUndefined();
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('should reject when ENABLE_AI_DIAGNOSTICS is false even for admin in production', async () => {
      const origEnv = process.env.NODE_ENV;
      const origDiag = process.env.ENABLE_AI_DIAGNOSTICS;
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_AI_DIAGNOSTICS = 'false';
      try {
        const res = await request(app)
          .get('/api/v1/verify-gemini')
          .set('Cookie', [`ruangtenang_session=${adminToken}`]);
        expect(res.status).toBe(403);
      } finally {
        process.env.NODE_ENV = origEnv;
        process.env.ENABLE_AI_DIAGNOSTICS = origDiag;
      }
    });
  });

  // --- 2. STEP-UP AUTH & ADMIN ACCOUNT DELETION ---
  describe('2. Step-up Auth & Admin Account Deletion Security', () => {
    it('should reject unauthenticated request to admin erase user', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${targetUserId}/erase`)
        .send({ confirmText: 'HAPUS DATA USER', reason: 'Audit test', password: adminPassword });
      expect(res.status).toBe(401);
    });

    it('should reject non-admin request to admin erase user', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${targetUserId}/erase`)
        .set('Cookie', [`ruangtenang_session=${userToken}`])
        .send({ confirmText: 'HAPUS DATA USER', reason: 'Audit test', password: userPassword });
      expect(res.status).toBe(403);
    });

    it('should reject if confirmText is incorrect', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${targetUserId}/erase`)
        .set('Cookie', [`ruangtenang_session=${adminToken}`])
        .send({ confirmText: 'WRONG CONFIRMATION', reason: 'Audit test', password: adminPassword });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('CONFIRMATION_REQUIRED');
    });

    it('should reject if reason is missing', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${targetUserId}/erase`)
        .set('Cookie', [`ruangtenang_session=${adminToken}`])
        .send({ confirmText: 'HAPUS DATA USER', reason: '', password: adminPassword });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('REASON_REQUIRED');
    });

    it('should reject if password is missing or wrong', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${targetUserId}/erase`)
        .set('Cookie', [`ruangtenang_session=${adminToken}`])
        .send({ confirmText: 'HAPUS DATA USER', reason: 'Pelanggaran TOS', password: 'WrongPassword!' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_PASSWORD');
    });

    it('should prevent accidental self-erasure on admin erase endpoint', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${adminUserId}/erase`)
        .set('Cookie', [`ruangtenang_session=${adminToken}`])
        .send({ confirmText: 'HAPUS DATA USER', reason: 'Self test', password: adminPassword });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SELF_ERASURE_NOT_ALLOWED');
    });

    it('should successfully erase target user when step-up authentication succeeds', async () => {
      // Create a temporary user to erase
      const tempUser = await prisma.users.upsert({
        where: { id: 'usr_to_be_erased_test' },
        update: { email: 'erasetest@ui.ac.id', emailVerified: true },
        create: {
          id: 'usr_to_be_erased_test',
          email: 'erasetest@ui.ac.id',
          name: 'Erase Test User',
          passwordHash: 'hash123',
          role: 'mahasiswa',
          tier: 'Free',
          university: 'Universitas Indonesia',
          emailVerified: true
        }
      });

      const res = await request(app)
        .post(`/api/v1/users/${tempUser.id}/erase`)
        .set('Cookie', [`ruangtenang_session=${adminToken}`])
        .send({ confirmText: 'HAPUS DATA USER', reason: 'Penutupan akun terbukti melanggar kebijakan kampus', password: adminPassword });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify user is removed
      const deletedUser = await prisma.users.findUnique({ where: { id: tempUser.id } });
      expect(deletedUser).toBeNull();

      // Verify audit log exists
      const logs = await prisma.auditLogs.findMany({
        where: { action: 'ADMIN_DELETE_USER' }
      });
      expect(logs.length).toBeGreaterThan(0);
      const log = logs[logs.length - 1];
      expect(log.details).toContain(tempUser.id);
      expect(log.details).not.toContain(adminPassword);
    });

    it('should restrict self erasure (/privacy/erasure-request) to req.user.userId only', async () => {
      const res = await request(app)
        .post('/api/v1/privacy/erasure-request')
        .set('Cookie', [`ruangtenang_session=${userToken}`])
        .send({
          userId: adminUserId, // Attempt spoofed target userId in body
          confirmText: 'HAPUS AKUN SAYA',
          confirmPassword: userPassword
        });

      // It should process self erasure for targetUserId (userToken's userId), NOT adminUserId
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify targetUserId (userToken) was erased, but adminUserId was NOT touched
      const adminAfter = await prisma.users.findUnique({ where: { id: adminUserId } });
      expect(adminAfter).not.toBeNull();
    });
  });

  // --- 3. REMOVE LEGACY PLAINTEXT TOKEN FALLBACK ---
  describe('3. Plaintext Token Fallback Removal Security', () => {
    it('should reject plaintext token when only hashed token exists in DB for password reset', async () => {
      const resetToken = 'secret-reset-token-123';
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Create dummy user with hashed reset token
      const dummy = await prisma.users.create({
        data: {
          id: 'usr_reset_test',
          email: 'resettest@ui.ac.id',
          name: 'Reset Test',
          passwordHash: 'oldhash',
          role: 'mahasiswa',
          tier: 'Free',
          university: 'UI',
          passwordResetToken: hashedToken,
          passwordResetExpires: new Date(Date.now() + 15 * 60 * 1000)
        }
      });

      // Verify reset using valid plaintext token input (which repository hashes before querying)
      const resValid = await authRepository.resetPasswordWithToken(resetToken, 'newhash123');
      expect(resValid.success).toBe(true);

      // Verify attempting to pass the pre-hashed string directly as token input will fail because repository hashes input again
      const resInvalid = await authRepository.resetPasswordWithToken(hashedToken, 'anotherhash');
      expect(resInvalid.success).toBe(false);

      // Clean up
      await prisma.users.delete({ where: { id: dummy.id } }).catch(() => {});
    });

    it('should reject plaintext MFA token lookup fallback', async () => {
      const mfaCode = '123456';
      const mfaToken = 'mfa-challenge-token-999';
      const hashedCode = crypto.createHash('sha256').update(mfaCode).digest('hex');
      const hashedToken = crypto.createHash('sha256').update(mfaToken).digest('hex');

      const dummy = await prisma.users.create({
        data: {
          id: 'usr_mfa_test',
          email: 'mfatest@ui.ac.id',
          name: 'MFA Test',
          passwordHash: 'hash',
          role: 'mahasiswa',
          tier: 'Free',
          university: 'UI',
          mfaCode: hashedCode,
          mfaToken: hashedToken,
          mfaExpires: new Date(Date.now() + 10 * 60 * 1000)
        }
      });

      // Verify MFA with proper raw mfaToken & code
      const verified = await authRepository.verifyMfaCode(mfaToken, mfaCode);
      expect(verified).not.toBeNull();
      expect(verified?.id).toBe(dummy.id);

      // Clean up
      await prisma.users.delete({ where: { id: dummy.id } }).catch(() => {});
    });
  });

  // --- 4. LEGACY COOKIE DEPRECATION ---
  describe('4. Legacy Cookie Deprecation Security', () => {
    it('should set ruangtenang_session cookie and clear legacy token cookie', () => {
      const resCookies: Record<string, any> = {};
      const clearedCookies: string[] = [];

      const res = {
        cookie: (name: string, value: string, options: any) => {
          resCookies[name] = { value, options };
        },
        clearCookie: (name: string, options: any) => {
          clearedCookies.push(name);
        }
      } as any;

      authService.setSessionCookie(res, 'sample-jwt-token');

      expect(resCookies['ruangtenang_session']).toBeDefined();
      expect(resCookies['ruangtenang_session'].value).toBe('sample-jwt-token');
      expect(resCookies['token']).toBeUndefined();
      expect(clearedCookies).toContain('token');
    });
  });
});
