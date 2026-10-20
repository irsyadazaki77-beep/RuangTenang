import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma, serverDb } from '../../database.js';
import privacyRouter from '../../routes/privacy.js';
import adminRouter from '../../routes/admin.js';
import { getJwtSecret } from '../../middleware/auth.js';
import { SafeMeetingLinkSchema, CreateAppointmentSchema } from '../../../shared/contracts/appointments.js';
import { getSafeExternalUrl } from '../../../src/lib/safeUrl.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/privacy', privacyRouter);
app.use('/api/v1', adminRouter);

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

describe('Goal Security Hardening & Vulnerability Remediation Suite', () => {
  const TEST_STUDENT_ID = 'usr-goal-sec-student';
  const TEST_OTHER_STUDENT_ID = 'usr-goal-sec-other';
  const TEST_ADMIN_ID = 'usr-goal-sec-admin';
  const PLAIN_PASSWORD = 'ValidPassword123!';
  let studentToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Cleanup prior test artifacts
    await prisma.userSession.deleteMany({
      where: { userId: { in: [TEST_STUDENT_ID, TEST_OTHER_STUDENT_ID, TEST_ADMIN_ID] } }
    });
    await prisma.users.deleteMany({
      where: { id: { in: [TEST_STUDENT_ID, TEST_OTHER_STUDENT_ID, TEST_ADMIN_ID] } }
    });

    const passwordHash = await bcrypt.hash(PLAIN_PASSWORD, 10);

    // Create test student
    const studentUser = await prisma.users.create({
      data: {
        id: TEST_STUDENT_ID,
        name: 'Mahasiswa Goal Test',
        email: 'mahasiswa_goal@ui.ac.id',
        passwordHash,
        role: 'mahasiswa',
        tier: 'Free',
        university: 'Universitas Indonesia',
        emailVerified: true,
        mfaEnabled: false,
        activeSessions: '[]'
      }
    });

    // Create another existing user to test email collisions
    await prisma.users.create({
      data: {
        id: TEST_OTHER_STUDENT_ID,
        name: 'Mahasiswa Lain',
        email: 'mahasiswa_lain@ui.ac.id',
        passwordHash,
        role: 'mahasiswa',
        tier: 'Free',
        university: 'Universitas Indonesia',
        emailVerified: true,
        mfaEnabled: false,
        activeSessions: '[]'
      }
    });

    // Create test admin
    const adminUser = await prisma.users.create({
      data: {
        id: TEST_ADMIN_ID,
        name: 'Admin Goal Test',
        email: 'admin_goal@ruangtenang.id',
        passwordHash,
        role: 'admin',
        tier: 'Developer',
        university: 'Pusat RuangTenang',
        emailVerified: true,
        mfaEnabled: true,
        activeSessions: '[]'
      }
    });

    // Add active sessions in DB
    const studentSessId = 'sess-goal-student-1';
    const adminSessId = 'sess-goal-admin-1';

    await serverDb.addActiveSession(studentUser.id, {
      sessionId: studentSessId,
      device: 'Desktop / Browser',
      ip: '127.0.0.1',
      userAgent: 'Vitest Security Agent',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    });

    await serverDb.addActiveSession(adminUser.id, {
      sessionId: adminSessId,
      device: 'Desktop / Browser',
      ip: '127.0.0.1',
      userAgent: 'Vitest Security Agent',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    });

    studentToken = generateToken({
      userId: studentUser.id,
      role: 'mahasiswa',
      email: studentUser.email,
      sessionId: studentSessId
    });

    adminToken = generateToken({
      userId: adminUser.id,
      role: 'admin',
      email: adminUser.email,
      sessionId: adminSessId
    });
  });

  afterAll(async () => {
    await prisma.userSession.deleteMany({
      where: { userId: { in: [TEST_STUDENT_ID, TEST_OTHER_STUDENT_ID, TEST_ADMIN_ID] } }
    });
    await prisma.users.deleteMany({
      where: { id: { in: [TEST_STUDENT_ID, TEST_OTHER_STUDENT_ID, TEST_ADMIN_ID] } }
    });
  });

  describe('1. Meeting Link Scheme Validation & Sanitization', () => {
    it('rejects javascript: XSS pseudo-protocol payloads in SafeMeetingLinkSchema', () => {
      const xssPayloads = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(document.cookie)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'http://insecure-meeting.com' // must be HTTPS
      ];

      for (const payload of xssPayloads) {
        const res = SafeMeetingLinkSchema.safeParse(payload);
        expect(res.success).toBe(false);
      }
    });

    it('accepts valid HTTPS meeting links in SafeMeetingLinkSchema and CreateAppointmentSchema', () => {
      const validLinks = [
        'https://meet.jit.si/ruangtenang-sesi-123',
        'https://zoom.us/j/123456789',
        'https://meet.google.com/abc-defg-hij',
        'https://konseling.ui.ac.id/room/c1',
        '',
        undefined
      ];

      for (const link of validLinks) {
        const res = SafeMeetingLinkSchema.safeParse(link);
        expect(res.success).toBe(true);
      }

      const appointmentPayload = {
        counselorName: 'Dr. Anita Rahmawati',
        date: '2026-10-25',
        time: '14:00',
        meetingLink: 'https://meet.jit.si/ruangtenang-counseling-1'
      };
      expect(CreateAppointmentSchema.safeParse(appointmentPayload).success).toBe(true);
    });

    it('getSafeExternalUrl strictly permits only HTTPS protocol', () => {
      expect(getSafeExternalUrl('javascript:alert(1)')).toBeNull();
      expect(getSafeExternalUrl('data:text/html,test')).toBeNull();
      expect(getSafeExternalUrl('http://insecure.com')).toBeNull();
      expect(getSafeExternalUrl('')).toBeNull();
      expect(getSafeExternalUrl(null)).toBeNull();
      expect(getSafeExternalUrl(undefined)).toBeNull();
      expect(getSafeExternalUrl('https://meet.jit.si/room-test')).toBe('https://meet.jit.si/room-test');
    });
  });

  describe('2. Secure Profile Correction & Email Modification (/api/v1/privacy/correct-data)', () => {
    it('allows updating non-sensitive profile details (name, university) without password', async () => {
      const res = await request(app)
        .post('/api/v1/privacy/correct-data')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Mahasiswa Nama Baru',
          university: 'Universitas Indonesia - FT'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe('Mahasiswa Nama Baru');
      expect(res.body.user.university).toBe('Universitas Indonesia - FT');
      expect(res.body.emailVerificationRequired).toBe(false);
    });

    it('blocks email modification when currentPassword is omitted', async () => {
      const res = await request(app)
        .post('/api/v1/privacy/correct-data')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          email: 'email_baru@ui.ac.id'
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('PASSWORD_REQUIRED');
    });

    it('blocks email modification when currentPassword is incorrect', async () => {
      const res = await request(app)
        .post('/api/v1/privacy/correct-data')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          email: 'email_baru@ui.ac.id',
          currentPassword: 'WrongPassword999!'
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_PASSWORD');
    });

    it('blocks changing email to an address that is already registered by another user', async () => {
      const res = await request(app)
        .post('/api/v1/privacy/correct-data')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          email: 'mahasiswa_lain@ui.ac.id',
          currentPassword: PLAIN_PASSWORD
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('EMAIL_ALREADY_REGISTERED');
    });

    it('successfully changes email with correct password, resetting emailVerified and issuing verification code', async () => {
      const newEmail = 'mahasiswa_resmi_baru@ui.ac.id';
      const res = await request(app)
        .post('/api/v1/privacy/correct-data')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          email: newEmail,
          currentPassword: PLAIN_PASSWORD
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.emailVerificationRequired).toBe(true);
      expect(res.body.user.email).toBe(newEmail);
      expect(res.body.user.emailVerified).toBe(false);

      // Verify DB record
      const updatedUser = await prisma.users.findUnique({ where: { id: TEST_STUDENT_ID } });
      expect(updatedUser?.email).toBe(newEmail);
      expect(updatedUser?.emailVerified).toBe(false);
      expect(updatedUser?.emailVerificationCode).toBeDefined();
    });
  });

  describe('3. Telemetry Log Creation Role Authorization (/api/v1/telemetry/log)', () => {
    it('rejects unprivileged student role from creating telemetry logs (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/telemetry/log')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          service: 'SOS Gateway',
          status: 'SUCCESS',
          latencyMs: 150,
          details: 'Malicious student injection'
        });

      expect(res.status).toBe(403);
    });

    it('permits authorized administrator to create telemetry logs', async () => {
      const res = await request(app)
        .post('/api/v1/telemetry/log')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          service: 'SOS Gateway',
          status: 'SUCCESS',
          latencyMs: 85,
          details: 'Authorized system health check telemetry'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.record.service).toBe('SOS Gateway');
    });
  });
});
