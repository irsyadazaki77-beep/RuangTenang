import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { prisma, serverDb } from '../../database.js';
import privacyRouter from '../../routes/privacy.js';
import { getJwtSecret } from '../../middleware/auth.js';
import bcrypt from 'bcryptjs';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/privacy', privacyRouter);

const generateToken = (user: any) => {
  return jwt.sign({ ...user, sessionId: user.sessionId || 'test-session-del' }, getJwtSecret(), { 
    expiresIn: '1h',
    issuer: 'ruangtenang',
    audience: 'ruangtenang-web',
    algorithm: 'HS256'
  });
};

describe('Account Deletion Security Tests', () => {
  let user1Token: string;
  let user2MfaToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Cleanup
    await prisma.users.deleteMany({
      where: { id: { in: ['del-user-1', 'del-user-mfa-2', 'del-admin-1'] } }
    });

    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Create users
    await prisma.users.createMany({
      data: [
        {
          id: 'del-user-1',
          name: 'Regular User',
          email: 'del1@test.com',
          passwordHash,
          role: 'mahasiswa',
          mfaEnabled: false
        },
        {
          id: 'del-user-mfa-2',
          name: 'MFA User',
          email: 'del2@test.com',
          passwordHash,
          role: 'mahasiswa',
          mfaEnabled: true
        },
        {
          id: 'del-admin-1',
          name: 'Admin',
          email: 'deladmin@test.com',
          passwordHash,
          role: 'admin',
          mfaEnabled: false
        }
      ]
    });

    // Create session for MFA verification
    await serverDb.setMfaCode('del-user-mfa-2', '123456', 'mfa-tok-test');

    // Create sessions
    const oldDate = new Date();
    oldDate.setMinutes(oldDate.getMinutes() - 10);

    await prisma.userSession.createMany({
      data: [
        { id: 'test-session-del', userId: 'del-user-1', device: 'test', ip: '127.0.0.1', userAgent: 'test' },
        { id: 'test-session-del-mfa', userId: 'del-user-mfa-2', device: 'test', ip: '127.0.0.1', userAgent: 'test', createdAt: oldDate },
        { id: 'test-session-del-admin', userId: 'del-admin-1', device: 'test', ip: '127.0.0.1', userAgent: 'test' }
      ]
    });

    user1Token = generateToken({ userId: 'del-user-1', email: 'del1@test.com', role: 'mahasiswa', sessionId: 'test-session-del' });
    user2MfaToken = generateToken({ userId: 'del-user-mfa-2', email: 'del2@test.com', role: 'mahasiswa', sessionId: 'test-session-del-mfa' });
    adminToken = generateToken({ userId: 'del-admin-1', email: 'deladmin@test.com', role: 'admin', sessionId: 'test-session-del-admin' });
  });

  afterAll(async () => {
    await prisma.userSession.deleteMany({
      where: { id: { in: ['test-session-del', 'test-session-del-mfa', 'test-session-del-admin'] } }
    });
    await prisma.users.deleteMany({
      where: { id: { in: ['del-user-1', 'del-user-mfa-2', 'del-admin-1'] } }
    });
  });

  it('fails deletion if no password provided', async () => {
    const res = await request(app)
      .post('/api/privacy/erasure-request')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        confirmText: 'HAPUS AKUN SAYA'
      });
    
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PASSWORD_REQUIRED');
  });

  it('fails deletion if wrong password provided', async () => {
    const res = await request(app)
      .post('/api/privacy/erasure-request')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        confirmText: 'HAPUS AKUN SAYA',
        confirmPassword: 'wrongpassword'
      });
    
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_PASSWORD');
  });

  it('fails deletion if wrong confirmation phrase provided', async () => {
    const res = await request(app)
      .post('/api/privacy/erasure-request')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        confirmText: 'HAPUS',
        confirmPassword: 'password123'
      });
    
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CONFIRMATION_REQUIRED');
  });

  it('fails deletion for MFA account if no MFA code provided', async () => {
    const res = await request(app)
      .post('/api/privacy/erasure-request')
      .set('Authorization', `Bearer ${user2MfaToken}`)
      .send({
        confirmText: 'HAPUS AKUN SAYA',
        confirmPassword: 'password123'
      });
    
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MFA_REQUIRED');
  });

  it('fails deletion for MFA account if wrong MFA code provided', async () => {
    const res = await request(app)
      .post('/api/privacy/erasure-request')
      .set('Authorization', `Bearer ${user2MfaToken}`)
      .send({
        confirmText: 'HAPUS AKUN SAYA',
        confirmPassword: 'password123',
        mfaCode: '000000'
      });
    
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_MFA_CODE');
  });

  it('unauthorized user cannot delete another account', async () => {
    const res = await request(app)
      .post('/api/privacy/erasure-request')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        userId: 'del-user-mfa-2' // user1 tries to delete user2
      });
    
    // User1 is not admin, so targetUserId defaults to user1's id.
    // It will expect user1's confirmation phrase and password.
    expect(res.status).toBe(400); 
    // And it will NOT delete user2.
    const user2 = await prisma.users.findUnique({ where: { id: 'del-user-mfa-2' } });
    expect(user2).not.toBeNull();
  });

  it('succeeds deletion for regular account with correct phrase and password', async () => {
    const res = await request(app)
      .post('/api/privacy/erasure-request')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        confirmText: 'HAPUS AKUN SAYA',
        confirmPassword: 'password123'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user1 = await prisma.users.findUnique({ where: { id: 'del-user-1' } });
    expect(user1).toBeNull();
  });

  it('succeeds deletion for MFA account with correct phrase, password, and MFA code', async () => {
    const res = await request(app)
      .post('/api/privacy/erasure-request')
      .set('Authorization', `Bearer ${user2MfaToken}`)
      .send({
        confirmText: 'HAPUS AKUN SAYA',
        confirmPassword: 'password123',
        mfaCode: '123456'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user2 = await prisma.users.findUnique({ where: { id: 'del-user-mfa-2' } });
    expect(user2).toBeNull();
  });
});
