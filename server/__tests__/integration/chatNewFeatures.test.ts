import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { prisma, serverDb } from '../../database.js';
import chatRouter from '../../routes/chat.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-ruangtenang';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', chatRouter);

const generateToken = (user: any) =>
  jwt.sign({ ...user, sessionId: 'test-session' }, JWT_SECRET, {
    issuer: 'ruangtenang',
    audience: 'ruangtenang-web',
    algorithm: 'HS256',
  });

describe('New Features Integration & Security Tests', () => {
  const userA = { userId: 'usr-nf-alice', name: 'Alice Student', email: 'alice.nf@univ.ac.id', role: 'mahasiswa' };
  const userB = { userId: 'usr-nf-bob', name: 'Bob Student', email: 'bob.nf@univ.ac.id', role: 'mahasiswa' };

  const tokenA = generateToken(userA);
  const tokenB = generateToken(userB);

  const chatAId = 'chat-nf-alice-1';
  const chatBId = 'chat-nf-bob-1';

  beforeAll(async () => {
    vi.spyOn(serverDb, 'isSessionActive').mockResolvedValue(true);

    // Clean up past records
    await prisma.chatMessages.deleteMany({
      where: { chatId: { in: [chatAId, chatBId] } }
    });
    await prisma.chats.deleteMany({
      where: { id: { in: [chatAId, chatBId] } }
    });
    await prisma.users.deleteMany({
      where: { id: { in: [userA.userId, userB.userId] } }
    });

    // Seed users
    await prisma.users.createMany({
      data: [
        { id: userA.userId, name: userA.name, email: userA.email, passwordHash: 'hash', role: 'mahasiswa', tier: 'Free' },
        { id: userB.userId, name: userB.name, email: userB.email, passwordHash: 'hash', role: 'mahasiswa', tier: 'Free' }
      ]
    });

    // Seed chats
    await prisma.chats.createMany({
      data: [
        { id: chatAId, userId: userA.userId, title: 'Alice Therapy Chat' },
        { id: chatBId, userId: userB.userId, title: 'Bob Counseling Chat' }
      ]
    });

    // Seed messages for Alice
    await prisma.chatMessages.createMany({
      data: [
        { id: 'msg-a-1', chatId: chatAId, role: 'user', content: 'Saya merasa lelah dan sulit fokus belajar ujian.', createdAt: new Date('2026-01-01T10:00:00Z') },
        { id: 'msg-a-2', chatId: chatAId, role: 'assistant', content: 'Terima kasih telah berbagi. Rasa lelah menjelang ujian sangat wajar.', createdAt: new Date('2026-01-01T10:01:00Z') },
        { id: 'msg-a-3', chatId: chatAId, role: 'user', content: 'Apakah ada teknik belajar yang tidak membebani?', createdAt: new Date('2026-01-01T10:02:00Z') },
        { id: 'msg-a-4', chatId: chatAId, role: 'assistant', content: 'Cobalah teknik Pomodoro 25 menit dengan istirahat 5 menit.', createdAt: new Date('2026-01-01T10:03:00Z') }
      ]
    });
  });

  describe('Feature 1: Smart Session Summary', () => {
    it('generates a structured session summary with non-medical disclaimer', async () => {
      const res = await request(app)
        .post(`/api/chat/${chatAId}/summary`)
        .set('Cookie', [`token=${tokenA}`])
        .send({ force: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary).toBeDefined();
      expect(Array.isArray(res.body.summary.emosi)).toBe(true);
      expect(res.body.summary.disclaimer).toContain('diagnosis medis');
    });

    it('prevents IDOR: user B cannot summarize user A chat', async () => {
      const res = await request(app)
        .post(`/api/chat/${chatAId}/summary`)
        .set('Cookie', [`token=${tokenB}`])
        .send();

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Feature 2: Bookmarks / Save Message', () => {
    it('allows user A to bookmark a message from their chat', async () => {
      const res = await request(app)
        .post(`/api/chat/${chatAId}/bookmarks`)
        .set('Cookie', [`token=${tokenA}`])
        .send({ messageId: 'msg-a-4' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('lists user A saved messages', async () => {
      const res = await request(app)
        .get('/api/chat/bookmarks')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.bookmarks)).toBe(true);
      expect(res.body.bookmarks.length).toBeGreaterThan(0);
      expect(res.body.bookmarks[0].messageId).toBe('msg-a-4');
    });

    it('prevents IDOR: user B cannot bookmark user A message', async () => {
      const res = await request(app)
        .post(`/api/chat/${chatAId}/bookmarks`)
        .set('Cookie', [`token=${tokenB}`])
        .send({ messageId: 'msg-a-4' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('allows user A to delete bookmark', async () => {
      const res = await request(app)
        .delete('/api/chat/bookmarks/msg-a-4')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Feature 3: Branch Chat', () => {
    let newBranchedChatId = '';

    it('allows user A to branch a chat starting from msg-a-2', async () => {
      const res = await request(app)
        .post(`/api/chat/${chatAId}/branch`)
        .set('Cookie', [`token=${tokenA}`])
        .send({ messageId: 'msg-a-2', title: 'Cabang Refleksi Alice' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.chat).toBeDefined();
      expect(res.body.chat.parentChatId).toBe(chatAId);
      expect(res.body.chat.title).toBe('Cabang Refleksi Alice');
      newBranchedChatId = res.body.chat.id;

      // Verify the new chat contains exactly 2 messages (msg-a-1 and msg-a-2)
      const messagesRes = await request(app)
        .get(`/api/chat/${newBranchedChatId}/messages`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(messagesRes.status).toBe(200);
      expect(messagesRes.body.data.length).toBe(2);
      expect(messagesRes.body.data[0].content).toContain('Saya merasa lelah');
      expect(messagesRes.body.data[1].content).toContain('Terima kasih telah berbagi');
    });

    it('prevents IDOR: user B cannot branch user A chat', async () => {
      const res = await request(app)
        .post(`/api/chat/${chatAId}/branch`)
        .set('Cookie', [`token=${tokenB}`])
        .send({ messageId: 'msg-a-2', title: 'Hacked Branch' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Feature 4: AI Memory / Context Control', () => {
    let createdMemoryId = '';

    it('allows user to save memory item', async () => {
      const res = await request(app)
        .post('/api/chat/user-memories')
        .set('Cookie', [`token=${tokenA}`])
        .send({ content: 'Lebih suka teknik pernapasan daripada meditasi panjang' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.memory).toBeDefined();
      createdMemoryId = res.body.memory.id;
    });

    it('lists user memories', async () => {
      const res = await request(app)
        .get('/api/chat/user-memories')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.memories)).toBe(true);
      expect(res.body.memories.some((m: any) => m.id === createdMemoryId)).toBe(true);
    });

    it('prevents IDOR: user B cannot view user A memories', async () => {
      const res = await request(app)
        .get('/api/chat/user-memories')
        .set('Cookie', [`token=${tokenB}`]);

      expect(res.status).toBe(200);
      expect(res.body.memories.some((m: any) => m.id === createdMemoryId)).toBe(false);
    });

    it('allows user to delete memory item', async () => {
      const res = await request(app)
        .delete(`/api/chat/user-memories/${createdMemoryId}`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Feature 5: In-Conversation Search', () => {
    it('searches messages by query inside own chat', async () => {
      const res = await request(app)
        .get(`/api/chat/${chatAId}/search?q=Pomodoro`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.results.length).toBe(1);
      expect(res.body.results[0].content).toContain('Pomodoro');
    });

    it('prevents IDOR: user B cannot search user A messages', async () => {
      const res = await request(app)
        .get(`/api/chat/${chatAId}/search?q=Pomodoro`)
        .set('Cookie', [`token=${tokenB}`]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
