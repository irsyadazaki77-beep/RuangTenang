import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { chatsFindFirst, artifactsFindMany, artifactsFindFirst, artifactsFindUnique, artifactsCreate, artifactsUpdate, artifactsDelete } = vi.hoisted(() => ({
  chatsFindFirst: vi.fn(), artifactsFindMany: vi.fn(), artifactsFindFirst: vi.fn(),
  artifactsFindUnique: vi.fn(), artifactsCreate: vi.fn(), artifactsUpdate: vi.fn(), artifactsDelete: vi.fn()
}));

vi.mock('../../database.js', () => ({ prisma: {
  chats: { findFirst: chatsFindFirst },
  artifacts: { findMany: artifactsFindMany, findFirst: artifactsFindFirst, findUnique: artifactsFindUnique, create: artifactsCreate, update: artifactsUpdate, delete: artifactsDelete }
} }));
vi.mock('../../middleware/auth.js', () => ({ requireAuth: (req: any, _res: any, next: () => void) => {
  req.user = { userId: req.header('x-test-user') || 'user-a' };
  next();
} }));
vi.mock('../../services/encryptionService.js', () => ({ encryptionService: {
  encryptSensitive: (value: string) => value,
  decryptSensitive: (value: string) => value
} }));
vi.mock('../../security.js', () => ({ sanitizeInput: (value: string) => value }));

import workspaceArtifactsRouter from '../../routes/workspaceArtifacts.js';

const app = express();
app.use(express.json());
app.use('/api/v1/workspace/artifacts', workspaceArtifactsRouter);

describe('Workspace artifact ownership and scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatsFindFirst.mockImplementation(({ where }: any) => where.userId === 'user-a' && where.id === 'chat-a' ? { id: 'chat-a' } : null);
    artifactsFindMany.mockResolvedValue([]);
    artifactsFindFirst.mockResolvedValue(null);
    artifactsFindUnique.mockResolvedValue(null);
    artifactsCreate.mockImplementation(({ data }: any) => ({ ...data, versions: [] }));
    artifactsUpdate.mockImplementation(({ data }: any) => data);
  });

  it('requires an owned chat for scoped fetches and creation', async () => {
    await request(app).get('/api/v1/workspace/artifacts').set('x-test-user', 'user-a').expect(400);
    await request(app).get('/api/v1/workspace/artifacts?chatId=chat-b').set('x-test-user', 'user-a').expect(404);
    await request(app).post('/api/v1/workspace/artifacts').set('x-test-user', 'user-a').send({
      id: 'art-orphan', title: 'Tanpa workspace', type: 'DOCUMENT', content: 'x'
    }).expect(400);
    await request(app).post('/api/v1/workspace/artifacts').set('x-test-user', 'user-a').send({
      id: 'art-cross-user', chatId: 'chat-b', title: 'Tidak boleh', type: 'DOCUMENT', content: 'x'
    }).expect(404);
    expect(artifactsCreate).not.toHaveBeenCalled();
  });

  it('creates an artifact only in the caller-owned Workspace', async () => {
    const response = await request(app).post('/api/v1/workspace/artifacts').set('x-test-user', 'user-a').send({
      id: 'art_owned', chatId: 'chat-a', title: 'Draf', type: 'DOCUMENT', content: 'Isi'
    }).expect(200);
    expect(artifactsCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ id: 'art_owned', chatId: 'chat-a', userId: 'user-a' }) }));
    expect(response.body.data.chatId).toBe('chat-a');
  });

  it('queries only the authenticated user and requested chat', async () => {
    await request(app).get('/api/v1/workspace/artifacts?chatId=chat-a').set('x-test-user', 'user-a').expect(200);
    expect(artifactsFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-a', chatId: 'chat-a' } }));
  });

  it('rejects relinking an owned artifact into another user’s chat', async () => {
    artifactsFindFirst.mockResolvedValue({ id: 'art-owned', userId: 'user-a', chatId: 'chat-a', title: 'Draf', type: 'DOCUMENT', language: null, content: 'Isi', version: 1, updatedAt: new Date(), versions: [] });
    await request(app).put('/api/v1/workspace/artifacts/art-owned').set('x-test-user', 'user-a').send({ chatId: 'chat-b', content: 'Isi baru' }).expect(404);
    expect(artifactsUpdate).not.toHaveBeenCalled();
  });

  it('scopes delete to the requested Workspace and confirms only after DB deletion', async () => {
    const artifact = { id: 'art-owned', userId: 'user-a', chatId: 'chat-a' };
    artifactsFindFirst.mockResolvedValue(artifact);
    await request(app).delete('/api/v1/workspace/artifacts/art-owned?chatId=chat-b').set('x-test-user', 'user-a').expect(404);
    expect(artifactsDelete).not.toHaveBeenCalled();

    artifactsDelete.mockResolvedValue(artifact);
    const response = await request(app).delete('/api/v1/workspace/artifacts/art-owned?chatId=chat-a').set('x-test-user', 'user-a').expect(200);
    expect(artifactsDelete).toHaveBeenCalledWith({ where: { id: 'art-owned' } });
    expect(response.body).toEqual({ success: true, message: 'Artefak berhasil dihapus' });
  });
});
