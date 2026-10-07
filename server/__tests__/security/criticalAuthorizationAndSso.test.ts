import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { prisma } from '../../database.js';
import { getJwtSecret } from '../../middleware/auth.js';
import authRouter from '../../routes/auth.js';
import appointmentsRouter from '../../routes/appointments.js';
import screeningRouter from '../../routes/screening.js';
import counselorPortalRouter from '../../routes/counselorPortal.js';
import { encryptionService } from '../../services/encryptionService.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/appointments', appointmentsRouter);
app.use('/api/v1/screenings', screeningRouter);
app.use('/api/v1/counselor-portal', counselorPortalRouter);

const generateUserToken = (user: { userId: string; role: string; name: string; email: string; sessionId?: string }) => {
  return jwt.sign(
    {
      userId: user.userId,
      role: user.role,
      name: user.name,
      email: user.email,
      sessionId: user.sessionId || `sess-${user.userId}`
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

describe('FASE 1 — CRITICAL AUTHORIZATION & SSO HARDENING TEST SUITE', () => {
  const studentA = {
    userId: 'usr-sso-stu-a',
    name: 'Mahasiswa Alice',
    email: 'alice@ui.ac.id',
    role: 'mahasiswa'
  };

  const studentB = {
    userId: 'usr-sso-stu-b',
    name: 'Mahasiswa Bob',
    email: 'bob@itb.ac.id',
    role: 'mahasiswa'
  };

  const counselor1 = {
    userId: 'usr-sso-couns-1',
    name: 'Dr. Konselor Satu, M.Psi.',
    email: 'konselor1@ui.ac.id',
    role: 'konselor'
  };

  const counselor2 = {
    userId: 'usr-sso-couns-2',
    name: 'Dimas Konselor Dua, M.Psi.',
    email: 'konselor2@ugm.ac.id',
    role: 'konselor'
  };

  const campusAdmin = {
    userId: 'usr-sso-admin-1',
    name: 'Administrator Kampus',
    email: 'admin.kampus@ui.ac.id',
    role: 'admin'
  };

  let tokenStudentA: string;
  let tokenStudentB: string;
  let tokenCounselor1: string;
  let tokenCounselor2: string;
  let tokenAdmin: string;

  const apptAId = 'appt-sso-test-a-1';
  const apptBId = 'appt-sso-test-b-1';
  const counselorProfile1Id = 'c-sso-profile-1';
  const counselorProfile2Id = 'c-sso-profile-2';

  beforeAll(async () => {
    tokenStudentA = generateUserToken(studentA);
    tokenStudentB = generateUserToken(studentB);
    tokenCounselor1 = generateUserToken(counselor1);
    tokenCounselor2 = generateUserToken(counselor2);
    tokenAdmin = generateUserToken(campusAdmin);

    // Clean test data
    await prisma.clinicalSoapNotes.deleteMany({
      where: {
        OR: [
          { studentUserId: { in: [studentA.userId, studentB.userId] } },
          { counselorUserId: { in: [counselor1.userId, counselor2.userId] } }
        ]
      }
    });
    await prisma.appointments.deleteMany({
      where: {
        OR: [
          { id: { in: [apptAId, apptBId] } },
          { userId: { in: [studentA.userId, studentB.userId] } }
        ]
      }
    });
    await prisma.screenings.deleteMany({
      where: { userId: { in: [studentA.userId, studentB.userId] } }
    });
    await prisma.userConsents.deleteMany({
      where: { userId: { in: [studentA.userId, studentB.userId] } }
    });
    await prisma.counselors.deleteMany({
      where: { id: { in: [counselorProfile1Id, counselorProfile2Id] } }
    });
    await prisma.users.deleteMany({
      where: {
        id: { in: [studentA.userId, studentB.userId, counselor1.userId, counselor2.userId, campusAdmin.userId] }
      }
    });

    // Create seed users with active sessions in DB
    await prisma.users.createMany({
      data: [
        {
          id: studentA.userId,
          name: studentA.name,
          email: studentA.email,
          passwordHash: 'hash',
          role: studentA.role,
          activeSessions: JSON.stringify([{ sessionId: `sess-${studentA.userId}` }])
        },
        {
          id: studentB.userId,
          name: studentB.name,
          email: studentB.email,
          passwordHash: 'hash',
          role: studentB.role,
          activeSessions: JSON.stringify([{ sessionId: `sess-${studentB.userId}` }])
        },
        {
          id: counselor1.userId,
          name: counselor1.name,
          email: counselor1.email,
          passwordHash: 'hash',
          role: counselor1.role,
          activeSessions: JSON.stringify([{ sessionId: `sess-${counselor1.userId}` }])
        },
        {
          id: counselor2.userId,
          name: counselor2.name,
          email: counselor2.email,
          passwordHash: 'hash',
          role: counselor2.role,
          activeSessions: JSON.stringify([{ sessionId: `sess-${counselor2.userId}` }])
        },
        {
          id: campusAdmin.userId,
          name: campusAdmin.name,
          email: campusAdmin.email,
          passwordHash: 'hash',
          role: campusAdmin.role,
          activeSessions: JSON.stringify([{ sessionId: `sess-${campusAdmin.userId}` }])
        }
      ]
    });

    // Create counselor profiles
    await prisma.counselors.createMany({
      data: [
        {
          id: counselorProfile1Id,
          userId: counselor1.userId,
          name: counselor1.name,
          role: 'Konselor Psikolog',
          specialties: JSON.stringify(['Burnout']),
          imageUrl: 'https://example.com/c1.jpg',
          availability: JSON.stringify(['Senin', 'Rabu']),
          isVerified: true
        },
        {
          id: counselorProfile2Id,
          userId: counselor2.userId,
          name: counselor2.name,
          role: 'Konselor Sebaya',
          specialties: JSON.stringify(['Akademik']),
          imageUrl: 'https://example.com/c2.jpg',
          availability: JSON.stringify(['Selasa', 'Kamis']),
          isVerified: true
        }
      ]
    });

    // Create appointment: Student A is assigned to Counselor 1
    await prisma.appointments.create({
      data: {
        id: apptAId,
        counselorId: counselorProfile1Id,
        counselorName: counselor1.name,
        scheduledAt: new Date(Date.now() - 5 * 60_000),
        mode: 'video_call',
        notes: 'Sesi Konseling Alice dengan Konselor 1',
        status: 'CONFIRMED',
        approvalStatus: 'APPROVED',
        attendanceStatus: 'SCHEDULED',
        meetingLink: 'https://meet.ruangtenang.id/room-a',
        userId: studentA.userId,
        studentName: studentA.name,
        studentEmail: studentA.email
      }
    });

    // Create appointment: Student B is assigned to Counselor 2
    await prisma.appointments.create({
      data: {
        id: apptBId,
        counselorId: counselorProfile2Id,
        counselorName: counselor2.name,
        scheduledAt: new Date('2026-10-16T10:00:00+07:00'),
        mode: 'video_call',
        notes: 'Sesi Konseling Bob dengan Konselor 2',
        status: 'CONFIRMED',
        approvalStatus: 'APPROVED',
        attendanceStatus: 'SCHEDULED',
        meetingLink: 'https://meet.ruangtenang.id/room-b',
        userId: studentB.userId,
        studentName: studentB.name,
        studentEmail: studentB.email
      }
    });

    // Create screening for Student A
    await prisma.screenings.create({
      data: {
        id: 'scr-sso-test-a',
        userId: studentA.userId,
        phq9Score: 18,
        gad7Score: 14,
        phq9Severity: 'Sedang',
        gad7Severity: 'Sedang',
        item9Score: 0,
        hasSelfHarmRisk: false,
        riskLevel: 'Sedang',
        status: 'Menunggu Penanganan',
        timestamp: new Date().toISOString()
      }
    });

    // Create consent for Student A
    await prisma.userConsents.create({
      data: {
        userId: studentA.userId,
        consentForCounselorSharing: true,
        consentForCounselorSummary: true
      }
    });
  });

  afterAll(async () => {
    await prisma.clinicalSoapNotes.deleteMany({
      where: {
        OR: [
          { studentUserId: { in: [studentA.userId, studentB.userId] } },
          { counselorUserId: { in: [counselor1.userId, counselor2.userId] } }
        ]
      }
    });
    await prisma.appointments.deleteMany({
      where: {
        OR: [
          { id: { in: [apptAId, apptBId] } },
          { userId: { in: [studentA.userId, studentB.userId] } }
        ]
      }
    });
    await prisma.screenings.deleteMany({
      where: { userId: { in: [studentA.userId, studentB.userId] } }
    });
    await prisma.userConsents.deleteMany({
      where: { userId: { in: [studentA.userId, studentB.userId] } }
    });
    await prisma.counselors.deleteMany({
      where: { id: { in: [counselorProfile1Id, counselorProfile2Id] } }
    });
    await prisma.users.deleteMany({
      where: {
        id: { in: [studentA.userId, studentB.userId, counselor1.userId, counselor2.userId, campusAdmin.userId] }
      }
    });
  });

  // ==========================================
  // 1. CAMPUS SSO & PRIVILEGE ESCALATION TESTS
  // ==========================================
  describe('1. Campus SSO & Privilege Escalation Hardening', () => {
    it('should reject domain injection attacks like attacker@ui.ac.id.evil.com', async () => {
      const res = await request(app)
        .post('/api/v1/auth/sso/campus-login')
        .send({
          email: 'attacker@ui.ac.id.evil.com',
          name: 'Attacker'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('resmi institusi kampus');
    });

    it('should NOT escalate role when roleHint=admin or roleHint=CAMPUS_ADMIN is passed', async () => {
      const testEmail = 'attacker.admin.test@ui.ac.id';
      await prisma.users.deleteMany({ where: { email: testEmail } });

      const res = await request(app)
        .post('/api/v1/auth/sso/campus-login')
        .send({
          email: testEmail,
          name: 'Fake Admin Attempt',
          roleHint: 'admin'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('mahasiswa');
      expect(res.body.user.role).not.toBe('admin');

      // Verify in DB that the role is strictly 'mahasiswa'
      const createdUser = await prisma.users.findUnique({ where: { email: testEmail } });
      expect(createdUser?.role).toBe('mahasiswa');

      await prisma.users.deleteMany({ where: { email: testEmail } });
    });

    it('should NOT escalate role when email contains "admin" or "rektorat"', async () => {
      const testEmail = 'rektorat.administrator@ugm.ac.id';
      await prisma.users.deleteMany({ where: { email: testEmail } });

      const res = await request(app)
        .post('/api/v1/auth/sso/campus-login')
        .send({
          email: testEmail,
          name: 'Rektorat Officer'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('mahasiswa');
      expect(res.body.user.role).not.toBe('admin');

      await prisma.users.deleteMany({ where: { email: testEmail } });
    });

    it('should NOT escalate role when roleHint=konselor or email contains "konselor"', async () => {
      const testEmail = 'konselor.fake@itb.ac.id';
      await prisma.users.deleteMany({ where: { email: testEmail } });

      const res = await request(app)
        .post('/api/v1/auth/sso/campus-login')
        .send({
          email: testEmail,
          name: 'Fake Counselor Attempt',
          roleHint: 'LICENSED_PSYCHOLOGIST'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('mahasiswa');
      expect(res.body.user.role).not.toBe('konselor');

      await prisma.users.deleteMany({ where: { email: testEmail } });
    });
  });

  // ==========================================
  // 2. APPOINTMENT IDOR & ROOM ACCESS TESTS
  // ==========================================
  describe('2. Appointment IDOR & Room Authorization Hardening', () => {
    it('should prevent Student B from viewing Student A appointment (IDOR check)', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${apptAId}`)
        .set('Authorization', `Bearer ${tokenStudentB}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ACCESS_DENIED');
    });

    it('should prevent Student B from updating Student A appointment (IDOR check)', async () => {
      const res = await request(app)
        .put(`/api/v1/appointments/${apptAId}`)
        .set('Authorization', `Bearer ${tokenStudentB}`)
        .send({ notes: 'Hacked notes by Bob' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ACCESS_DENIED');
    });

    it('should prevent unassigned Counselor 2 from accessing Counselor 1 appointment', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${apptAId}`)
        .set('Authorization', `Bearer ${tokenCounselor2}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ACCESS_DENIED');
    });

    it('should allow assigned Counselor 1 to access their assigned appointment', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${apptAId}`)
        .set('Authorization', `Bearer ${tokenCounselor1}`);

      expect(res.status).toBe(200);
      expect(res.body.record.id).toBe(apptAId);
    });

    it('should block unauthorized user from accessing video room presence (IDOR check)', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${apptAId}/room-presence`)
        .set('Authorization', `Bearer ${tokenStudentB}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ACCESS_DENIED');
    });

    it('should block unauthorized user from updating video room presence', async () => {
      const res = await request(app)
        .post(`/api/v1/appointments/${apptAId}/room-presence`)
        .set('Authorization', `Bearer ${tokenStudentB}`)
        .send({ isScreenSharing: true });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ACCESS_DENIED');
    });

    it('should block unauthorized user from reading in-call notes (IDOR check)', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${apptAId}/in-call-notes`)
        .set('Authorization', `Bearer ${tokenStudentB}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ACCESS_DENIED');
    });

    it('should block unauthorized user from writing in-call notes', async () => {
      const res = await request(app)
        .post(`/api/v1/appointments/${apptAId}/in-call-notes`)
        .set('Authorization', `Bearer ${tokenStudentB}`)
        .send({ sharedContent: 'Unauthorized injection notes' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ACCESS_DENIED');
    });

    it('should allow assigned participants (Student A and Counselor 1) to access room presence and in-call notes', async () => {
      const resStudent = await request(app)
        .get(`/api/v1/appointments/${apptAId}/room-presence`)
        .set('Authorization', `Bearer ${tokenStudentA}`);

      expect(resStudent.status).toBe(200);
      expect(resStudent.body.success).toBe(true);

      const resNotes = await request(app)
        .post(`/api/v1/appointments/${apptAId}/in-call-notes`)
        .set('Authorization', `Bearer ${tokenCounselor1}`)
        .send({ sharedContent: 'Catatan sesi resmi konseling' });

      expect(resNotes.status).toBe(200);
      expect(resNotes.body.success).toBe(true);
    });
  });

  // ==========================================
  // 3. COUNSELOR SOAP NOTES AUTHORIZATION TESTS
  // ==========================================
  describe('3. Counselor SOAP Notes Authorization & Assignment Verification', () => {
    it('should reject student attempt to access SOAP notes endpoint (Role Check)', async () => {
      const res = await request(app)
        .get('/api/v1/counselor-portal/soap-notes')
        .set('Authorization', `Bearer ${tokenStudentA}`);

      expect(res.status).toBe(403);
    });

    it('should prevent Counselor 2 from creating SOAP note for unassigned Student A (Assignment Check)', async () => {
      const res = await request(app)
        .post('/api/v1/counselor-portal/soap-notes')
        .set('Authorization', `Bearer ${tokenCounselor2}`)
        .send({
          studentUserId: studentA.userId,
          subjective: 'Mahasiswa merasa cemas dengan skripsi',
          objective: 'Afek cemas, kontak mata baik',
          assessment: 'Kecemasan akademik ringan',
          plan: 'Latihan teknik pernapasan 4-7-8'
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Data tidak ditemukan atau akses tidak tersedia.');
    });

    it('should allow assigned Counselor 1 to create SOAP note for assigned Student A', async () => {
      const res = await request(app)
        .post('/api/v1/counselor-portal/soap-notes')
        .set('Authorization', `Bearer ${tokenCounselor1}`)
        .send({
          appointmentId: apptAId,
          studentUserId: studentA.userId,
          subjective: 'Mahasiswa merasa cemas dengan beban skripsi',
          objective: 'Afek cemas, kontak mata baik',
          assessment: 'Kecemasan akademik sedang',
          plan: 'Latihan teknik pernapasan 4-7-8 dan restrukturisasi kognitif'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.studentUserId).toBe(studentA.userId);
    });

    it('should prevent Counselor 2 from editing SOAP note created by Counselor 1', async () => {
      // Find the note created by Counselor 1
      const existingNote = await prisma.clinicalSoapNotes.findFirst({
        where: { studentUserId: studentA.userId }
      });
      expect(existingNote).toBeDefined();

      const res = await request(app)
        .post('/api/v1/counselor-portal/soap-notes')
        .set('Authorization', `Bearer ${tokenCounselor2}`)
        .send({
          id: existingNote!.id,
          studentUserId: studentA.userId,
          subjective: 'Attempted overwrite by Counselor 2',
          objective: 'Objective',
          assessment: 'Assessment',
          plan: 'Plan'
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Data tidak ditemukan atau akses tidak tersedia.');
    });
  });

  // ==========================================
  // 4. SCREENING AUTHORIZATION & CONSENT TESTS
  // ==========================================
  describe('4. Health Data & Screening Authorization Hardening', () => {
    it('should prevent Student B from querying Student A screening data (IDOR check)', async () => {
      const res = await request(app)
        .get(`/api/v1/screenings?userId=${studentA.userId}`)
        .set('Authorization', `Bearer ${tokenStudentB}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('CONSENT_DENIED');
    });

    it('should prevent Counselor from accessing screening of student without explicit consent', async () => {
      // Ensure Student A has NO consent set
      await prisma.userConsents.deleteMany({ where: { userId: studentA.userId } });

      const res = await request(app)
        .get(`/api/v1/screenings?userId=${studentA.userId}`)
        .set('Authorization', `Bearer ${tokenCounselor1}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('CONSENT_DENIED');
    });

    it('should allow Counselor to view screening if student granted sharing consent and has assignment', async () => {
      // Set consent for Student A
      await prisma.userConsents.upsert({
        where: { userId: studentA.userId },
        create: {
          userId: studentA.userId,
          consentForCounselorSharing: true
        },
        update: {
          consentForCounselorSharing: true
        }
      });

      const res = await request(app)
        .get(`/api/v1/screenings?userId=${studentA.userId}`)
        .set('Authorization', `Bearer ${tokenCounselor1}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
