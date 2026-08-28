import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { prisma, serverDb } from '../database.js';
import chatRouter from '../routes/chat.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-ruangtenang';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', chatRouter);

const generateToken = (user: any) => jwt.sign({ ...user, sessionId: "test-session" }, JWT_SECRET, { issuer: 'ruangtenang', audience: 'ruangtenang-web', algorithm: 'HS256' });

describe('DELETE /api/chat/:id/messages (Clear Chat Messages) Integration Tests', () => {
  const student1 = { userId: 'usr-student-chat-1', name: 'Budi Santoso', email: 'budi.chat1@univ.ac.id', role: 'mahasiswa' };
  const student2 = { userId: 'usr-student-chat-2', name: 'Siti Rahma', email: 'siti.chat2@univ.ac.id', role: 'mahasiswa' };

  const student1Token = generateToken(student1);
  const student2Token = generateToken(student2);

  beforeAll(async () => {
    vi.spyOn(serverDb, 'isSessionActive').mockResolvedValue(true);

    // Clean up test records
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
  });

  afterAll(async () => {
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
