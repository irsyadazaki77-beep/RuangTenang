process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 'a').toString('base64');
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { prisma } from '../database.js';
import privacyRouter from '../routes/privacy.js';
import { getJwtSecret } from '../middleware/auth.js';
import { encryptionService } from '../services/encryptionService.js';
import { scanAndSanitizePII } from '../services/piiService.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/privacy', privacyRouter);

const generateToken = (user: any) => {
  return jwt.sign({ ...user, sessionId: user.sessionId || 'test-session' }, getJwtSecret(), { 
    expiresIn: '1h',
    issuer: 'ruangtenang',
    audience: 'ruangtenang-web',
    algorithm: 'HS256'
  });
};

describe('Privacy, Consent, & Data Governance Tests', () => {
  let userToken: string;

  beforeAll(async () => {
    await prisma.users.deleteMany({ where: { id: 'priv-user-1' } });

    await prisma.users.create({
      data: { 
        id: 'priv-user-1', 
        name: 'Privacy User', 
        email: 'priv@test.com', 
        passwordHash: 'hash', 
        role: 'mahasiswa', 
        tier: 'Free',
        activeSessions: JSON.stringify([{ sessionId: 'sess-priv', ipAddress: '127.0.0.1', userAgent: 'test', createdAt: new Date().toISOString() }])
      }
    });

    userToken = generateToken({ userId: 'priv-user-1', role: 'mahasiswa', sessionId: 'sess-priv' });
  });

  afterAll(async () => {
    await prisma.userConsents.deleteMany({ where: { userId: 'priv-user-1' } });
    await prisma.users.deleteMany({ where: { id: 'priv-user-1' } });
  });

  it('Centralized Consent: Updates database correctly', async () => {
    const res = await request(app)
      .post('/api/privacy/consent')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ consentForAIMood: true, consentForAIMemory: false });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.consent.consentForAIMood).toBe(true);
    expect(res.body.consent.consentForAIMemory).toBe(false);
  });

  it('AI Data Pipeline: PII Sanitization works correctly', () => {
    const rawInput = 'Halo, nama saya Budi (budi@gmail.com) dan telepon 08123456789.';
    const result = scanAndSanitizePII(rawInput);
    
    expect(result.sanitizedText).not.toContain('Budi');
    expect(result.sanitizedText).not.toContain('budi@gmail.com');
    expect(result.sanitizedText).not.toContain('08123456789');
    expect(result.hasPii).toBe(true);
  });

  it('Encryption Pipeline: Properly encrypts and decrypts sensitive data', () => {
    const plaintext = 'Sangat rahasia: merasa cemas hari ini.';
    const ciphertext = encryptionService.encryptSensitive(plaintext);
    
    expect(ciphertext).not.toBeNull();
    expect(ciphertext).not.toEqual(plaintext);
    expect(ciphertext?.startsWith('v1:')).toBe(true); // check version prefix

    const decrypted = encryptionService.decryptSensitive(ciphertext);
    expect(decrypted).toEqual(plaintext);
  });
});
