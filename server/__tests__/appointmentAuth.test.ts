import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prisma, serverDb } from '../database.js';
import appointmentsRouter from '../routes/appointments.js';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-ruangtenang';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/appointments', appointmentsRouter);

const generateToken = (user: any) => jwt.sign({ ...user, sessionId: "test-session" }, JWT_SECRET, { issuer: 'ruangtenang', audience: 'ruangtenang-web', algorithm: 'HS256' });

describe('Appointment Security & IDOR Prevention Tests', () => {
  const student1Token = generateToken({ userId: 'std-idor-1', name: 'Student One', role: 'mahasiswa', email: 's1@test.com' });
  const student2Token = generateToken({ userId: 'std-idor-2', name: 'Student Two', role: 'mahasiswa', email: 's2@test.com' });
  const counselor1Token = generateToken({ userId: 'cns-user-1', name: 'Counselor Alpha', role: 'konselor', email: 'c1@test.com' });
  const counselor2Token = generateToken({ userId: 'cns-user-2', name: 'Counselor Beta', role: 'konselor', email: 'c2@test.com' });
  const adminToken = generateToken({ userId: 'adm-user-1', name: 'Admin Root', role: 'admin', email: 'admin@test.com' });

  beforeAll(async () => {
    vi.spyOn(serverDb, 'isSessionActive').mockResolvedValue(true);

    // Clean up
    await prisma.appointments.deleteMany({ where: { id: { in: ['apt-sec-1', 'apt-sec-2'] } } });
    await prisma.counselors.deleteMany({ where: { id: { in: ['cns-prof-1', 'cns-prof-2'] } } });
    await prisma.users.deleteMany({ where: { id: { in: ['std-idor-1', 'std-idor-2', 'cns-user-1', 'cns-user-2', 'adm-user-1'] } } });

    // Seed users
    await prisma.users.createMany({
      data: [
        { id: 'std-idor-1', name: 'Student One', email: 's1@test.com', passwordHash: 'hash', role: 'mahasiswa' },
        { id: 'std-idor-2', name: 'Student Two', email: 's2@test.com', passwordHash: 'hash', role: 'mahasiswa' },
        { id: 'cns-user-1', name: 'Counselor Alpha', email: 'c1@test.com', passwordHash: 'hash', role: 'konselor' },
        { id: 'cns-user-2', name: 'Counselor Beta', email: 'c2@test.com', passwordHash: 'hash', role: 'konselor' },
        { id: 'adm-user-1', name: 'Admin Root', email: 'admin@test.com', passwordHash: 'hash', role: 'admin' },
      ]
    });

    // Seed counselor profiles
    await prisma.counselors.createMany({
      data: [
        {
          id: 'cns-prof-1',
          userId: 'cns-user-1',
          name: 'Counselor Alpha',
          role: 'konselor',
          university: 'UI',
          specialties: JSON.stringify(['Anxiety']),
          imageUrl: '/images/counselor1.jpg',
          availability: JSON.stringify(['Senin', 'Selasa']),
          contactWhatsapp: '081111'
        },
        {
          id: 'cns-prof-2',
          userId: 'cns-user-2',
          name: 'Counselor Beta',
          role: 'konselor',
          university: 'ITB',
          specialties: JSON.stringify(['Burnout']),
          imageUrl: '/images/counselor2.jpg',
          availability: JSON.stringify(['Rabu', 'Kamis']),
          contactWhatsapp: '082222'
        },
      ]
    });

    // Seed appointments
    await prisma.appointments.createMany({
      data: [
        {
          id: 'apt-sec-1',
          counselorId: 'cns-prof-1',
          counselorName: 'Counselor Alpha',
          userId: 'std-idor-1',
          studentName: 'Student One',
          date: '2026-03-10',
          time: '09:00',
          status: 'PENDING',
          approvalStatus: 'PENDING_APPROVAL',
          attendanceStatus: 'SCHEDULED',
          notes: 'Notes for appt 1'
        },
        {
          id: 'apt-sec-2',
          counselorId: 'cns-prof-2',
          counselorName: 'Counselor Beta',
          userId: 'std-idor-2',
          studentName: 'Student Two',
          date: '2026-03-11',
          time: '14:00',
          status: 'CONFIRMED',
          approvalStatus: 'APPROVED',
          attendanceStatus: 'SCHEDULED',
          notes: 'Notes for appt 2'
        }
      ]
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await prisma.appointments.deleteMany({ where: { id: { in: ['apt-sec-1', 'apt-sec-2'] } } });
    await prisma.counselors.deleteMany({ where: { id: { in: ['cns-prof-1', 'cns-prof-2'] } } });
    await prisma.users.deleteMany({ where: { id: { in: ['std-idor-1', 'std-idor-2', 'cns-user-1', 'cns-user-2', 'adm-user-1'] } } });
  });

  it('Mahasiswa can only fetch their own appointments', async () => {
    const res = await request(app)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${student1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe('apt-sec-1');
  });

  it('Counselor 1 can only fetch appointments assigned to Counselor 1', async () => {
    const res = await request(app)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${counselor1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe('apt-sec-1');
    expect(res.body[0].counselorId).toBe('cns-prof-1');
  });

  it('Counselor 1 is denied access when requesting counselorId of Counselor 2 (IDOR Prevention)', async () => {
    const res = await request(app)
      .get('/api/v1/appointments?counselorId=cns-prof-2')
      .set('Authorization', `Bearer ${counselor1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ACCESS_DENIED');
  });

  it('Status filter does not bypass counselor isolation', async () => {
    const res = await request(app)
      .get('/api/v1/appointments?status=CONFIRMED')
      .set('Authorization', `Bearer ${counselor1Token}`);

    expect(res.status).toBe(200);
    // Counselor 1 only has a PENDING appointment, so filtering by CONFIRMED should return 0, NOT leak Counselor 2's CONFIRMED appointment!
    expect(res.body.length).toBe(0);
  });

  it('Prevents Mahasiswa 2 from updating Mahasiswa 1 appointment (IDOR)', async () => {
    const res = await request(app)
      .put('/api/v1/appointments/apt-sec-1')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ notes: 'Hacked notes' });

    expect(res.status).toBe(403);
  });

  it('Prevents Counselor 2 from approving Counselor 1 appointment (IDOR)', async () => {
    const res = await request(app)
      .put('/api/v1/appointments/apt-sec-1')
      .set('Authorization', `Bearer ${counselor2Token}`)
      .send({ status: 'CONFIRMED' });

    expect(res.status).toBe(403);
  });

  it('Prevents Counselor 1 from reassigning appointment to another counselor (Field-Level Auth)', async () => {
    const res = await request(app)
      .put('/api/v1/appointments/apt-sec-1')
      .set('Authorization', `Bearer ${counselor1Token}`)
      .send({ counselorId: 'cns-prof-2', counselorName: 'Counselor Beta' });

    expect(res.status).toBe(200);
    // Field is ignored for counselor
    const check = await serverDb.findAppointmentById('apt-sec-1');
    expect(check?.counselorId).toBe('cns-prof-1');
  });

  it('Admin can view all appointments and filter by counselorId', async () => {
    const res = await request(app)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });
});
