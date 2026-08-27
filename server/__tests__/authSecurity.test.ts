import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { serverDb, prisma } from '../database.js';
import authRouter from '../routes/auth.js';
import usabilityRouter from '../routes/usability.js';
import { getJwtSecret } from '../middleware/auth.js';
import { authService } from '../services/authService.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRouter);
app.use('/api', usabilityRouter);

const generateToken = (user: any, expiresIn: string = '1h') => {
  return jwt.sign(user, getJwtSecret(), { expiresIn: expiresIn as any });
};

describe('Authentication & Security Hardening Tests', () => {
  let adminToken: string;
  let userToken: string;
  let revokedUserToken: string;
  let expiredToken: string;
  
  beforeAll(async () => {
    await prisma.users.deleteMany({ where: { id: { in: ['sec-user-1', 'sec-admin-1', 'sec-user-revoked'] } } });

    await prisma.users.createMany({
      data: [
        { 
          id: 'sec-user-1', 
          name: 'User 1', 
          email: 'u1@test.com', 
          passwordHash: 'hash', 
          role: 'mahasiswa', 
          tier: 'Free',
          activeSessions: JSON.stringify([{ sessionId: 'sess-active', ipAddress: '127.0.0.1', userAgent: 'test', createdAt: new Date().toISOString() }])
        },
        { 
          id: 'sec-admin-1', 
          name: 'Admin 1', 
          email: 'a1@test.com', 
          passwordHash: 'hash', 
          role: 'admin', 
          tier: 'Developer',
          activeSessions: JSON.stringify([{ sessionId: 'sess-admin', ipAddress: '127.0.0.1', userAgent: 'test', createdAt: new Date().toISOString() }])
        },
        { 
          id: 'sec-user-revoked', 
          name: 'User Revoked', 
          email: 'ur@test.com', 
          passwordHash: 'hash', 
          role: 'mahasiswa', 
          tier: 'Free',
          activeSessions: '[]' // Explicitly empty/revoked
        }
      ]
    });

    userToken = generateToken({ userId: 'sec-user-1', role: 'mahasiswa', sessionId: 'sess-active' });
    adminToken = generateToken({ userId: 'sec-admin-1', role: 'admin', sessionId: 'sess-admin' });
    revokedUserToken = generateToken({ userId: 'sec-user-revoked', role: 'mahasiswa', sessionId: 'sess-revoked' }); // Session ID not in DB
    expiredToken = generateToken({ userId: 'sec-user-1', role: 'mahasiswa', sessionId: 'sess-active' }, '-1h');
  });

  afterAll(async () => {
    await prisma.users.deleteMany({ where: { id: { in: ['sec-user-1', 'sec-admin-1', 'sec-user-revoked'] } } });
  });

  it('Denies access with revoked session', async () => {
    const res = await request(app).get('/api/user/usage-stats').set('Authorization', `Bearer ${revokedUserToken}`);
    // usability uses optionalAuth, so user should be treated as guest if revoked
    expect(res.status).toBe(200);
    expect(res.body.userTier).toBe('Free');
    expect(res.body.isPro).toBe(false);
  });

  it('Denies access with invalid JWT', async () => {
    const res = await request(app).get('/api/user/usage-stats').set('Authorization', `Bearer invalid-token.xyz.abc`);
    expect(res.status).toBe(200);
    expect(res.body.userTier).toBe('Free');
  });

  it('Denies access with expired JWT', async () => {
    const res = await request(app).get('/api/user/usage-stats').set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(200);
    expect(res.body.userTier).toBe('Free');
  });

  it('Prevents unauthorized user from updating tier', async () => {
    const res = await request(app).post('/api/auth/update-tier').set('Authorization', `Bearer ${userToken}`).send({ targetUserId: 'sec-user-1', tier: 'Pro' });
    expect(res.status).toBe(403);
  });

  it('Allows admin to update tier', async () => {
    const res = await request(app).post('/api/auth/update-tier').set('Authorization', `Bearer ${adminToken}`).send({ targetUserId: 'sec-user-1', tier: 'Pro' });
    expect(res.status).toBe(200);
    expect(res.body.user.tier).toBe('Pro');
  });

  it('Prevents guest tier spoofing via query params', async () => {
    const res = await request(app).get('/api/user/usage-stats?userTier=Developer');
    expect(res.status).toBe(200);
    expect(res.body.userTier).toBe('Free'); // Guest is always forced to Free
    expect(res.body.isDeveloper).toBe(false);
  });

  it('Returns accurate tier from DB for authenticated user, ignoring query params', async () => {
    const res = await request(app).get('/api/user/usage-stats?userTier=Developer').set('Authorization', `Bearer ${userToken}`);
    // user1 is currently Pro (updated by admin)
    expect(res.status).toBe(200);
    expect(res.body.userTier).toBe('Pro');
    expect(res.body.isDeveloper).toBe(false);
  });
});
