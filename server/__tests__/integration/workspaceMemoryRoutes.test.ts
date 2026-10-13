import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import workspaceRouter from '../../routes/workspace.js';
import { prisma, serverDb } from '../../database.js';
import { consentService } from '../../services/consentService.js';

describe('FASE 14: Workspace Memory API Routes Integration Tests', () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/v1/workspace', workspaceRouter);

  const userId = 'usr-phase14-api-test';
  const otherUserId = 'usr-phase14-other-user';
  const workspaceId = 'chat-phase14-api-ws';
  const otherWorkspaceId = 'chat-phase14-other-ws';

  const jwtSecret = process.env.JWT_SECRET || 'test_jwt_secret_phase14';
  const token = jwt.sign(
    { userId, email: 'test@example.com', role: 'mahasiswa', sessionId: 'sess-phase14-test-1' },
    jwtSecret,
    { issuer: 'ruangtenang', audience: 'ruangtenang-web', algorithm: 'HS256' }
  );
  const otherToken = jwt.sign(
    { userId: otherUserId, email: 'other@example.com', role: 'mahasiswa', sessionId: 'sess-phase14-test-2' },
    jwtSecret,
    { issuer: 'ruangtenang', audience: 'ruangtenang-web', algorithm: 'HS256' }
  );

  beforeAll(() => {
    vi.spyOn(serverDb, 'isSessionActive').mockResolvedValue(true);
    vi.spyOn(serverDb, 'getUserById').mockImplementation(async (id: string) => {
      if (id === userId) {
        return {
          id: userId,
          name: 'API User Phase 14',
          email: 'api.phase14@example.com',
          role: 'mahasiswa',
          tier: 'Free',
          createdAt: new Date().toISOString()
        } as any;
      }
      if (id === otherUserId) {
        return {
          id: otherUserId,
          name: 'Other User Phase 14',
          email: 'other.phase14@example.com',
          role: 'mahasiswa',
          tier: 'Free',
          createdAt: new Date().toISOString()
        } as any;
      }
      return null;
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    process.env.JWT_SECRET = jwtSecret;

    await prisma.workspaceMemories.deleteMany({
      where: { userId: { in: [userId, otherUserId] } }
    });
    await prisma.chats.deleteMany({
      where: { id: { in: [workspaceId, otherWorkspaceId] } }
    });
    await prisma.users.deleteMany({
      where: { id: { in: [userId, otherUserId] } }
    });

    await prisma.users.create({
      data: {
        id: userId,
        name: 'API User Phase 14',
        email: 'api.phase14@example.com',
        passwordHash: 'dummy'
      }
    });

    await prisma.users.create({
      data: {
        id: otherUserId,
        name: 'Other User Phase 14',
        email: 'other.phase14@example.com',
        passwordHash: 'dummy'
      }
    });

    await prisma.chats.create({
      data: {
        id: workspaceId,
        userId,
        title: 'Workspace API Testing',
        workspaceMode: 'RUANG_KERJA',
        workspace: { create: {} }
      }
    });

    await prisma.chats.create({
      data: {
        id: otherWorkspaceId,
        userId: otherUserId,
        title: 'Other Workspace',
        workspaceMode: 'RUANG_KERJA',
        workspace: { create: {} }
      }
    });

    await consentService.updateConsents(userId, {
      consentForAI: true,
      consentForAIMemory: true
    });
    await consentService.updateConsents(otherUserId, {
      consentForAI: true,
      consentForAIMemory: true
    });
  });

  it('1. POST /memories creates a new memory with validation and encryption', async () => {
    const res = await request(app)
      .post(`/api/v1/workspace/${workspaceId}/memories`)
      .set('Cookie', [`token=${token}`])
      .send({
        category: 'decision',
        content: 'Menggunakan metodologi Design Thinking dalam skripsi'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.category).toBe('decision');
    expect(res.body.data.content).toBe('Menggunakan metodologi Design Thinking dalam skripsi');
  });

  it('2. GET /memories lists memories for owned workspace only', async () => {
    // Create one memory first
    await request(app)
      .post(`/api/v1/workspace/${workspaceId}/memories`)
      .set('Cookie', [`token=${token}`])
      .send({
        category: 'preference',
        content: 'Bahasa Indonesia baku EYD V'
      });

    const res = await request(app)
      .get(`/api/v1/workspace/${workspaceId}/memories`)
      .set('Cookie', [`token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].content).toBe('Bahasa Indonesia baku EYD V');

    // Other user cannot view Alice workspace memories
    const otherRes = await request(app)
      .get(`/api/v1/workspace/${workspaceId}/memories`)
      .set('Cookie', [`token=${otherToken}`]);

    expect(otherRes.status).toBe(404);
  });

  it('3. PUT /memories/:id updates content and active status', async () => {
    const createRes = await request(app)
      .post(`/api/v1/workspace/${workspaceId}/memories`)
      .set('Cookie', [`token=${token}`])
      .send({
        category: 'constraint',
        content: 'Batas akhir draf Bab 1 adalah 20 Oktober'
      });

    const memId = createRes.body.data.id;

    const updateRes = await request(app)
      .put(`/api/v1/workspace/${workspaceId}/memories/${memId}`)
      .set('Cookie', [`token=${token}`])
      .send({
        content: 'Batas akhir draf Bab 1 diperpanjang ke 25 Oktober',
        isActive: false
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.content).toBe('Batas akhir draf Bab 1 diperpanjang ke 25 Oktober');
    expect(updateRes.body.data.isActive).toBe(false);
    expect(updateRes.body.data.version).toBe(2);
  });

  it('4. DELETE /memories/:id deletes the memory', async () => {
    const createRes = await request(app)
      .post(`/api/v1/workspace/${workspaceId}/memories`)
      .set('Cookie', [`token=${token}`])
      .send({
        category: 'progress',
        content: 'Bab 1 dan Bab 2 sudah selesai direviu dosen pembimbing'
      });

    const memId = createRes.body.data.id;

    const delRes = await request(app)
      .delete(`/api/v1/workspace/${workspaceId}/memories/${memId}`)
      .set('Cookie', [`token=${token}`]);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const listRes = await request(app)
      .get(`/api/v1/workspace/${workspaceId}/memories`)
      .set('Cookie', [`token=${token}`]);

    expect(listRes.body.data).toHaveLength(0);
  });
});
