import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { prisma, serverDb } from '../../database.js';
import { getJwtSecret } from '../../middleware/auth.js';
import emergencyRouter, { clearSosHistoryForTesting } from '../../routes/emergency.js';
import { encryptionService } from '../../services/encryptionService.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1', emergencyRouter);

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

describe('SOS Trigger API Contract & Security Integration Tests', () => {
  const testUser = {
    userId: 'user-sos-contract-1',
    name: 'Mahasiswa Test SOS',
    email: 'sos.test@univ.ac.id',
    role: 'mahasiswa'
  };

  const testUserNoConsent = {
    userId: 'user-sos-contract-no-consent',
    name: 'Mahasiswa No Consent',
    email: 'noconsent@univ.ac.id',
    role: 'mahasiswa'
  };

  const testUserNoContact = {
    userId: 'user-sos-contract-no-contact',
    name: 'Mahasiswa No Contact',
    email: 'nocontact@univ.ac.id',
    role: 'mahasiswa'
  };

  let tokenValid: string;
  let tokenNoConsent: string;
  let tokenNoContact: string;

  beforeAll(async () => {
    vi.spyOn(serverDb, 'isSessionActive').mockResolvedValue(true);

    tokenValid = generateUserToken(testUser);
    tokenNoConsent = generateUserToken(testUserNoConsent);
    tokenNoContact = generateUserToken(testUserNoContact);

    // Clean up
    const userIds = [testUser.userId, testUserNoConsent.userId, testUserNoContact.userId];
    await prisma.emergencyContacts.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userConsents.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.users.deleteMany({ where: { id: { in: userIds } } });

    // Seed users
    await prisma.users.createMany({
      data: [
        { id: testUser.userId, name: testUser.name, email: testUser.email, passwordHash: 'hash', role: 'mahasiswa' },
        { id: testUserNoConsent.userId, name: testUserNoConsent.name, email: testUserNoConsent.email, passwordHash: 'hash', role: 'mahasiswa' },
        { id: testUserNoContact.userId, name: testUserNoContact.name, email: testUserNoContact.email, passwordHash: 'hash', role: 'mahasiswa' },
      ]
    });

    // Valid user: has contact + full consents
    await prisma.emergencyContacts.create({
      data: {
        userId: testUser.userId,
        name: encryptionService.encryptSensitive('Ibu Kandung'),
        phone: encryptionService.encryptSensitive('081299887766'),
        relationship: 'Orang Tua',
        hasConsent: true,
      }
    });
    await prisma.userConsents.create({
      data: {
        userId: testUser.userId,
        consentForEmergencySOS: true,
        consentForCounselorSharing: true,
        consentForAI: true,
      }
    });

    // User without consent
    await prisma.emergencyContacts.create({
      data: {
        userId: testUserNoConsent.userId,
        name: encryptionService.encryptSensitive('Ayah'),
        phone: encryptionService.encryptSensitive('081211112222'),
        relationship: 'Orang Tua',
        hasConsent: false,
      }
    });
    await prisma.userConsents.create({
      data: {
        userId: testUserNoConsent.userId,
        consentForEmergencySOS: false,
        consentForCounselorSharing: true,
        consentForAI: true,
      }
    });

    // User without contact
    await prisma.userConsents.create({
      data: {
        userId: testUserNoContact.userId,
        consentForEmergencySOS: true,
        consentForCounselorSharing: true,
        consentForAI: true,
      }
    });
  });

  beforeEach(async () => {
    clearSosHistoryForTesting();
    await prisma.distributedState.deleteMany({
      where: {
        key: {
          contains: 'user-sos-contract'
        }
      }
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    const userIds = [testUser.userId, testUserNoConsent.userId, testUserNoContact.userId];
    await prisma.emergencyContacts.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userConsents.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.users.deleteMany({ where: { id: { in: userIds } } });
  });

  it('1. Handles guest (unauthenticated) request safely without outbound dispatch', async () => {
    const res = await request(app)
      .post('/api/v1/sos/trigger')
      .send({
        studentName: 'Guest User',
        location: { address: 'Kampus' }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.status).toBe('GUEST_DIRECT_CALL_ONLY');
    expect(res.body.hotlines).toBeDefined();
    expect(res.body.hotlines.length).toBeGreaterThan(0);
  });

  it('2. Rejects request when user consent is missing or disabled in server', async () => {
    const res = await request(app)
      .post('/api/v1/sos/trigger')
      .set('Authorization', `Bearer ${tokenNoConsent}`)
      .send({
        studentName: testUserNoConsent.name,
        location: { address: 'Gedung Rektorat' }
      });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('CONSENT_REQUIRED');
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Persetujuan.*SOS darurat belum diaktifkan/i);
  });

  it('3. Rejects request when server-stored emergency contact is missing', async () => {
    const res = await request(app)
      .post('/api/v1/sos/trigger')
      .set('Authorization', `Bearer ${tokenNoContact}`)
      .send({
        studentName: testUserNoContact.name,
        location: { address: 'Perpustakaan' }
      });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('CONTACT_MISSING');
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Kontak darurat belum tersimpan/i);
  });

  it('4. Rejects invalid payload with extra fields or incorrect types violating strict schema', async () => {
    // Extra fields rejected by .strict()
    const resExtra = await request(app)
      .post('/api/v1/sos/trigger')
      .set('Authorization', `Bearer ${tokenValid}`)
      .send({
        emergencyContact: {
          name: 'Ibu',
          phone: '081299887766',
          relationship: 'Orang Tua',
          whatsapp: '081299887766', // Invalid extra property
          consentDate: '2026-08-28' // Invalid extra property
        },
        location: 'Kampus / Kos' // Invalid string instead of location object
      });

    expect(resExtra.status).toBe(400);
    expect(resExtra.body.error).toBe('Validasi gagal.');
    expect(resExtra.body.details).toBeDefined();
  });

  it('5. Accepts valid payload and dispatches SOS for authenticated user with valid consent', async () => {
    const validPayload = {
      emergencyContact: {
        name: 'Ibu Kandung',
        phone: '081299887766',
        relationship: 'Orang Tua'
      },
      hasUserConsent: true,
      studentName: testUser.name,
      location: {
        address: 'Gedung Fasilkom UI'
      }
    };

    const res = await request(app)
      .post('/api/v1/sos/trigger')
      .set('Authorization', `Bearer ${tokenValid}`)
      .send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(['SENT', 'SIMULATED']).toContain(res.body.status);
    expect(res.body.dispatchId).toBeDefined();
    expect(res.body.hasUserConsent).toBe(true);
    // Verified server-decrypted contact is used
    expect(res.body.recipientName).toBe('Ibu Kandung');
    expect(res.body.recipientPhone).toBe('081299887766');
  });
});
