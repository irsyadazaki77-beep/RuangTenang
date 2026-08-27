import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prisma, serverDb } from '../database.js';
import screeningRouter from '../routes/screening.js';
import { consentService } from '../services/consentService.js';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-ruangtenang';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/screenings', screeningRouter);

const generateToken = (user: any) => jwt.sign(user, JWT_SECRET);

describe('Screening Authorization Security Tests', () => {
  const m1Token = generateToken({ userId: 'student-1', name: 'Mahasiswa 1', role: 'mahasiswa', email: 'm1@test.com' });
  const m2Token = generateToken({ userId: 'student-2', name: 'Mahasiswa 2', role: 'mahasiswa', email: 'm2@test.com' });
  const c1Token = generateToken({ userId: 'counselor-1', name: 'Konselor 1', role: 'konselor', email: 'c1@test.com' });
  const adminToken = generateToken({ userId: 'admin-1', name: 'Admin 1', role: 'admin', email: 'a1@test.com' });

  beforeAll(async () => {
    vi.spyOn(serverDb, 'isSessionActive').mockResolvedValue(true);
    await prisma.appointments.deleteMany({ where: { id: { in: ['apt-test-auth-1'] } } });
    await prisma.counselors.deleteMany({ where: { id: { in: ['c-profile-1'] } } });
    await prisma.screenings.deleteMany({ where: { id: { in: ['scr-1', 'scr-2'] } } });
    await prisma.users.deleteMany({ where: { id: { in: ['student-1', 'student-2', 'counselor-1', 'admin-1'] } } });
    await prisma.userConsents.deleteMany({ where: { userId: { in: ['student-1', 'student-2'] } } });

    // Seed test data
    await prisma.users.createMany({
      data: [
        { id: 'student-1', name: 'M1', email: 'm1@test.com', passwordHash: 'hash', role: 'mahasiswa' },
        { id: 'student-2', name: 'M2', email: 'm2@test.com', passwordHash: 'hash', role: 'mahasiswa' },
        { id: 'counselor-1', name: 'C1', email: 'c1@test.com', passwordHash: 'hash', role: 'konselor' },
        { id: 'admin-1', name: 'A1', email: 'a1@test.com', passwordHash: 'hash', role: 'admin' },
      ]
    });

    await prisma.counselors.create({
      data: {
        id: 'c-profile-1',
        userId: 'counselor-1',
        name: 'Konselor 1',
        role: 'konselor',
        university: 'UI',
        specialties: JSON.stringify(['Stress']),
        imageUrl: '/images/c1.jpg',
        availability: JSON.stringify(['Senin']),
        contactWhatsapp: '08123456789'
      }
    });

    await prisma.appointments.create({
      data: {
        id: 'apt-test-auth-1',
        counselorId: 'c-profile-1',
        counselorName: 'Konselor 1',
        userId: 'student-1',
        studentName: 'M1',
        date: '2026-03-01',
        time: '10:00',
        status: 'CONFIRMED',
        approvalStatus: 'APPROVED',
        attendanceStatus: 'SCHEDULED'
      }
    });

    await prisma.screenings.createMany({
      data: [
        { id: 'scr-1', userId: 'student-1', phq9Score: 10, gad7Score: 10, phq9Severity: 'Sedang', gad7Severity: 'Sedang' },
        { id: 'scr-2', userId: 'student-2', phq9Score: 5, gad7Score: 5, phq9Severity: 'Ringan', gad7Severity: 'Ringan' },
      ]
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await prisma.appointments.deleteMany({ where: { id: { in: ['apt-test-auth-1'] } } });
    await prisma.counselors.deleteMany({ where: { id: { in: ['c-profile-1'] } } });
    await prisma.screenings.deleteMany({ where: { id: { in: ['scr-1', 'scr-2'] } } });
    await prisma.users.deleteMany({ where: { id: { in: ['student-1', 'student-2', 'counselor-1', 'admin-1'] } } });
    await prisma.userConsents.deleteMany({ where: { userId: { in: ['student-1', 'student-2'] } } });
  });

  it('Denies unauthenticated user', async () => {
    const res = await request(app).get('/api/screenings');
    expect(res.status).toBe(401);
  });

  it('Allows mahasiswa to see their own screening', async () => {
    const res = await request(app).get('/api/screenings').set('Authorization', `Bearer ${m1Token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].userId).toBe('student-1');
  });

  it('Denies mahasiswa from seeing other mahasiswa screening', async () => {
    const res = await request(app).get('/api/screenings?userId=student-2').set('Authorization', `Bearer ${m1Token}`);
    expect(res.status).toBe(403);
  });

  it('Denies counselor trying to fetch all data without targetUserId', async () => {
    const res = await request(app).get('/api/screenings').set('Authorization', `Bearer ${c1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Konselor tidak diizinkan mengambil seluruh data/);
  });

  it('Denies counselor from fetching student data without consent', async () => {
    await consentService.updateConsents('student-1', { consentForCounselorSharing: false });
    const res = await request(app).get('/api/screenings?userId=student-1').set('Authorization', `Bearer ${c1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Akses ditolak atau mahasiswa tidak memberikan izin/);
  });

  it('Allows counselor to fetch student data with consent', async () => {
    await consentService.updateConsents('student-1', { consentForCounselorSharing: true });
    const res = await request(app).get('/api/screenings?userId=student-1').set('Authorization', `Bearer ${c1Token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].userId).toBe('student-1');
  });

  it('Allows admin to fetch all data', async () => {
    const res = await request(app).get('/api/screenings').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});
