import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { serverDb, prisma } from '../../database.js';
import authRouter from '../../routes/auth.js';
import usabilityRouter from '../../routes/usability.js';
import { getJwtSecret } from '../../middleware/auth.js';
import { authService } from '../../services/authService.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRouter);
app.use('/api', usabilityRouter);

const generateToken = (user: any, expiresIn: string = '1h') => {
  return jwt.sign({ ...user, sessionId: user.sessionId || 'test-session' }, getJwtSecret(), { 
    expiresIn: expiresIn as any,
    issuer: 'ruangtenang',
    audience: 'ruangtenang-web',
    algorithm: 'HS256'
  });
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
          emailVerified: true,
          activeSessions: JSON.stringify([{ sessionId: 'sess-active', ipAddress: '127.0.0.1', userAgent: 'test', createdAt: new Date().toISOString() }])
        },
        { 
          id: 'sec-admin-1', 
          name: 'Admin 1', 
          email: 'a1@test.com', 
          passwordHash: 'hash', 
          role: 'admin', 
          tier: 'Developer',
          emailVerified: true,
          activeSessions: JSON.stringify([{ sessionId: 'sess-admin', ipAddress: '127.0.0.1', userAgent: 'test', createdAt: new Date().toISOString() }])
        },
        { 
          id: 'sec-user-revoked', 
          name: 'User Revoked', 
          email: 'ur@test.com', 
          passwordHash: 'hash', 
          role: 'mahasiswa', 
          tier: 'Free',
          emailVerified: true,
          activeSessions: '[]' // Explicitly empty/revoked
        }
      ]
    });

    await serverDb.addActiveSession('sec-user-1', { sessionId: 'sess-active', device: 'Desktop', ip: '127.0.0.1', userAgent: 'test', createdAt: new Date().toISOString(), lastActive: new Date().toISOString() });
    await serverDb.addActiveSession('sec-admin-1', { sessionId: 'sess-admin', device: 'Desktop', ip: '127.0.0.1', userAgent: 'test', createdAt: new Date().toISOString(), lastActive: new Date().toISOString() });

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

describe('Password Change Session Revocation Tests', () => {
  const TEST_EMAIL = 'pass_change@test.com';

  beforeAll(async () => {
    await prisma.users.deleteMany({ where: { email: TEST_EMAIL } });
  });

  afterAll(async () => {
    await prisma.users.deleteMany({ where: { email: TEST_EMAIL } });
  });

  it('revokes all sessions on password change', async () => {
    // 1. Register user
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Pass Change User',
        email: TEST_EMAIL,
        password: 'OldPassword123!',
        role: 'mahasiswa'
      });

    await prisma.users.updateMany({
      where: { email: TEST_EMAIL },
      data: { emailVerified: true }
    });

    // 2. Login session A
    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'OldPassword123!' });
    
    expect(loginA.status).toBe(200);
    const cookieA = ((loginA.headers['set-cookie'] as unknown) as string[] | undefined)?.find((c: string) => c.startsWith('ruangtenang_session='));
    expect(cookieA).toBeDefined();
    
    // 3. Login session B
    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'OldPassword123!' });
    
    expect(loginB.status).toBe(200);
    const cookieB = ((loginB.headers['set-cookie'] as unknown) as string[] | undefined)?.find((c: string) => c.startsWith('ruangtenang_session='));
    expect(cookieB).toBeDefined();

    // 4. Change password from session A
    const changeRes = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookieA as string)
      .send({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!'
      });
    
    expect(changeRes.status).toBe(200);
    
    // 5. Verify Session A is invalid
    const meA = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookieA as string);
    // Note: The me endpoint returns 200 with user: null and sessionRevoked: true when auth fails softly in some configurations, or 401 via requireAuth. Actually /me uses optionalAuth, so it returns 200 { user: null }.
    expect(meA.status).toBe(200);
    expect(meA.body.user).toBeNull();
    
    // Test a requireAuth endpoint to verify 401
    const sessionsA = await request(app)
      .get('/api/auth/sessions')
      .set('Cookie', cookieA as string);
    expect(sessionsA.status).toBe(401);

    // 6. Verify Session B is invalid
    const sessionsB = await request(app)
      .get('/api/auth/sessions')
      .set('Cookie', cookieB as string);
    expect(sessionsB.status).toBe(401);

    // 7. Verify old password fails
    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'OldPassword123!' });
    // Expect 401 Unauthorized or 400 depending on your exact login controller behavior
    expect([400, 401]).toContain(oldLogin.status);

    // 8. Verify new password succeeds
    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'NewPassword123!' });
    expect(newLogin.status).toBe(200);
  });
});

