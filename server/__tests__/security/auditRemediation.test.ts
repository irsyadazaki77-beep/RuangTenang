import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { prisma } from '../../database.js';
import authRouter from '../../routes/auth.js';
import userDataRouter from '../../routes/userData.js';
import { getJwtSecret } from '../../middleware/auth.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/auth', authRouter);
app.use('/api/v1', userDataRouter);

const generateToken = (user: { userId: string; role: string; email?: string; sessionId?: string }) => {
  return jwt.sign(
    {
      userId: user.userId,
      role: user.role,
      email: user.email || `${user.userId}@test.com`,
      sessionId: user.sessionId || 'test-session-id',
      tier: 'Free',
      name: 'Test Subject'
    },
    getJwtSecret(),
    {
      expiresIn: '1h',
      issuer: 'ruangtenang',
      audience: 'ruangtenang-web',
      algorithm: 'HS256'
    }
  );
};

describe('Audit Remediation & Hardening Test Suite (Fase 1-3)', () => {
  const TEST_STUDENT_ID = 'user-audit-remed-student';
  const TEST_ADMIN_ID = 'user-audit-remed-admin';
  let studentToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Cleanup prior test records
    await prisma.users.deleteMany({
      where: { id: { in: [TEST_STUDENT_ID, TEST_ADMIN_ID] } }
    });

    // Create test student
    await prisma.users.create({
      data: {
        id: TEST_STUDENT_ID,
        name: 'Mahasiswa Asli',
        email: 'mahasiswa_remed@test.ac.id',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        role: 'mahasiswa',
        tier: 'Free',
        university: 'Universitas Indonesia',
        emailVerified: true,
        mfaEnabled: false,
        activeSessions: JSON.stringify([
          {
            sessionId: 'sess-remed-stud',
            ip: '127.0.0.1',
            userAgent: 'test-agent',
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
          }
        ])
      }
    });

    // Create test admin with MFA
    await prisma.users.create({
      data: {
        id: TEST_ADMIN_ID,
        name: 'Admin Utama',
        email: 'admin_remed@test.ac.id',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        role: 'admin',
        tier: 'Developer',
        university: 'RuangTenang HQ',
        emailVerified: true,
        mfaEnabled: true,
        activeSessions: JSON.stringify([
          {
            sessionId: 'sess-remed-admin',
            ip: '127.0.0.1',
            userAgent: 'test-agent',
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
          }
        ])
      }
    });

    studentToken = generateToken({
      userId: TEST_STUDENT_ID,
      role: 'mahasiswa',
      sessionId: 'sess-remed-stud'
    });

    adminToken = generateToken({
      userId: TEST_ADMIN_ID,
      role: 'admin',
      sessionId: 'sess-remed-admin'
    });
  });

  afterAll(async () => {
    await prisma.users.deleteMany({
      where: { id: { in: [TEST_STUDENT_ID, TEST_ADMIN_ID] } }
    });
  });

  describe('1. User Profile Input Validation & Sanitization (userData.ts)', () => {
    it('rejects profile update without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/profile')
        .send({ name: 'Hacker', university: 'Hacked Univ' });

      expect(res.status).toBe(401);
    });

    it('rejects profile update with missing or empty name', async () => {
      const res = await request(app)
        .post('/api/v1/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: '', university: 'UI' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects profile update with oversized name (>100 chars)', async () => {
      const oversizedName = 'A'.repeat(105);
      const res = await request(app)
        .post('/api/v1/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: oversizedName, university: 'UI' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('sanitizes HTML and script tags from profile name before updating database', async () => {
      const maliciousName = '<script>alert("xss")</script>Budi Pratama';
      const res = await request(app)
        .post('/api/v1/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: maliciousName, university: 'Universitas Gadjah Mada' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.name).toBe('Budi Pratama');
      expect(res.body.name).not.toContain('<script>');

      const updated = await prisma.users.findUnique({
        where: { id: TEST_STUDENT_ID },
        select: { name: true, university: true }
      });
      expect(updated?.name).toBe('Budi Pratama');
      expect(updated?.university).toBe('Universitas Gadjah Mada');
    });

    it('rejects profile update if name contains only HTML tags that become empty after sanitization', async () => {
      const res = await request(app)
        .post('/api/v1/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: '<b></b>', university: 'ITB' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('tidak valid');
    });
  });

  describe('2. Step-Up MFA Challenge Endpoint (auth.ts)', () => {
    it('rejects MFA challenge request from unauthenticated client', async () => {
      const res = await request(app).post('/api/v1/auth/mfa/challenge');
      expect(res.status).toBe(401);
    });

    it('generates 6-digit MFA challenge for authenticated admin or user with MFA', async () => {
      const res = await request(app)
        .post('/api/v1/auth/mfa/challenge')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mfaRequired).toBe(true);
      expect(res.body.mfaToken).toBeDefined();

      const adminUser = await prisma.users.findUnique({
        where: { id: TEST_ADMIN_ID },
        select: { mfaCode: true, mfaExpires: true, mfaToken: true }
      });
      expect(adminUser?.mfaCode).toBeDefined();
      expect(adminUser?.mfaExpires).toBeDefined();
      expect(new Date(adminUser!.mfaExpires!).getTime()).toBeGreaterThan(Date.now());
    });
  });
});
