import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { prisma } from '../database.js';
import { DATA_CLASSIFICATION } from '../config/dataClassification.js';
import { validateEnvironment } from '../config/envValidation.js';
import { encryptionService } from '../services/encryptionService.js';
import { authRepository } from '../repositories/authRepository.js';
import { appointmentRepository } from '../repositories/appointmentRepository.js';
import { screeningRepository } from '../repositories/screeningRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { RetentionService } from '../services/retentionService.js';
import { csrfProtection } from '../middleware/csrf.js';

describe('FASE 7: Data Privacy, Sensitive Data Lifecycle & Security Tests', () => {
  const TEST_USER_ID = 'test-priv-lifecycle-user';
  const TEST_COUNSELOR_ID = 'test-priv-counselor-1';

  beforeAll(async () => {
    // Clean up
    await prisma.chatMessages.deleteMany({ where: { chat: { userId: TEST_USER_ID } } });
    await prisma.chats.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.appointmentSlot.deleteMany({});
    await prisma.appointments.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.screenings.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.moodLogs.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.userConsents.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.emergencyContacts.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.userSession.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.counselors.deleteMany({ where: { id: TEST_COUNSELOR_ID } });
    await prisma.users.deleteMany({ where: { id: { in: [TEST_USER_ID, TEST_COUNSELOR_ID] } } });

    // Seed test users
    await prisma.users.create({
      data: {
        id: TEST_USER_ID,
        name: 'Mahasiswa Rahasia',
        email: 'mahasiswa.rahasia@kampus.ac.id',
        passwordHash: 'hash-secret',
        role: 'mahasiswa',
        tier: 'Free',
      }
    });

    await prisma.users.create({
      data: {
        id: TEST_COUNSELOR_ID,
        name: 'Dr. Konselor',
        email: 'konselor@kampus.ac.id',
        passwordHash: 'hash-secret',
        role: 'konselor',
        tier: 'Free',
      }
    });

    await prisma.counselors.create({
      data: {
        id: TEST_COUNSELOR_ID,
        name: 'Dr. Konselor',
        role: 'Spesialis Konseling Akademik',
        rating: 4.9,
        experienceYears: 8,
        specialties: JSON.stringify(['Akademik', 'Kecemasan']),
        imageUrl: '/avatars/counselor.png',
        availability: JSON.stringify(['09:00', '10:30', '14:00', '16:00'])
      }
    });
  });

  afterAll(async () => {
    await prisma.appointmentSlot.deleteMany({});
    await prisma.appointments.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.screenings.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.moodLogs.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.userConsents.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.emergencyContacts.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.userSession.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.counselors.deleteMany({ where: { id: TEST_COUNSELOR_ID } });
    await prisma.users.deleteMany({ where: { id: { in: [TEST_USER_ID, TEST_COUNSELOR_ID] } } });
  });

  // 1. DATA CLASSIFICATION SCHEMA VERIFICATION
  describe('1. Data Classification Documentation', () => {
    it('contains all canonical classification levels and models', () => {
      const models = Object.keys(DATA_CLASSIFICATION);
      expect(models).toContain('Users');
      expect(models).toContain('Appointments');
      expect(models).toContain('Screenings');
      expect(models).toContain('EmergencyContacts');
      expect(models).toContain('MoodLogs');
      expect(models).toContain('AuditLogs');

      // Verify Appointment classification
      expect(DATA_CLASSIFICATION.Appointments.notes.classification).toBe('MENTAL_HEALTH_DATA');
      expect(DATA_CLASSIFICATION.Appointments.studentNIM.classification).toBe('SENSITIVE_PII');
      expect(DATA_CLASSIFICATION.Appointments.studentEmail.classification).toBe('SENSITIVE_PII');

      // Verify Screening classification
      expect(DATA_CLASSIFICATION.Screenings.riskIndicators.classification).toBe('MENTAL_HEALTH_DATA');
      expect(DATA_CLASSIFICATION.Screenings.hasSelfHarmRisk.classification).toBe('MENTAL_HEALTH_DATA');
      expect(DATA_CLASSIFICATION.Screenings.item9Score.classification).toBe('MENTAL_HEALTH_DATA');

      // Verify Security Secrets
      expect(DATA_CLASSIFICATION.Users.passwordHash.classification).toBe('SECURITY_SECRET');
      expect(DATA_CLASSIFICATION.Users.mfaCode.classification).toBe('SECURITY_SECRET');
    });
  });

  // 2. PRODUCTION FAIL-FAST STARTUP VALIDATION
  describe('2. Environment Secret Validation', () => {
    it('throws in production if critical secrets are missing or weak', () => {
      const origEnv = process.env.NODE_ENV;
      const origJwt = process.env.JWT_SECRET;
      const origKey = process.env.DATA_ENCRYPTION_KEY;

      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      expect(() => validateEnvironment()).toThrow(/FATAL SECURITY ERROR: JWT_SECRET environment variable is missing/);

      // Restore
      process.env.NODE_ENV = origEnv;
      process.env.JWT_SECRET = origJwt;
      process.env.DATA_ENCRYPTION_KEY = origKey;
    });
  });

  // 3. AES-256-GCM KEY VERSIONING & ROTATION
  describe('3. AES-256-GCM Encryption with Key Versioning', () => {
    it('encrypts with active version prefix and roundtrips accurately', () => {
      const text = 'Catatan konseling sangat rahasia';
      const encrypted = encryptionService.encryptSensitive(text);

      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toEqual(text);
      expect(encrypted?.startsWith('v1:')).toBe(true);

      const decrypted = encryptionService.decryptSensitive(encrypted);
      expect(decrypted).toEqual(text);
    });

    it('rejects tampered ciphertexts via AEAD authentication tag check', () => {
      const text = 'Pesan asli';
      const encrypted = encryptionService.encryptSensitive(text);
      expect(encrypted).not.toBeNull();

      // Tamper ciphertext payload
      const parts = encrypted!.split(':');
      parts[3] = Buffer.from('tampered-ciphertext').toString('base64');
      const tampered = parts.join(':');

      expect(() => encryptionService.decryptSensitive(tampered)).toThrow(/Failed to decrypt sensitive data/);
    });

    it('supports multi-key rotation and re-encrypts records to newest key', () => {
      process.env.DATA_ENCRYPTION_KEY_V2 = Buffer.alloc(32, '2').toString('base64');

      // Encrypt with v1
      const v1Encrypted = encryptionService.encryptSensitive('Data lama versi 1', 'v1');
      expect(v1Encrypted?.startsWith('v1:')).toBe(true);

      // Decrypt using v1 key embedded in header
      const decryptedOld = encryptionService.decryptSensitive(v1Encrypted);
      expect(decryptedOld).toBe('Data lama versi 1');

      // Switch active version to v2
      encryptionService.setActiveKeyVersion('v2');
      const reEncrypted = encryptionService.reencryptWithCurrentKey(v1Encrypted);
      expect(reEncrypted?.startsWith('v2:')).toBe(true);
      expect(encryptionService.decryptSensitive(reEncrypted)).toBe('Data lama versi 1');

      // Restore active version to v1
      encryptionService.setActiveKeyVersion('v1');
    });
  });

  // 4. MFA SECURITY, HASHING & BRUTE FORCE LOCKOUT
  describe('4. MFA Hashing & Attempt Lockout', () => {
    it('hashes MFA code and verifies timing-safely', async () => {
      const code = '654321';
      const token = 'mfa-challenge-token-123';

      await authRepository.setMfaCode(TEST_USER_ID, code, token);

      // Verify DB stores hash not plaintext code
      const user = await prisma.users.findUnique({ where: { id: TEST_USER_ID } });
      expect(user?.mfaCode).not.toEqual(code);
      expect(user?.mfaCode).toEqual(crypto.createHash('sha256').update(code).digest('hex'));

      // Test successful verification
      const verifySuccess = await authRepository.verifyMfaCode(token, code);
      expect(verifySuccess).not.toBeNull();
      expect(verifySuccess?.id).toBe(TEST_USER_ID);

      // Verify single-use: MFA challenge is cleared after successful verification
      const userAfter = await prisma.users.findUnique({ where: { id: TEST_USER_ID } });
      expect(userAfter?.mfaCode).toBeNull();
      expect(userAfter?.mfaToken).toBeNull();
    });

    it('invalidates MFA challenge after 3 failed attempts', async () => {
      const code = '987654';
      const token = 'mfa-challenge-lockout-test';

      await authRepository.setMfaCode(TEST_USER_ID, code, token);

      // Attempt 1: wrong code
      const res1 = await authRepository.verifyMfaCode(token, '000000');
      expect(res1).toBeNull();

      // Attempt 2: wrong code
      const res2 = await authRepository.verifyMfaCode(token, '111111');
      expect(res2).toBeNull();

      // Attempt 3: wrong code -> Challenge cleared to prevent brute force
      const res3 = await authRepository.verifyMfaCode(token, '222222');
      expect(res3).toBeNull();

      // Check DB: MFA challenge has been cleared immediately
      const user = await prisma.users.findUnique({ where: { id: TEST_USER_ID } });
      expect(user?.mfaCode).toBeNull();
      expect(user?.mfaToken).toBeNull();
    });
  });

  // 5. APPOINTMENT SENSITIVE DATA ENCRYPTION
  describe('5. Appointment Sensitive Data Protection', () => {
    it('encrypts notes, studentNIM, studentEmail in database while returning decrypted in repository', async () => {
      const rawNotes = 'Saya mengalami kecemasan saat menghadapi ujian skripsi';
      const rawNIM = '13520999';
      const rawEmail = 'mahasiswa.rahasia@kampus.ac.id';

      const appt = await appointmentRepository.addAppointment({
        userId: TEST_USER_ID,
        counselorId: TEST_COUNSELOR_ID,
        counselorName: 'Dr. Konselor',
        date: '2026-09-01',
        time: '10:00',
        studentName: 'Mahasiswa Rahasia',
        studentNIM: rawNIM,
        studentEmail: rawEmail,
        notes: rawNotes,
        mode: 'Virtual Video Call',
        status: 'CONFIRMED',
        approvalStatus: 'APPROVED',
        attendanceStatus: 'SCHEDULED',
      });

      // Check repository output is transparently decrypted
      expect(appt.notes).toBe(rawNotes);
      expect(appt.studentNIM).toBe(rawNIM);
      expect(appt.studentEmail).toBe(rawEmail);

      // Check raw Prisma Database record is ciphertext with version tag
      const rawDb = await prisma.appointments.findUnique({ where: { id: appt.id } });
      expect(rawDb?.notes?.startsWith('v1:')).toBe(true);
      expect(rawDb?.notes).not.toEqual(rawNotes);
      expect(rawDb?.studentNIM?.startsWith('v1:')).toBe(true);
      expect(rawDb?.studentNIM).not.toEqual(rawNIM);
      expect(rawDb?.studentEmail?.startsWith('v1:')).toBe(true);
      expect(rawDb?.studentEmail).not.toEqual(rawEmail);
    });
  });

  // 6. SCREENING DATA PRIVACY & RISK INDICATORS ENCRYPTION
  describe('6. Screening Data Privacy & Encryption', () => {
    it('encrypts riskIndicators in DB while maintaining numerical metrics for analytics', async () => {
      const rawIndicators = ['sulit tidur', 'kehilangan minat belajar', 'pikiran membebani'];

      const screening = await screeningRepository.addScreening({
        userId: TEST_USER_ID,
        phq9Score: 14,
        gad7Score: 8,
        phq9Severity: 'Sedang',
        gad7Severity: 'Ringan',
        item9Score: 0,
        hasSelfHarmRisk: false,
        riskLevel: 'MEDIUM',
        riskIndicators: {
          item9Score: 0,
          hasSelfHarmRisk: false,
          riskCategory: 'Low'
        },
        status: 'Menunggu Penanganan',
      });

      // Repository output
      expect(screening.riskIndicators).toEqual({
        item9Score: 0,
        hasSelfHarmRisk: false,
        riskCategory: 'Low'
      });
      expect(screening.phq9Score).toBe(14);
      expect(screening.gad7Score).toBe(8);

      // Raw DB check
      const rawDb = await prisma.screenings.findUnique({ where: { id: screening.id } });
      expect(rawDb?.riskIndicators?.startsWith('v1:')).toBe(true);
      expect(rawDb?.riskIndicators).not.toContain('sulit tidur');
    });
  });

  // 7. STRUCTURED AUDIT LOGGING & PII SANITIZATION
  describe('7. Structured Audit Logging & PII Sanitization', () => {
    it('redacts PII from audit log details and pseudonymizes IP address', async () => {
      const sensitiveDetails = 'Konselor mengakses data mahasiswa Budi Santoso (budi@gmail.com, HP: 08123456789, NIM: 13520123)';
      const clientIp = '192.168.1.100';

      const log = await auditRepository.logAudit(
        'SENSITIVE_RECORD_ACCESS',
        sensitiveDetails,
        clientIp,
        'konselor'
      );

      expect(log.details).not.toContain('budi@gmail.com');
      expect(log.details).not.toContain('08123456789');
      expect(log.details).not.toContain('13520123');
      expect(log.details).toContain('[EMAIL_TERSEMBUNYI]');
      expect(log.details).toContain('[NOMOR_HP_TERSEMBUNYI]');
      expect(log.details).toContain('[NIM_TERSEMBUNYI]');

      // IP hash should be 16 chars SHA-256 slice
      expect(log.ipHash).toHaveLength(16);
      expect(log.ipHash).not.toEqual(clientIp);
    });

    it('logs structured audit events with pseudonymized actor & subject identifiers', async () => {
      const log = await auditRepository.logStructuredAudit({
        actorPseudonymousId: 'counselor-uuid-456',
        subjectPseudonymousId: 'student-uuid-789',
        action: 'CONSULTATION_NOTE_DECRYPT',
        resourceType: 'Appointment',
        resourceId: 'appt-123',
        purpose: 'Clinical Assessment',
        result: 'SUCCESS',
        ip: '10.0.0.1',
        userRole: 'konselor',
      });

      const parsedPayload = JSON.parse(log.details);
      expect(parsedPayload.actor).toHaveLength(16);
      expect(parsedPayload.subject).toHaveLength(16);
      expect(parsedPayload.resType).toBe('Appointment');
      expect(parsedPayload.purpose).toBe('Clinical Assessment');
      expect(parsedPayload.result).toBe('SUCCESS');
    });
  });

  // 8. RIGHT TO BE FORGOTTEN (DATA ERASURE)
  describe('8. Right to be Forgotten (Data Erasure ACID Execution)', () => {
    it('permanently deletes all user records and saves anonymized SHA-256 erasure record', async () => {
      const retention = new RetentionService();
      const result = await retention.eraseUserData(TEST_USER_ID, 'Mahasiswa Rahasia');

      expect(result.success).toBe(true);
      expect(result.erasedRecordsCount).toBeGreaterThan(0);

      // Verify all personal data was deleted
      const userCheck = await prisma.users.findUnique({ where: { id: TEST_USER_ID } });
      expect(userCheck).toBeNull();

      const apptCheck = await prisma.appointments.findMany({ where: { userId: TEST_USER_ID } });
      expect(apptCheck).toHaveLength(0);

      const screenCheck = await prisma.screenings.findMany({ where: { userId: TEST_USER_ID } });
      expect(screenCheck).toHaveLength(0);

      // Verify DataErasureRequests has SHA-256 hashed email
      const erasureLog = await prisma.dataErasureRequests.findFirst({
        where: { userId: TEST_USER_ID },
        orderBy: { requestedAt: 'desc' }
      });
      expect(erasureLog).not.toBeNull();
      expect(erasureLog?.userEmail).not.toContain('@');
      expect(erasureLog?.userEmail).toHaveLength(64); // SHA-256 hex
    });
  });

  // 9. CSRF PROTECTION MIDDLEWARE
  describe('9. CSRF Protection Middleware', () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.use(cookieParser());
    testApp.use(csrfProtection);

    testApp.post('/api/test-mutation', (req, res) => {
      res.json({ success: true });
    });

    it('allows GET read requests without CSRF check', async () => {
      testApp.get('/api/test-read', (req, res) => res.json({ ok: true }));
      const res = await request(testApp).get('/api/test-read');
      expect(res.status).toBe(200);
    });

    it('allows mutation if custom client header is present (X-Requested-With)', async () => {
      const res = await request(testApp)
        .post('/api/test-mutation')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ data: 'test' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('allows mutation if Authorization Bearer token is present', async () => {
      const res = await request(testApp)
        .post('/api/test-mutation')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send({ data: 'test' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('blocks mutation with ambient cookie auth from untrusted origin', async () => {
      const res = await request(testApp)
        .post('/api/test-mutation')
        .set('Cookie', 'ruangtenang_session=session-token-123')
        .set('Origin', 'https://malicious-attacker-site.com')
        .set('Host', 'ruangtenang.campus.ac.id')
        .send({ action: 'deleteAccount' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CSRF_FORBIDDEN');
    });
  });
});
