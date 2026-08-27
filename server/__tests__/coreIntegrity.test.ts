import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { prisma, serverDb } from '../database.js';
import { redisService } from '../services/redisService.js';
import appointmentsRouter from '../routes/appointments.js';
import counselorsRouter from '../routes/counselors.js';
import userDataRouter from '../routes/userData.js';
import emergencyRouter from '../routes/emergency.js';
import usabilityRouter from '../routes/usability.js';
import screeningRouter from '../routes/screening.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-ruangtenang';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/appointments', appointmentsRouter);
app.use('/api/counselors', counselorsRouter);
app.use('/api/user-data', userDataRouter);
app.use('/api/emergency', emergencyRouter);
app.use('/api/usability', usabilityRouter);
app.use('/api/screenings', screeningRouter);

const generateToken = (user: any) => jwt.sign(user, JWT_SECRET);

describe('Core Feature Integrity Integration Tests (FASE 8)', () => {
  const student1 = { userId: 'usr-student-integ-1', name: 'Budi Santoso', email: 'budi.integ@univ.ac.id', role: 'mahasiswa' };
  const student2 = { userId: 'usr-student-integ-2', name: 'Siti Rahma', email: 'siti.integ@univ.ac.id', role: 'mahasiswa' };
  const counselor1 = { userId: 'usr-counselor-integ-1', name: 'Dr. Anita Rahmawati, M.Psi., Psikolog', email: 'anita.integ@univ.ac.id', role: 'konselor' };
  const counselor2 = { userId: 'usr-counselor-integ-2', name: 'Dimas Satria, S.Psi., M.A.', email: 'dimas.integ@univ.ac.id', role: 'konselor' };
  const adminUser = { userId: 'usr-admin-integ-1', name: 'Administrator BK', email: 'admin.integ@univ.ac.id', role: 'admin' };

  const student1Token = generateToken(student1);
  const student2Token = generateToken(student2);
  const counselor1Token = generateToken(counselor1);
  const counselor2Token = generateToken(counselor2);
  const adminToken = generateToken(adminUser);

  beforeAll(async () => {
    vi.spyOn(serverDb, 'isSessionActive').mockResolvedValue(true);

    // Clean up test records
    await prisma.appointments.deleteMany({
      where: {
        userId: { in: [student1.userId, student2.userId] }
      }
    });
    await prisma.moodLogs.deleteMany({
      where: {
        userId: { in: [student1.userId, student2.userId] }
      }
    });
    await prisma.emergencyContacts.deleteMany({
      where: {
        userId: { in: [student1.userId, student2.userId] }
      }
    });
    await prisma.counselors.deleteMany({
      where: {
        id: { in: ['c-integ-1', 'c-integ-2'] }
      }
    });
    await prisma.users.deleteMany({
      where: {
        id: { in: [student1.userId, student2.userId, counselor1.userId, counselor2.userId, adminUser.userId] }
      }
    });

    // Seed users
    await prisma.users.createMany({
      data: [
        { id: student1.userId, name: student1.name, email: student1.email, passwordHash: 'hash', role: 'mahasiswa', tier: 'Free' },
        { id: student2.userId, name: student2.name, email: student2.email, passwordHash: 'hash', role: 'mahasiswa', tier: 'Free' },
        { id: counselor1.userId, name: counselor1.name, email: counselor1.email, passwordHash: 'hash', role: 'konselor', tier: 'Pro' },
        { id: counselor2.userId, name: counselor2.name, email: counselor2.email, passwordHash: 'hash', role: 'konselor', tier: 'Pro' },
        { id: adminUser.userId, name: adminUser.name, email: adminUser.email, passwordHash: 'hash', role: 'admin', tier: 'Developer' },
      ]
    });

    // Seed counselors
    await prisma.counselors.createMany({
      data: [
        {
          id: 'c-integ-1',
          name: 'Dr. Anita Rahmawati, M.Psi., Psikolog',
          role: 'Psikolog Klinis Kampus',
          university: 'Universitas Indonesia',
          specialties: JSON.stringify(['Akademik & Skripsi', 'Burnout']),
          imageUrl: 'https://example.com/c1.jpg',
          availability: JSON.stringify(['Senin', 'Rabu']),
          rating: 4.9,
          sessionCount: 120,
          licenseNumber: 'SIPP: 19840212-201501-2-001',
          isVerified: true,
          userId: counselor1.userId
        },
        {
          id: 'c-integ-2',
          name: 'Dimas Satria, S.Psi., M.A.',
          role: 'Konselor Mahasiswa',
          university: 'ITB',
          specialties: JSON.stringify(['Manajemen Stres']),
          imageUrl: 'https://example.com/c2.jpg',
          availability: JSON.stringify(['Selasa', 'Kamis']),
          rating: 4.8,
          sessionCount: 80,
          licenseNumber: 'HIMPSI: 2018-0912-JAWA-BARAT',
          isVerified: true,
          userId: counselor2.userId
        }
      ]
    });
  });

  beforeEach(async () => {
    await redisService.flush();
    await prisma.distributedState.deleteMany({});
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await prisma.appointments.deleteMany({
      where: {
        userId: { in: [student1.userId, student2.userId] }
      }
    });
    await prisma.moodLogs.deleteMany({
      where: {
        userId: { in: [student1.userId, student2.userId] }
      }
    });
    await prisma.emergencyContacts.deleteMany({
      where: {
        userId: { in: [student1.userId, student2.userId] }
      }
    });
    await prisma.counselors.deleteMany({
      where: {
        id: { in: ['c-integ-1', 'c-integ-2'] }
      }
    });
    await prisma.users.deleteMany({
      where: {
        id: { in: [student1.userId, student2.userId, counselor1.userId, counselor2.userId, adminUser.userId] }
      }
    });
  });

  describe('1. Counselor Directory & Verification', () => {
    it('returns verified counselors with authoritative license data from DB', async () => {
      const res = await request(app).get('/api/counselors');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const c1 = res.body.find((c: any) => c.id === 'c-integ-1');
      expect(c1).toBeDefined();
      expect(c1.licenseNumber).toBe('SIPP: 19840212-201501-2-001');
      expect(c1.name).toContain('Anita Rahmawati');
    });
  });

  describe('2. Appointment Booking & Double-Booking Prevention', () => {
    let createdApptId: string;

    it('successfully books an appointment for student 1', async () => {
      const bookingData = {
        counselorId: 'c-integ-1',
        counselorName: 'Dr. Anita Rahmawati, M.Psi., Psikolog',
        date: '2026-09-10',
        time: '10:00',
        mode: 'video_call' as const,
        notes: 'Konsultasi krisis skripsi dan burnout'
      };

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${student1Token}`)
        .send(bookingData);

      expect(res.status).toBe(200);
      expect(res.body.record).toBeDefined();
      expect(res.body.record.counselorName).toContain('Anita Rahmawati');
      createdApptId = res.body.record.id;
    });

    it('rejects double-booking at the exact same counselor slot', async () => {
      const conflictBooking = {
        counselorId: 'c-integ-1',
        counselorName: 'Dr. Anita Rahmawati, M.Psi., Psikolog',
        date: '2026-09-10',
        time: '10:00',
        mode: 'video_call' as const,
        notes: 'Ingin booking di jam yang sama'
      };

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${student2Token}`)
        .send(conflictBooking);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('bentrok');
    });

    it('enforces counselor permissions (counselor 2 cannot view or edit appointment of counselor 1)', async () => {
      // Counselor 2 fetching appointment list
      const resList = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${counselor2Token}`);

      expect(resList.status).toBe(200);
      const hasC1Appt = resList.body.some((a: any) => a.id === createdApptId);
      expect(hasC1Appt).toBe(false);

      // Counselor 2 trying to confirm appointment of counselor 1
      const resUpdate = await request(app)
        .put(`/api/appointments/${createdApptId}`)
        .set('Authorization', `Bearer ${counselor2Token}`)
        .send({ status: 'CONFIRMED' });

      expect(resUpdate.status).toBe(403);
    });

    it('allows assigned counselor 1 to update status: requested -> confirmed -> completed', async () => {
      // Confirm
      const resConfirm = await request(app)
        .put(`/api/appointments/${createdApptId}`)
        .set('Authorization', `Bearer ${counselor1Token}`)
        .send({ status: 'CONFIRMED' });

      expect(resConfirm.status).toBe(200);
      expect(resConfirm.body.record.status).toBe('CONFIRMED');

      // Complete
      const resComplete = await request(app)
        .put(`/api/appointments/${createdApptId}`)
        .set('Authorization', `Bearer ${counselor1Token}`)
        .send({ status: 'Selesai' });

      expect(resComplete.status).toBe(200);
      expect(resComplete.body.record.status).toBe('Selesai');
    });
  });

  describe('3. Mood Logs CRUD Integrity', () => {
    let createdMoodId: string;

    it('creates encrypted mood log for student', async () => {
      const res = await request(app)
        .post('/api/user-data/mood')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          mood: 4,
          notes: 'Merasa lebih tenang setelah bimbingan skripsi',
          intensity: 8,
          factors: ['Skripsi', 'Kesehatan']
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.log.notes).toBe('Merasa lebih tenang setelah bimbingan skripsi');
      createdMoodId = res.body.log.id;
    });

    it('reads decrypted mood logs for student', async () => {
      const res = await request(app)
        .get('/api/user-data/mood')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((m: any) => m.id === createdMoodId);
      expect(found).toBeDefined();
      expect(found.notes).toBe('Merasa lebih tenang setelah bimbingan skripsi');
    });

    it('updates existing mood log', async () => {
      const res = await request(app)
        .put(`/api/user-data/mood/${createdMoodId}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          notes: 'Catatan diperbarui dengan lebih banyak rasa syukur'
        });

      expect(res.status).toBe(200);
      expect(res.body.log.notes).toBe('Catatan diperbarui dengan lebih banyak rasa syukur');
    });

    it('denies student 2 from deleting student 1 mood log', async () => {
      const res = await request(app)
        .delete(`/api/user-data/mood/${createdMoodId}`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(403);
    });

    it('allows student 1 to delete their own mood log', async () => {
      const res = await request(app)
        .delete(`/api/user-data/mood/${createdMoodId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('4. Emergency SOS Gateway & Server Truth', () => {
    it('distinguishes simulated/mock gateway without claiming fake delivery', async () => {
      // Ensure student1 has emergency contact & consent setup
      const { encryptionService } = await import('../services/encryptionService.js');
      await prisma.emergencyContacts.upsert({
        where: { userId: student1.userId },
        create: {
          userId: student1.userId,
          name: encryptionService.encryptSensitive('Ayah'),
          phone: encryptionService.encryptSensitive('081234567890'),
          relationship: 'Orang Tua',
          hasConsent: true
        },
        update: {
          hasConsent: true
        }
      });
      await prisma.userConsents.upsert({
        where: { userId: student1.userId },
        create: {
          userId: student1.userId,
          consentForEmergencySOS: true
        },
        update: {
          consentForEmergencySOS: true
        }
      });

      const res = await request(app)
        .post('/api/emergency/sos/trigger')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          emergencyContact: { name: 'Ayah', phone: '081234567890' },
          hasUserConsent: true,
          studentName: 'Budi Santoso'
        });

      expect(res.status).toBe(200);
      // Response must explicitly distinguish status (SIMULATED or SENT)
      expect(['SENT', 'SIMULATED']).toContain(res.body.status);
      if (res.body.status === 'SIMULATED') {
        expect(res.body.message).toContain('Mode Simulasi');
      }
    });

    it('rejects SOS trigger if user has explicitly revoked consent on server', async () => {
      // Save contact with hasConsent = false
      await prisma.emergencyContacts.upsert({
        where: { userId: student1.userId },
        create: {
          userId: student1.userId,
          name: 'Ibu Budi',
          relationship: 'Orang Tua',
          phone: '081299999999',
          hasConsent: false
        },
        update: {
          hasConsent: false
        }
      });

      const res = await request(app)
        .post('/api/emergency/sos/trigger')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          emergencyContact: { name: 'Ibu Budi', phone: '081299999999' },
          hasUserConsent: true // Request body claims true, but server truth is false
        });

      expect(res.status).toBe(400);
      expect(res.body.hasUserConsent).toBe(false);
      expect(res.body.message).toContain('Persetujuan');
    });
  });

  describe('5. Quota & Server Truth Enforcement', () => {
    it('ignores spoofed userTier query params and derives tier strictly from server database', async () => {
      const res = await request(app)
        .get('/api/usability/user/usage-stats?userTier=Developer')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      // Student 1 has Free tier in DB, should NOT become Developer
      expect(res.body.userTier).toBe('Free');
      expect(res.body.isDeveloper).toBe(false);
      expect(res.body.dailyLimit).toBeLessThan(999999);
    });
  });
});
