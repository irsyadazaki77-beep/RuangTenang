import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { prisma, serverDb } from '../../database.js';
import { getJwtSecret } from '../../middleware/auth.js';
import appointmentsRouter from '../../routes/appointments.js';
import screeningRouter from '../../routes/screening.js';
import counselorPortalRouter from '../../routes/counselorPortal.js';
import { consentService } from '../../services/consentService.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/appointments', appointmentsRouter);
app.use('/api/v1/screenings', screeningRouter);
app.use('/api/v1/counselor-portal', counselorPortalRouter);

const generateUserToken = (user: { userId: string; role: string; name: string; email: string }) => {
  return jwt.sign(
    {
      userId: user.userId,
      role: user.role,
      name: user.name,
      email: user.email,
      sessionId: `sess-${user.userId}`
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

describe('FASE 2: Health Data & SOAP Authorization Security Tests', () => {
  const counselorAUser = { userId: 'couns-a-usr', name: 'Konselor A', role: 'konselor', email: 'counselora@ui.ac.id' };
  const counselorBUser = { userId: 'couns-b-usr', name: 'Konselor B', role: 'konselor', email: 'counselorb@ui.ac.id' };
  const studentAUser = { userId: 'student-a-usr', name: 'Student A', role: 'mahasiswa', email: 'studenta@ui.ac.id' };
  const studentBUser = { userId: 'student-b-usr', name: 'Student B', role: 'mahasiswa', email: 'studentb@ui.ac.id' };
  const adminUser = { userId: 'admin-usr-1', name: 'Admin One', role: 'admin', email: 'admin@ui.ac.id' };

  let tokenCounselorA: string;
  let tokenCounselorB: string;
  let tokenStudentA: string;
  let tokenStudentB: string;
  let tokenAdmin: string;

  const apptAId = 'appt-f2-a';
  const apptBId = 'appt-f2-b';
  const counselorAProfileId = 'c-profile-f2-a';
  const counselorBProfileId = 'c-profile-f2-b';

  beforeAll(async () => {
    vi.spyOn(serverDb, 'isSessionActive').mockResolvedValue(true);

    tokenCounselorA = generateUserToken(counselorAUser);
    tokenCounselorB = generateUserToken(counselorBUser);
    tokenStudentA = generateUserToken(studentAUser);
    tokenStudentB = generateUserToken(studentBUser);
    tokenAdmin = generateUserToken(adminUser);

    // Clean test data
    await prisma.clinicalSoapNotes.deleteMany({
      where: { studentUserId: { in: [studentAUser.userId, studentBUser.userId] } }
    });
    await prisma.appointments.deleteMany({
      where: { id: { in: [apptAId, apptBId] } }
    });
    await prisma.screenings.deleteMany({
      where: { userId: { in: [studentAUser.userId, studentBUser.userId] } }
    });
    await prisma.userConsents.deleteMany({
      where: { userId: { in: [studentAUser.userId, studentBUser.userId] } }
    });
    await prisma.counselors.deleteMany({
      where: { id: { in: [counselorAProfileId, counselorBProfileId] } }
    });
    await prisma.users.deleteMany({
      where: { id: { in: [counselorAUser.userId, counselorBUser.userId, studentAUser.userId, studentBUser.userId, adminUser.userId] } }
    });

    // Create Users
    await prisma.users.createMany({
      data: [
        { id: counselorAUser.userId, name: counselorAUser.name, email: counselorAUser.email, passwordHash: 'hash', role: 'konselor' },
        { id: counselorBUser.userId, name: counselorBUser.name, email: counselorBUser.email, passwordHash: 'hash', role: 'konselor' },
        { id: studentAUser.userId, name: studentAUser.name, email: studentAUser.email, passwordHash: 'hash', role: 'mahasiswa' },
        { id: studentBUser.userId, name: studentBUser.name, email: studentBUser.email, passwordHash: 'hash', role: 'mahasiswa' },
        { id: adminUser.userId, name: adminUser.name, email: adminUser.email, passwordHash: 'hash', role: 'admin' },
      ]
    });

    // Create Counselor Profiles
    await prisma.counselors.createMany({
      data: [
        {
          id: counselorAProfileId,
          userId: counselorAUser.userId,
          name: counselorAUser.name,
          role: 'Konselor Psikolog',
          specialties: JSON.stringify(['Stress']),
          imageUrl: '/img/c1.jpg',
          availability: JSON.stringify(['Senin'])
        },
        {
          id: counselorBProfileId,
          userId: counselorBUser.userId,
          name: counselorBUser.name,
          role: 'Konselor Psikolog',
          specialties: JSON.stringify(['Depresi']),
          imageUrl: '/img/c2.jpg',
          availability: JSON.stringify(['Selasa'])
        }
      ]
    });

    // Counselor A assigned to Student A
    await prisma.appointments.create({
      data: {
        id: apptAId,
        counselorId: counselorAProfileId,
        counselorName: counselorAUser.name,
        userId: studentAUser.userId,
        studentName: studentAUser.name,
        scheduledAt: new Date(),
        status: 'CONFIRMED',
        approvalStatus: 'APPROVED',
        attendanceStatus: 'SCHEDULED'
      }
    });

    // Counselor B assigned to Student B
    await prisma.appointments.create({
      data: {
        id: apptBId,
        counselorId: counselorBProfileId,
        counselorName: counselorBUser.name,
        userId: studentBUser.userId,
        studentName: studentBUser.name,
        scheduledAt: new Date(),
        status: 'CONFIRMED',
        approvalStatus: 'APPROVED',
        attendanceStatus: 'SCHEDULED'
      }
    });

    // Seed Screenings
    await prisma.screenings.createMany({
      data: [
        { id: 'scr-f2-a', userId: studentAUser.userId, phq9Score: 12, gad7Score: 10, phq9Severity: 'Sedang', gad7Severity: 'Sedang' },
        { id: 'scr-f2-b', userId: studentBUser.userId, phq9Score: 15, gad7Score: 14, phq9Severity: 'Sedang-Berat', gad7Severity: 'Sedang' }
      ]
    });

    // Consent: Student A grants consent, Student B does not (default deny)
    await consentService.updateConsents(studentAUser.userId, {
      consentForCounselorSharing: true,
      consentForCounselorSummary: true
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await prisma.clinicalSoapNotes.deleteMany({
      where: { studentUserId: { in: [studentAUser.userId, studentBUser.userId] } }
    });
    await prisma.appointments.deleteMany({
      where: { id: { in: [apptAId, apptBId] } }
    });
    await prisma.screenings.deleteMany({
      where: { userId: { in: [studentAUser.userId, studentBUser.userId] } }
    });
    await prisma.userConsents.deleteMany({
      where: { userId: { in: [studentAUser.userId, studentBUser.userId] } }
    });
    await prisma.counselors.deleteMany({
      where: { id: { in: [counselorAProfileId, counselorBProfileId] } }
    });
    await prisma.users.deleteMany({
      where: { id: { in: [counselorAUser.userId, counselorBUser.userId, studentAUser.userId, studentBUser.userId, adminUser.userId] } }
    });
  });

  it('1. Counselor A accessing Student B screening → 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/v1/screenings?userId=${studentBUser.userId}`)
      .set('Authorization', `Bearer ${tokenCounselorA}`);

    expect(res.status).toBe(403);
  });

  it('2. Counselor A creating SOAP for Student B → generic not found', async () => {
    const res = await request(app)
      .post('/api/v1/counselor-portal/soap-notes')
      .set('Authorization', `Bearer ${tokenCounselorA}`)
      .send({
        studentUserId: studentBUser.userId,
        subjective: 'Subjective text',
        objective: 'Objective text',
        assessment: 'Assessment text',
        plan: 'Plan text'
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Data tidak ditemukan atau akses tidak tersedia.');
  });

  it('3. Counselor A accessing appointment of Counselor B → 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/v1/appointments/${apptBId}`)
      .set('Authorization', `Bearer ${tokenCounselorA}`);

    expect(res.status).toBe(403);
  });

  it('4. Forged studentUserId in body for SOAP creation → 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/v1/counselor-portal/soap-notes')
      .set('Authorization', `Bearer ${tokenCounselorA}`)
      .send({
        appointmentId: apptAId,
        studentUserId: studentBUser.userId, // Forged student UserId that does not match apptAId or Counselor A assignment
        subjective: 'Forged student',
        objective: 'Obj',
        assessment: 'Ass',
        plan: 'Plan'
      });

    expect(res.status).toBe(404);
  });

  it('5. Forged counselorId parameter attempt is ignored and bound to requesting counselor', async () => {
    const res = await request(app)
      .get(`/api/v1/appointments?counselorId=${counselorBProfileId}`)
      .set('Authorization', `Bearer ${tokenCounselorA}`);

    expect(res.status).toBe(403);
  });

  it('6. Valid counselor + valid assignment + consent → 200 OK for SOAP creation and viewing', async () => {
    const postRes = await request(app)
      .post('/api/v1/counselor-portal/soap-notes')
      .set('Authorization', `Bearer ${tokenCounselorA}`)
      .send({
        appointmentId: apptAId,
        studentUserId: studentAUser.userId,
        subjective: 'Keluhan kecemasan skripsi',
        objective: 'Kontak mata baik',
        assessment: 'Kecemasan ringan',
        plan: 'Relaksasi otot progresif'
      });

    expect(postRes.status).toBe(201);
    expect(postRes.body.success).toBe(true);

    const getRes = await request(app)
      .get(`/api/v1/counselor-portal/soap-notes?studentUserId=${studentAUser.userId}`)
      .set('Authorization', `Bearer ${tokenCounselorA}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.length).toBe(1);
    expect(getRes.body.data[0].subjective).toBe('Keluhan kecemasan skripsi');
  });

  it('6a. assigned student appears in triage with truthful missing-university value', async () => {
    await prisma.users.update({
      where: { id: studentAUser.userId },
      data: { university: '' }
    });

    const res = await request(app)
      .get('/api/v1/counselor-portal/triage-queue')
      .set('Authorization', `Bearer ${tokenCounselorA}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].userId).toBe(studentAUser.userId);
    expect(res.body.data[0].university).toBe('Tidak tersedia');
  });

  it('7. Consent dicabut → akses sensitif ditolak tanpa enumerasi record', async () => {
    // Summary consent alone cannot authorize access to scores or clinical SOAP content.
    await consentService.updateConsents(studentAUser.userId, {
      consentForCounselorSharing: false,
      consentForCounselorSummary: true
    });

    const screeningRes = await request(app)
      .get(`/api/v1/screenings?userId=${studentAUser.userId}`)
      .set('Authorization', `Bearer ${tokenCounselorA}`);

    expect(screeningRes.status).toBe(403);

    const soapRes = await request(app)
      .get(`/api/v1/counselor-portal/soap-notes?studentUserId=${studentAUser.userId}`)
      .set('Authorization', `Bearer ${tokenCounselorA}`);

    expect(soapRes.status).toBe(404);

    // Full withdrawal remains default-deny as well.
    await consentService.updateConsents(studentAUser.userId, {
      consentForCounselorSharing: false,
      consentForCounselorSummary: false
    });
    const withdrawnRes = await request(app)
      .get(`/api/v1/counselor-portal/soap-notes?studentUserId=${studentAUser.userId}`)
      .set('Authorization', `Bearer ${tokenCounselorA}`);
    expect(withdrawnRes.status).toBe(404);
  });

  it('8. Admin cannot access individual screening records through the counselor flow', async () => {
    const res = await request(app)
      .get('/api/v1/screenings')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('CONSENT_DENIED');
  });
});
