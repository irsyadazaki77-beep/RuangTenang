import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { prisma, serverDb } from '../../database.js';
import chatRouter from '../../routes/chat.js';
import attachmentsRouter from '../../routes/attachments.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-ruangtenang';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', chatRouter);
app.use('/api', attachmentsRouter);

const generateToken = (user: any) => jwt.sign({ ...user, sessionId: "test-session" }, JWT_SECRET, { issuer: 'ruangtenang', audience: 'ruangtenang-web', algorithm: 'HS256' });

describe('DELETE /api/chat/:id/messages (Clear Chat Messages) Integration Tests', () => {
  const student1 = { userId: 'usr-student-chat-1', name: 'Budi Santoso', email: 'budi.chat1@univ.ac.id', role: 'mahasiswa' };
  const student2 = { userId: 'usr-student-chat-2', name: 'Siti Rahma', email: 'siti.chat2@univ.ac.id', role: 'mahasiswa' };

  const student1Token = generateToken(student1);
  const student2Token = generateToken(student2);

  beforeAll(async () => {
    vi.spyOn(serverDb, 'isSessionActive').mockResolvedValue(true);
    vi.spyOn(serverDb, 'getUserById').mockImplementation(async userId => ({
      id: userId,
      name: userId === student1.userId ? student1.name : student2.name,
      email: userId === student1.userId ? student1.email : student2.email,
      passwordHash: 'hash',
      role: 'mahasiswa',
      tier: 'Free',
      university: 'Test University',
      createdAt: new Date().toISOString()
    }));

    // Clean up test records
    await prisma.chatMessages.deleteMany({
      where: {
        chatId: { in: ['chat-test-1', 'chat-test-2'] }
      }
    });
    await prisma.artifacts.deleteMany({ where: { id: 'artifact-chat-test-1' } });
    await prisma.chats.deleteMany({
      where: {
        id: { in: ['chat-test-1', 'chat-test-2'] }
      }
    });
    await prisma.users.deleteMany({
      where: {
        id: { in: [student1.userId, student2.userId] }
      }
    });

    // Seed users
    await prisma.users.createMany({
      data: [
        { id: student1.userId, name: student1.name, email: student1.email, passwordHash: 'hash', role: 'mahasiswa', tier: 'Free' },
        { id: student2.userId, name: student2.name, email: student2.email, passwordHash: 'hash', role: 'mahasiswa', tier: 'Free' },
      ]
    });

    // Seed chats
    await prisma.chats.createMany({
      data: [
        { id: 'chat-test-1', userId: student1.userId, title: 'Chat Budi' },
        { id: 'chat-test-2', userId: student2.userId, title: 'Chat Siti' },
      ]
    });

    // Seed some messages
    await prisma.chatMessages.createMany({
      data: [
        { id: 'msg-1', chatId: 'chat-test-1', role: 'user', content: 'Halo' },
        { id: 'msg-2', chatId: 'chat-test-1', role: 'model', content: 'Halo juga' },
        { id: 'msg-3', chatId: 'chat-test-2', role: 'user', content: 'Hai' },
      ]
    });
    await prisma.artifacts.create({
      data: {
        id: 'artifact-chat-test-1',
        chatId: 'chat-test-1',
        userId: student1.userId,
        title: 'Draft tetap ada',
        type: 'DOCUMENT',
        content: 'Isi artefak tetap utuh',
        versions: {
          create: [{ id: 'version-chat-test-1', version: 1, title: 'Draft tetap ada', content: 'Isi artefak tetap utuh' }]
        }
      }
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await prisma.artifacts.deleteMany({ where: { id: 'artifact-chat-test-1' } });
    await prisma.chatMessages.deleteMany({
      where: {
        chatId: { in: ['chat-test-1', 'chat-test-2'] }
      }
    });
    await prisma.chats.deleteMany({
      where: {
        id: { in: ['chat-test-1', 'chat-test-2'] }
      }
    });
    await prisma.users.deleteMany({
      where: {
        id: { in: [student1.userId, student2.userId] }
      }
    });
  });

  it('lists attachments only to the owner of the Workspace conversation', async () => {
    const chatOwnership = vi.spyOn(prisma.chats, 'findFirst').mockImplementation((async ({ where }) =>
      where.userId === student2.userId ? { id: 'chat-test-2', userId: student2.userId } as never : null
    ) as never);
    const attachmentList = vi.spyOn(prisma.attachments, 'findMany').mockResolvedValue([{
      id: 'attachment-workspace-list-test', filename: 'rubrik.pdf', mimeType: 'application/pdf', fileKind: 'pdf',
      size: 128, status: 'ready', checksum: 'checksum', metadata: null, processingError: null, createdAt: new Date()
    } as never]);
    try {
      await request(app)
        .get('/api/chat/chat-test-2/attachments')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(404);

      const response = await request(app)
        .get('/api/chat/chat-test-2/attachments')
        .set('Authorization', `Bearer ${student2Token}`)
        .expect(200);
      expect(response.body.attachments).toEqual([
        expect.objectContaining({ id: 'attachment-workspace-list-test', filename: 'rubrik.pdf', fileKind: 'pdf' })
      ]);
    } finally {
      chatOwnership.mockRestore();
      attachmentList.mockRestore();
    }
  });

  it('allows owner to clear chat messages successfully', async () => {
    const res = await request(app)
      .delete('/api/chat/chat-test-1/messages')
      .set('Authorization', `Bearer ${student1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const messages = await prisma.chatMessages.findMany({
      where: { chatId: 'chat-test-1' }
    });
    expect(messages.length).toBe(0);

    const reload = await request(app)
      .get('/api/chat/chat-test-1/messages')
      .set('Authorization', `Bearer ${student1Token}`);
    expect(reload.status).toBe(200);
    expect(reload.body.data).toHaveLength(0);

    const artifact = await prisma.artifacts.findUnique({
      where: { id: 'artifact-chat-test-1' },
      include: { versions: true }
    });
    expect(artifact?.content).toBe('Isi artefak tetap utuh');
    expect(artifact?.versions).toHaveLength(1);
    expect(artifact?.versions[0].content).toBe('Isi artefak tetap utuh');
  });

  it('treats repeated clear requests as idempotent', async () => {
    const res = await request(app)
      .delete('/api/chat/chat-test-1/messages')
      .set('Authorization', `Bearer ${student1Token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(await prisma.chatMessages.count({ where: { chatId: 'chat-test-1' } })).toBe(0);
    expect(await prisma.artifacts.count({ where: { id: 'artifact-chat-test-1' } })).toBe(1);
  });

  it('rejects deletion if request is made by a non-owner student', async () => {
    const res = await request(app)
      .delete('/api/chat/chat-test-2/messages')
      .set('Authorization', `Bearer ${student1Token}`); // student1 trying to delete student2's chat

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');

    const messages = await prisma.chatMessages.findMany({
      where: { chatId: 'chat-test-2' }
    });
    expect(messages.length).toBeGreaterThan(0);
  });

  it('rejects deletion if request is unauthenticated', async () => {
    const res = await request(app)
      .delete('/api/chat/chat-test-2/messages');

    expect(res.status).toBe(401);
  });
});
