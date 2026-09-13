import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { prisma, serverDb } from '../../database.js';
import chatRouter from '../../routes/chat.js';
import { chatSummarizer } from '../../services/ai/chatSummarizer.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-ruangtenang';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', chatRouter);
app.use('/api/v1', chatRouter);

const generateToken = (user: any) =>
  jwt.sign({ ...user, sessionId: 'test-session-core' }, JWT_SECRET, {
    issuer: 'ruangtenang',
    audience: 'ruangtenang-web',
    algorithm: 'HS256',
  });

describe('Core Chat Refactor Integration Tests', () => {
  const userA = { userId: 'usr-core-alice', name: 'Alice Core', email: 'alice.core@univ.ac.id', role: 'mahasiswa' };
  const userB = { userId: 'usr-core-bob', name: 'Bob Core', email: 'bob.core@univ.ac.id', role: 'mahasiswa' };

  const tokenA = generateToken(userA);
  const tokenB = generateToken(userB);

  const longChatId = 'chat-core-long-1';
  const unauthorizedChatId = 'chat-core-bob-1';

  beforeAll(async () => {
    vi.spyOn(serverDb, 'isSessionActive').mockResolvedValue(true);

    // Clean up
    await prisma.messageBookmarks.deleteMany({
      where: { userId: { in: [userA.userId, userB.userId] } }
    });
    await prisma.chatMessages.deleteMany({
      where: { chatId: { in: [longChatId, unauthorizedChatId] } }
    });
    await prisma.chats.deleteMany({
      where: { id: { in: [longChatId, unauthorizedChatId] } }
    });
    await prisma.users.deleteMany({
      where: { id: { in: [userA.userId, userB.userId] } }
    });

    // Create users
    await prisma.users.createMany({
      data: [
        { id: userA.userId, name: userA.name, email: userA.email, passwordHash: 'hash', role: 'mahasiswa', tier: 'Free' },
        { id: userB.userId, name: userB.name, email: userB.email, passwordHash: 'hash', role: 'mahasiswa', tier: 'Free' }
      ]
    });

    // Create chats
    await prisma.chats.createMany({
      data: [
        { id: longChatId, userId: userA.userId, title: 'Alice Long Conversation' },
        { id: unauthorizedChatId, userId: userB.userId, title: 'Bob Private Conversation' }
      ]
    });

    // Seed 25 messages in longChatId to test long chat, pagination, and backend search
    const messagesData = [];
    for (let i = 1; i <= 25; i++) {
      messagesData.push({
        id: `msg_long_${i}`,
        chatId: longChatId,
        role: i % 2 === 1 ? 'user' : 'assistant',
        content: i === 5 ? 'Kata kunci rahasia skripsi di pesanke-5' : `Pesan percakapan ke-${i} tentang tugas dan kecemasan perkuliahan`,
        createdAt: new Date(Date.now() - (26 - i) * 60000)
      });
    }

    // Add a message in Bob's chat
    messagesData.push({
      id: 'msg_bob_1',
      chatId: unauthorizedChatId,
      role: 'user',
      content: 'Pesan rahasia Bob',
      createdAt: new Date()
    });

    await prisma.chatMessages.createMany({ data: messagesData });
  });

  describe('1. Long Chat & Summary Token Budgeting', () => {
    it('summarizes older history incrementally and calculates tokens saved', async () => {
      chatSummarizer.clearCache(longChatId);

      const history = await prisma.chatMessages.findMany({
        where: { chatId: longChatId },
        orderBy: { createdAt: 'asc' }
      });

      const res = await chatSummarizer.getOrUpdateSummary(longChatId, history.map(m => ({ id: m.id, role: m.role as any, content: m.content })));

      expect(res.summary).toBeTruthy();
      expect(res.tokensSaved).toBeGreaterThan(0);
      expect(res.lastSummarizedMsgId).toBeTruthy();
    });
  });

  describe('2. Message Pagination', () => {
    it('supports cursor-based pagination for chat messages', async () => {
      const page1 = await request(app)
        .get(`/api/v1/chat/${longChatId}/messages?limit=10`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(page1.status).toBe(200);
      const items1 = page1.body.data?.data || page1.body.data || page1.body.messages || page1.body;
      const list1 = Array.isArray(items1) ? items1 : (items1.data || []);
      expect(list1.length).toBe(10);

      const nextCursor = page1.body.nextCursor || page1.body.data?.nextCursor;
      expect(nextCursor).toBeTruthy();

      const page2 = await request(app)
        .get(`/api/v1/chat/${longChatId}/messages?limit=10&cursor=${nextCursor}`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(page2.status).toBe(200);
      const items2 = page2.body.data?.data || page2.body.data || page2.body.messages || page2.body;
      const list2 = Array.isArray(items2) ? items2 : (items2.data || []);
      expect(list2.length).toBe(10);
    });
  });

  describe('3. Ownership Validation & IDOR Prevention', () => {
    it('denies user A access to user B chat messages', async () => {
      const res = await request(app)
        .get(`/api/v1/chat/${unauthorizedChatId}/messages`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('denies user A branching user B chat', async () => {
      const res = await request(app)
        .post(`/api/v1/chat/${unauthorizedChatId}/branch`)
        .set('Cookie', [`token=${tokenA}`])
        .send({ messageId: 'msg_bob_1', title: 'Illegal Branch' });

      expect(res.status).toBe(404);
    });

    it('denies user A searching inside user B chat', async () => {
      const res = await request(app)
        .get(`/api/v1/chat/${unauthorizedChatId}/search?q=rahasia`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(404);
    });
  });

  describe('4. Backend Search Across Entire Conversation History', () => {
    it('searches full conversation history in DB including non-recent messages', async () => {
      const res = await request(app)
        .get(`/api/v1/chat/${longChatId}/search?q=skripsi`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const results = res.body.results || res.body.data?.results;
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('msg_long_5');
    });
  });

  describe('5. Session Summary Generation & Forced Regeneration', () => {
    it('generates structured session summary and handles force refresh', async () => {
      const res1 = await request(app)
        .get(`/api/v1/chat/${longChatId}/summary`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(res1.status).toBe(200);

      const res2 = await request(app)
        .post(`/api/v1/chat/${longChatId}/summary`)
        .set('Cookie', [`token=${tokenA}`])
        .send({ force: true });

      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.summary?.masalahUtama).toBeTruthy();
    });
  });

  describe('6. Deleted Message Handling', () => {
    it('handles message deletion gracefully and cleans up search matches', async () => {
      // Delete message msg_long_5
      await prisma.chatMessages.delete({ where: { id: 'msg_long_5' } });

      const searchRes = await request(app)
        .get(`/api/v1/chat/${longChatId}/search?q=skripsi`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(searchRes.status).toBe(200);
      const results = searchRes.body.results || searchRes.body.data?.results;
      expect(results.length).toBe(0);
    });
  });
});
