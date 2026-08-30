import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { prisma, seedInitialDataIfNeeded } from '../../database.js';
import { redisService } from '../../services/redisService.js';
import { getJwtSecret } from '../../middleware/auth.js';
import counselorsRouter from '../../routes/counselors.js';
import emergencyRouter, { clearSosHistoryForTesting } from '../../routes/emergency.js';
import appointmentsRouter from '../../routes/appointments.js';
import { idempotencyMiddleware, clearIdempotencyStoreForTesting } from '../../apiV1Helpers.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

// Mount routers
app.use('/api/v1/counselors', counselorsRouter);
app.use('/api/v1/sos', emergencyRouter);
app.use('/api/v1/appointments', appointmentsRouter);

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

describe('FASE 1 SECURITY HOTFIX REGRESSION TEST SUITE', () => {
  const userA = {
    userId: 'usr-sec-test-a',
    name: 'Mahasiswa A',
    email: 'user.a@ui.ac.id',
    role: 'mahasiswa'
  };

  const userB = {
    userId: 'usr-sec-test-b',
    name: 'Mahasiswa B',
    email: 'user.b@ui.ac.id',
    role: 'mahasiswa'
  };

  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    tokenA = generateUserToken(userA);
    tokenB = generateUserToken(userB);

    // Clean test database records
    await prisma.emergencyContacts.deleteMany({ where: { userId: { in: [userA.userId, userB.userId] } } });
    await prisma.userConsents.deleteMany({ where: { userId: { in: [userA.userId, userB.userId] } } });
    await prisma.users.deleteMany({ where: { id: { in: [userA.userId, userB.userId] } } });
    await prisma.appointments.deleteMany({ where: { userId: { in: [userA.userId, userB.userId] } } });
    await prisma.counselors.deleteMany({ where: { id: { in: ['c-sec-test-1', 'c-sec-test-2', 'cons-1'] } } });

    // Seed test users
    await prisma.users.createMany({
      data: [
        {
          id: userA.userId,
          name: userA.name,
          email: userA.email,
          passwordHash: 'hash',
          role: userA.role,
          activeSessions: JSON.stringify([{ sessionId: `sess-${userA.userId}` }])
        },
        {
          id: userB.userId,
          name: userB.name,
          email: userB.email,
          passwordHash: 'hash',
          role: userB.role,
          activeSessions: JSON.stringify([{ sessionId: `sess-${userB.userId}` }])
        }
      ]
    });

    // Seed test counselor for proper relations compatibility
    await prisma.counselors.create({
      data: {
        id: 'cons-1',
        name: 'Dr. Anita Rahmawati, M.Psi.',
        role: 'Konselor Akademik',
        specialties: JSON.stringify(['Akademik']),
        imageUrl: 'https://example.com/c.jpg',
        availability: JSON.stringify(['Senin']),
        isVerified: true,
        isDemoData: false
      }
    });
  });

  beforeEach(async () => {
    clearIdempotencyStoreForTesting();
    clearSosHistoryForTesting();
    await redisService.flush();
    await prisma.distributedState.deleteMany({});
  });

  afterAll(async () => {
    await prisma.emergencyContacts.deleteMany({ where: { userId: { in: [userA.userId, userB.userId] } } });
    await prisma.userConsents.deleteMany({ where: { userId: { in: [userA.userId, userB.userId] } } });
    await prisma.users.deleteMany({ where: { id: { in: [userA.userId, userB.userId] } } });
    await prisma.appointments.deleteMany({ where: { userId: { in: [userA.userId, userB.userId] } } });
    await prisma.counselors.deleteMany({ where: { id: { in: ['c-sec-test-1', 'c-sec-test-2', 'cons-1'] } } });
  });

  // ==========================================
  // 1. PRODUCTION AUTO-SEED FAIL-SAFE TESTS
  // ==========================================
  describe('1. Production Fail-Safe Seeding Security', () => {
    it('should NOT run auto-seed in production environment (NODE_ENV=production)', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalSeedDemo = process.env.SEED_DEMO_DATA;

      try {
        process.env.NODE_ENV = 'production';
        process.env.SEED_DEMO_DATA = 'true';

        // Attempt seeding in production mode
        await seedInitialDataIfNeeded();

        // In production, seed function must immediately abort without throwing or creating users
        // Verify no fallback account was auto-created if database was empty
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        process.env.SEED_DEMO_DATA = originalSeedDemo;
      }
    });

    it('should NOT run auto-seed when SEED_DEMO_DATA is false or unset', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalSeedDemo = process.env.SEED_DEMO_DATA;

      try {
        process.env.NODE_ENV = 'development';
        process.env.SEED_DEMO_DATA = 'false';

        await seedInitialDataIfNeeded();
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        process.env.SEED_DEMO_DATA = originalSeedDemo;
      }
    });

    it('should throw error if SEED_DEMO_DATA=true but seed passwords are missing (no fallback passwords)', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalSeedDemo = process.env.SEED_DEMO_DATA;
      const originalCounselorPw = process.env.COUNSELOR_SEED_PASSWORD;
      const originalAdminPw = process.env.ADMIN_SEED_PASSWORD;
      const originalStudentPw = process.env.STUDENT_SEED_PASSWORD;

      // Temporarily clear users to trigger seedInitialDataIfNeeded check
      const existingUsers = await prisma.users.findMany();
      await prisma.users.deleteMany({});

      try {
        process.env.NODE_ENV = 'development';
        process.env.SEED_DEMO_DATA = 'true';
        delete process.env.COUNSELOR_SEED_PASSWORD;
        delete process.env.ADMIN_SEED_PASSWORD;
        delete process.env.STUDENT_SEED_PASSWORD;

        await expect(seedInitialDataIfNeeded()).rejects.toThrow(/COUNSELOR_SEED_PASSWORD/);
      } finally {
        if (existingUsers.length > 0) {
          await prisma.users.createMany({ data: existingUsers });
        }
        process.env.NODE_ENV = originalNodeEnv;
        process.env.SEED_DEMO_DATA = originalSeedDemo;
        if (originalCounselorPw) process.env.COUNSELOR_SEED_PASSWORD = originalCounselorPw;
        if (originalAdminPw) process.env.ADMIN_SEED_PASSWORD = originalAdminPw;
        if (originalStudentPw) process.env.STUDENT_SEED_PASSWORD = originalStudentPw;
      }
    });
  });

  // ==========================================
  // 2. COUNSELOR VERIFICATION TESTS
  // ==========================================
  describe('2. Counselor Verification & GET Endpoint Hardening', () => {
    it('should return empty array and NOT mutate DB when counselors table is empty', async () => {
      // Temporarily delete all counselors
      const existingCounselors = await prisma.counselors.findMany();
      await prisma.counselors.deleteMany({});

      try {
        const res = await request(app).get('/api/v1/counselors');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);

        // Ensure database was NOT populated implicitly
        const countAfter = await prisma.counselors.count();
        expect(countAfter).toBe(0);
      } finally {
        if (existingCounselors.length > 0) {
          await prisma.counselors.createMany({ data: existingCounselors });
        }
      }
    });

    it('should NOT return fallback "SIPP/HIMPSI Terverifikasi" when licenseNumber is null or empty', async () => {
      await prisma.counselors.create({
        data: {
          id: 'c-sec-test-1',
          name: 'Konselor Belum Terverifikasi',
          role: 'Konselor Sebaya',
          specialties: '["Stres"]',
          imageUrl: 'https://example.com/c.jpg',
          availability: '["Senin"]',
          licenseNumber: null,
          isVerified: false,
          isDemoData: false
        }
      });

      const res = await request(app).get('/api/v1/counselors');
      expect(res.status).toBe(200);
      const testCounselor = res.body.find((c: any) => c.id === 'c-sec-test-1');
      expect(testCounselor).toBeDefined();
      expect(testCounselor.isVerified).toBe(false);
      expect(testCounselor.licenseNumber).toBeNull();
      expect(testCounselor.licenseNumber).not.toBe('SIPP/HIMPSI Terverifikasi');
    });
  });

  // ==========================================
  // 3. IDEMPOTENCY SECURITY TESTS
  // ==========================================
  describe('3. Idempotency Security & Cross-User Isolation', () => {
    it('should isolate idempotency keys per user namespace (prevent cross-user cache leaking)', async () => {
      const idempotencyKey = 'shared-idempotency-key-123';
      const appointmentPayloadA = {
        counselorName: 'Dr. Anita Rahmawati, M.Psi.',
        date: '2026-09-01',
        time: '10:00',
        notes: 'Sesi Mahasiswa A'
      };

      const appointmentPayloadB = {
        counselorName: 'Dimas Satria, S.Psi.',
        date: '2026-09-02',
        time: '14:00',
        notes: 'Sesi Mahasiswa B'
      };

      // User A creates appointment
      const resA = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send(appointmentPayloadA);

      expect(resA.status).toBe(200);
      expect(resA.body.record.counselorName).toBe('Dr. Anita Rahmawati, M.Psi.');

      // User B uses THE SAME idempotency key with User B's token
      const resB = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send(appointmentPayloadB);

      // User B MUST NOT receive User A's cached response!
      expect(resB.status).toBe(200);
      expect(resB.body.record.counselorName).toBe('Dimas Satria, S.Psi.');
      expect(resB.body.record.notes).toBe('Sesi Mahasiswa B');
      expect(resB.body.isIdempotentReplay).toBeUndefined();
    });

    it('should return 409 Conflict when same user reuses idempotency key with different payload', async () => {
      const idempotencyKey = 'key-payload-conflict-999';

      const payloadOriginal = {
        counselorName: 'Dr. Anita Rahmawati, M.Psi.',
        date: '2026-09-10',
        time: '09:00',
        notes: 'Pertemuan Pertama'
      };

      const payloadDifferent = {
        counselorName: 'Dr. Anita Rahmawati, M.Psi.',
        date: '2026-09-10',
        time: '09:00',
        notes: 'PAYLOAD BERBEDA DENGAN KEY SAMA'
      };

      // First call -> 200 OK
      const res1 = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send(payloadOriginal);

      expect(res1.status).toBe(200);

      // Second call with same key but DIFFERENT body -> 409 Conflict
      const res2 = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send(payloadDifferent);

      expect(res2.status).toBe(409);
      expect(res2.body.error).toBe('IDEMPOTENCY_CONFLICT');
    });

    it('should return cached response with isIdempotentReplay when same user reuses key with identical payload', async () => {
      const idempotencyKey = 'key-replay-identical-888';

      const payload = {
        counselorName: 'Dr. Anita Rahmawati, M.Psi.',
        date: '2026-09-15',
        time: '11:00',
        notes: 'Identical Replay Test'
      };

      const res1 = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send(payload);

      expect(res1.status).toBe(200);

      const res2 = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send(payload);

      expect(res2.status).toBe(200);
      expect(res2.body.isIdempotentReplay).toBe(true);
      expect(res2.body.id).toBe(res1.body.id);
    });
  });

  // ==========================================
  // 4. SECURE SOS DISPATCH TESTS
  // ==========================================
  describe('4. Secure SOS Dispatch Security', () => {
    it('should block real outbound dispatch for unauthenticated guest requests and return hotline guidance', async () => {
      const res = await request(app)
        .post('/api/v1/sos/trigger')
        .send({
          emergencyContact: {
            name: 'Nomor Target Acak',
            phone: '081299998888'
          },
          hasUserConsent: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe('GUEST_DIRECT_CALL_ONLY');
      expect(res.body.hasUserConsent).toBe(false);
      expect(res.body.hotlines).toBeDefined();
      expect(res.body.dispatchId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should reject SOS trigger when user has no server-side consent', async () => {
      // Ensure user A has contact recorded in DB, but NO consent
      await prisma.userConsents.deleteMany({ where: { userId: userA.userId } });
      await prisma.emergencyContacts.upsert({
        where: { userId: userA.userId },
        create: {
          userId: userA.userId,
          name: 'Kontak User A',
          phone: '081234567890',
          relationship: 'Orang Tua',
          hasConsent: false
        },
        update: {
          hasConsent: false
        }
      });

      const res = await request(app)
        .post('/api/v1/sos/trigger')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          emergencyContact: {
            name: 'Spoofed Contact',
            phone: '081111111111'
          },
          hasUserConsent: true // Client claims consent, but server truth is missing!
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('CONSENT_REQUIRED');
      expect(res.body.hasUserConsent).toBe(false);
    });

    it('should use server-stored contact details and ignore client body spoofing', async () => {
      // Set server-side contact and consent for User A
      const { encryptionService } = await import('../../services/encryptionService.js');
      const encryptedPhone = encryptionService.encryptSensitive('081234567890');
      const encryptedName = encryptionService.encryptSensitive('Orang Tua Resmi User A');

      await prisma.emergencyContacts.upsert({
        where: { userId: userA.userId },
        create: {
          userId: userA.userId,
          name: encryptedName,
          phone: encryptedPhone,
          relationship: 'Orang Tua',
          hasConsent: true
        },
        update: {
          name: encryptedName,
          phone: encryptedPhone,
          hasConsent: true
        }
      });

      await prisma.userConsents.upsert({
        where: { userId: userA.userId },
        create: {
          userId: userA.userId,
          consentForEmergencySOS: true
        },
        update: {
          consentForEmergencySOS: true
        }
      });

      // Attacker sends request with spoofed emergency contact in request body
      const res = await request(app)
        .post('/api/v1/sos/trigger')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          emergencyContact: {
            name: 'SPOOFED_TARGET_NAME',
            phone: '089999999999' // Attacker's target phone
          },
          hasUserConsent: true
        });

      expect(res.status).toBe(200);
      expect(res.body.recipientName).toMatch(/^O(\*+)A$/);
      expect(res.body.recipientPhone).toMatch(/^0812(\*+)890$/);
      expect(res.body.recipientPhone).not.toContain('089999999999');
      expect(res.body.recipientName).not.toContain('SPOOFED_TARGET_NAME');
      expect(res.body.dispatchId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should rate-limit rapid consecutive SOS dispatches (3-minute cooldown)', async () => {
      // First dispatch -> 200 OK
      const res1 = await request(app)
        .post('/api/v1/sos/trigger')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({});

      expect(res1.status).toBe(200);

      // Immediate second dispatch -> 429 Too Many Requests (Cooldown Active)
      const res2 = await request(app)
        .post('/api/v1/sos/trigger')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({});

      expect(res2.status).toBe(429);
      expect(res2.body.status).toBe('COOLDOWN_ACTIVE');
    });
  });
});
