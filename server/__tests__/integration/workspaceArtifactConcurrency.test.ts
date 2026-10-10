import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { prisma, serverDb } from '../../database.js';
import workspaceArtifactsRouter from '../../routes/workspaceArtifacts.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-ruangtenang';
const user = { userId: 'usr-artifact-occ-test', name: 'Artifact Test', email: 'artifact-occ@example.test', role: 'mahasiswa' };
const chatId = 'chat-artifact-occ-test';
const artifactId = 'art_artifact_occ_test';
const token = jwt.sign({ ...user, sessionId: 'artifact-occ-session' }, JWT_SECRET, { issuer: 'ruangtenang', audience: 'ruangtenang-web', algorithm: 'HS256' });
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/workspace/artifacts', workspaceArtifactsRouter);

describe('Workspace artifact concurrency persistence integration', () => {
  beforeAll(async () => {
    vi.spyOn(serverDb, 'isSessionActive').mockResolvedValue(true);
    vi.spyOn(serverDb, 'getUserById').mockResolvedValue({
      id: user.userId, name: user.name, email: user.email, passwordHash: 'test-hash', role: user.role, tier: 'Free', createdAt: new Date().toISOString()
    });
    await prisma.users.deleteMany({ where: { id: user.userId } });
    await prisma.users.create({ data: { id: user.userId, name: user.name, email: user.email, passwordHash: 'test-hash', role: user.role, tier: 'Free' } });
    await prisma.chats.create({ data: { id: chatId, userId: user.userId, title: 'Artifact OCC', workspaceMode: 'RUANG_KERJA' } });
    await prisma.artifacts.create({
      data: {
        id: artifactId, userId: user.userId, chatId, title: 'Versi awal', type: 'DOCUMENT', content: 'Isi awal', version: 1,
        versions: { create: [{ id: `${artifactId}-v1`, version: 1, title: 'Versi awal', content: 'Isi awal' }] }
      }
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await prisma.artifacts.deleteMany({ where: { id: artifactId } });
    await prisma.chats.deleteMany({ where: { id: chatId } });
    await prisma.users.deleteMany({ where: { id: user.userId } });
  });

  it('allows one concurrent versioned save, rejects its stale peer, and keeps rollback history atomic', async () => {
    const initial = await prisma.artifacts.findUniqueOrThrow({ where: { id: artifactId } });
    const sendUpdate = (content: string) => request(app)
      .put(`/api/v1/workspace/artifacts/${artifactId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ chatId, content, expectedVersion: initial.version, expectedUpdatedAt: initial.updatedAt.toISOString(), createNewVersion: true });

    const responses = await Promise.all([sendUpdate('Isi A'), sendUpdate('Isi B')]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);

    const afterRace = await prisma.artifacts.findUniqueOrThrow({ where: { id: artifactId }, include: { versions: { orderBy: { version: 'asc' } } } });
    expect(afterRace.version).toBe(2);
    expect(afterRace.versions).toHaveLength(2);
    expect(afterRace.versions[1].content).toBe(afterRace.content);

    await request(app)
      .post(`/api/v1/workspace/artifacts/${artifactId}/rollback?chatId=${chatId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetVersion: 1 })
      .expect(200);

    const restored = await prisma.artifacts.findUniqueOrThrow({ where: { id: artifactId }, include: { versions: { orderBy: { version: 'asc' } } } });
    expect(restored.version).toBe(3);
    expect(restored.content).toBe('Isi awal');
    expect(restored.versions).toHaveLength(3);
    expect(restored.versions[0].content).toBe('Isi awal');
    expect(restored.versions[2].content).toBe('Isi awal');
  });
});