describe('Session Management & Zero-Trust Tier Tests', () => {
  const SESSION_USER_EMAIL = 'session_test@test.com';

  beforeAll(async () => {
    await prisma.users.deleteMany({ where: { email: SESSION_USER_EMAIL } });
  });

  afterAll(async () => {
    await prisma.users.deleteMany({ where: { email: SESSION_USER_EMAIL } });
  });

  it('correctly detects current session with isCurrent: true in /api/auth/sessions', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Session Detection User',
      email: SESSION_USER_EMAIL,
      password: 'Password123!',
      role: 'mahasiswa'
    });
    await prisma.users.updateMany({
      where: { email: SESSION_USER_EMAIL },
      data: { emailVerified: true }
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: SESSION_USER_EMAIL, password: 'Password123!' });
    
    const cookie = loginRes.headers['set-cookie']?.[0];

    const sessionsRes = await request(app)
      .get('/api/auth/sessions')
      .set('Cookie', cookie);

    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body.sessions).toBeDefined();
    expect(sessionsRes.body.sessions.length).toBeGreaterThan(0);

    const currentSession = sessionsRes.body.sessions.find((s: any) => s.isCurrent === true);
    expect(currentSession).toBeDefined();
    expect(currentSession.isCurrent).toBe(true);
  });

  it('rejects tier spoofing when client uses JWT with fake tier claim but database is Free', async () => {
    const dbUser = await prisma.users.findUnique({ where: { email: SESSION_USER_EMAIL } });
    expect(dbUser).toBeDefined();

    const forgedToken = generateToken({
      userId: dbUser!.id,
      email: dbUser!.email,
      role: 'mahasiswa',
      tier: 'Developer',
      sessionId: 'sess-active'
    });

    const statsRes = await request(app)
      .get('/api/user/usage-stats')
      .set('Authorization', `Bearer ${forgedToken}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.userTier).toBe('Free');
    expect(statsRes.body.isDeveloper).toBe(false);
  });

  it('revokes a single session when /api/auth/sessions/revoke is called', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: SESSION_USER_EMAIL, password: 'Password123!' });
    
    const cookie = loginRes.headers['set-cookie']?.[0];

    const sessionsRes = await request(app)
      .get('/api/auth/sessions')
      .set('Cookie', cookie);
    
    const currentSession = sessionsRes.body.sessions.find((s: any) => s.isCurrent === true);
    expect(currentSession).toBeDefined();

    const revokeRes = await request(app)
      .post('/api/auth/sessions/revoke')
      .set('Cookie', cookie)
      .send({ sessionId: currentSession.sessionId });

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.success).toBe(true);

    const nextReq = await request(app)
      .get('/api/auth/sessions')
      .set('Cookie', cookie);

    expect(nextReq.status).toBe(401);
    expect(nextReq.body.code).toBe('SESSION_REVOKED');
  });

  it('revokes all sessions when /api/auth/logout-all is called', async () => {
    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: SESSION_USER_EMAIL, password: 'Password123!' });
    const cookieA = loginA.headers['set-cookie']?.[0];

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: SESSION_USER_EMAIL, password: 'Password123!' });
    const cookieB = loginB.headers['set-cookie']?.[0];

    const logoutAllRes = await request(app)
      .post('/api/auth/logout-all')
      .set('Cookie', cookieA);

    expect(logoutAllRes.status).toBe(200);

    const checkA = await request(app).get('/api/auth/sessions').set('Cookie', cookieA);
    expect(checkA.status).toBe(401);

    const checkB = await request(app).get('/api/auth/sessions').set('Cookie', cookieB);
    expect(checkB.status).toBe(401);
  });
});
