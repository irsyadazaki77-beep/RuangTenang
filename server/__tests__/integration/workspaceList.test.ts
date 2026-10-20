import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import workspaceRouter from '../../routes/workspace.js';
import { prisma, serverDb } from '../../database.js';
import { encryptionService } from '../../services/encryptionService.js';

describe('Workspace list pagination', () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/v1/workspace', workspaceRouter);

  const userId = 'usr-workspace-list-test';
  const otherUserId = 'usr-workspace-list-other';
  const workspaceIds = ['chat-workspace-list-a', 'chat-workspace-list-b', 'chat-workspace-list-c'];
  const searchTaskIds = ['search-task-own'];
  const searchArtifactIds = ['search-artifact-own', 'search-artifact-other'];
  const searchAttachmentIds = ['search-file-own', 'search-file-other'];
  const jwtSecret = process.env.JWT_SECRET || 'test_jwt_secret_workspace_list';
  const token = jwt.sign({ userId, email: 'list@example.com', role: 'mahasiswa', sessionId: 'sess-workspace-list' }, jwtSecret, { issuer: 'ruangtenang', audience: 'ruangtenang-web', algorithm: 'HS256' });

  beforeAll(() => {
    vi.spyOn(serverDb, 'isSessionActive').mockResolvedValue(true);
    vi.spyOn(serverDb, 'getUserById').mockImplementation(async (id: string) => id === userId || id === otherUserId ? ({
      id, name: 'Workspace List Test', email: `${id}@example.com`, role: 'mahasiswa', tier: 'Free', createdAt: new Date().toISOString()
    } as any) : null);
  });

  afterAll(async () => {
    await prisma.attachments.deleteMany({ where: { id: { in: searchAttachmentIds } } });
    await prisma.artifacts.deleteMany({ where: { id: { in: searchArtifactIds } } });
    await prisma.workspaceTasks.deleteMany({ where: { id: { in: searchTaskIds } } });
    await prisma.chats.deleteMany({ where: { id: { in: workspaceIds } } });
    await prisma.users.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    process.env.JWT_SECRET = jwtSecret;
    await prisma.attachments.deleteMany({ where: { id: { in: searchAttachmentIds } } });
    await prisma.artifacts.deleteMany({ where: { id: { in: searchArtifactIds } } });
    await prisma.workspaceTasks.deleteMany({ where: { id: { in: searchTaskIds } } });
    await prisma.chats.deleteMany({ where: { id: { in: workspaceIds } } });
    await prisma.users.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
    await prisma.users.createMany({ data: [
      { id: userId, name: 'Workspace List Test', email: 'list@example.com', passwordHash: 'dummy' },
      { id: otherUserId, name: 'Other Workspace User', email: 'other-list@example.com', passwordHash: 'dummy' }
    ] });
    await prisma.chats.createMany({ data: [
      { id: workspaceIds[0], userId, title: 'Workspace A', workspaceMode: 'RUANG_KERJA' },
      { id: workspaceIds[1], userId, title: 'Workspace B', workspaceMode: 'RUANG_KERJA', isPinned: true },
      { id: workspaceIds[2], userId: otherUserId, title: 'Private Workspace', workspaceMode: 'RUANG_KERJA' }
    ] });
    await prisma.workspaces.createMany({ data: workspaceIds.map(chatId => ({ chatId })) });
  });

  it('returns lightweight user-scoped pages with a usable next offset', async () => {
    const first = await request(app).get('/api/v1/workspace?offset=0&limit=1').set('Cookie', [`token=${token}`]);
    const second = await request(app).get(`/api/v1/workspace?offset=${first.body.data.nextOffset}&limit=1`).set('Cookie', [`token=${token}`]);

    expect(first.status).toBe(200);
    expect(first.body.data).toMatchObject({ hasMore: true, nextOffset: 1 });
    expect(first.body.data.items).toHaveLength(1);
    expect(first.body.data.items[0]).not.toHaveProperty('tasks');
    expect(second.status).toBe(200);
    expect(second.body.data).toMatchObject({ hasMore: false, nextOffset: 2 });
    expect(new Set([...first.body.data.items, ...second.body.data.items].map((item: { chatId: string }) => item.chatId))).toEqual(new Set(workspaceIds.slice(0, 2)));
  });

  it('rejects invalid pagination limits', async () => {
    const response = await request(app).get('/api/v1/workspace?limit=101').set('Cookie', [`token=${token}`]);
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('WORKSPACE_LIST_PAGINATION_INVALID');
  });

  it('scans older encrypted-message rows with a bounded, user-scoped cursor', async () => {
    const previousKey = process.env.DATA_ENCRYPTION_KEY;
    process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 'c').toString('base64');
    try {
      await prisma.chats.update({ where: { id: workspaceIds[0] }, data: { title: encryptionService.encryptRequiredSensitive('needle workspace') } });
      await prisma.workspaceTasks.create({ data: { id: searchTaskIds[0], workspaceId: workspaceIds[0], title: encryptionService.encryptRequiredSensitive('needle task') } });
      await prisma.chatMessages.createMany({ data: [
        ...Array.from({ length: 27 }, (_, index) => ({
          id: `search-msg-${String(index).padStart(3, '0')}`,
          chatId: workspaceIds[0], role: 'user', content: index === 26 ? 'needle in an older message' : 'ordinary workspace message'
        })),
        { id: 'search-msg-outsider', chatId: workspaceIds[2], role: 'user', content: 'needle private to another user' }
      ] });

      const first = await request(app).get('/api/v1/workspace/search?q=needle').set('Cookie', [`token=${token}`]);
      expect(first.status).toBe(200);
      expect(first.body.data).toMatchObject({ hasMore: true });
      expect(first.body.data.nextCursor).toEqual(expect.any(String));
      expect(first.body.data.items.map((item: { kind: string; itemId?: string; chatId: string }) => item.itemId || item.chatId)).toContain(workspaceIds[0]);
      expect(first.body.data.items.map((item: { kind: string; itemId?: string }) => item.itemId)).toContain(searchTaskIds[0]);
      expect(first.body.data.items.map((item: { itemId?: string }) => item.itemId)).not.toContain('search-msg-outsider');

      const second = await request(app).get(`/api/v1/workspace/search?q=needle&cursor=${encodeURIComponent(first.body.data.nextCursor)}`).set('Cookie', [`token=${token}`]);
      expect(second.status).toBe(200);
      expect(second.body.data.hasMore).toBe(false);
      expect(second.body.data.items.map((item: { itemId: string }) => item.itemId)).toEqual(['search-msg-026']);

      const mismatched = await request(app).get(`/api/v1/workspace/search?q=other&cursor=${encodeURIComponent(first.body.data.nextCursor)}`).set('Cookie', [`token=${token}`]);
      expect(mismatched.status).toBe(400);
      expect(mismatched.body.code).toBe('WORKSPACE_SEARCH_CURSOR_INVALID');
    } finally {
      if (previousKey === undefined) delete process.env.DATA_ENCRYPTION_KEY;
      else process.env.DATA_ENCRYPTION_KEY = previousKey;
    }
  });

  it('searches artifact content and file names only within the owner’s Workspace', async () => {
    const previousKey = process.env.DATA_ENCRYPTION_KEY;
    process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 'c').toString('base64');
    try {
      await prisma.artifacts.createMany({ data: [
        { id: 'search-artifact-own', chatId: workspaceIds[0], userId, title: encryptionService.encryptRequiredSensitive('Catatan kuliah'), type: 'DOCUMENT', content: encryptionService.encryptRequiredSensitive('needle in encrypted content') },
        { id: 'search-artifact-other', chatId: workspaceIds[2], userId: otherUserId, title: encryptionService.encryptRequiredSensitive('Private note'), type: 'DOCUMENT', content: encryptionService.encryptRequiredSensitive('needle must stay private') }
      ] });
      await prisma.attachments.createMany({ data: [
        { id: 'search-file-own', chatId: workspaceIds[0], userId, filename: 'needle-notes.pdf', mimeType: 'application/pdf', size: 10, data: 'private-test-path' },
        { id: 'search-file-other', chatId: workspaceIds[2], userId: otherUserId, filename: 'needle-private.pdf', mimeType: 'application/pdf', size: 10, data: 'private-test-path' }
      ] });

      const response = await request(app).get('/api/v1/workspace/search?q=needle').set('Cookie', [`token=${token}`]);
      expect(response.status).toBe(200);
      expect(response.body.data.hasMore).toBe(false);
      expect(response.body.data.items.map((item: { kind: string; itemId: string }) => `${item.kind}:${item.itemId}`).sort()).toEqual([
        'artifact:search-artifact-own', 'file:search-file-own'
      ].sort());
    } finally {
      if (previousKey === undefined) delete process.env.DATA_ENCRYPTION_KEY;
      else process.env.DATA_ENCRYPTION_KEY = previousKey;
    }
  });
});
