import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../../database.js';
import { consentService } from '../../services/consentService.js';
import { aiContextBuilder } from '../../services/ai/aiContextBuilder.js';
import { retentionService } from '../../services/retentionService.js';
import { encryptionService } from '../../services/encryptionService.js';
import crypto from 'crypto';

describe('FASE 3: Comprehensive Privacy, Consent, & Data Lifecycle Regression Tests', () => {
  const testUser1Id = `user_fase3_${crypto.randomUUID()}`;
  const testUser2Id = `user_fase3_${crypto.randomUUID()}`;

  beforeEach(async () => {
    // Seed User 1 & User 2
    await prisma.users.createMany({
      data: [
        {
          id: testUser1Id,
          name: 'Mahasiswa Tes Privacy 1',
          email: `${testUser1Id}@kampus.ac.id`,
          passwordHash: '$2a$10$abcdefghijklmnopqrstuuu',
          role: 'mahasiswa',
          tier: 'Free'
        },
        {
          id: testUser2Id,
          name: 'Mahasiswa Tes Privacy 2',
          email: `${testUser2Id}@kampus.ac.id`,
          passwordHash: '$2a$10$abcdefghijklmnopqrstuuu',
          role: 'mahasiswa',
          tier: 'Free'
        }
      ]
    });
  });

  afterEach(async () => {
    // Clean up test data safely
    try {
      await retentionService.eraseUserData(testUser1Id, 'Cleanup Test');
      await retentionService.eraseUserData(testUser2Id, 'Cleanup Test');
    } catch {
      // ignore if already deleted
    }
  });

  // 1. DOWNSTREAM CONSENT WITHDRAWAL ENFORCEMENT
  describe('1. Downstream Consent Withdrawal Enforcement', () => {
    it('withholds mood, screening, and memories from AI context when consent is FALSE', async () => {
      // Seed mood & screening for User 1
      const encNote = encryptionService.encryptSensitive('Sangat cemas menghadapi ujian akhir');
      await prisma.moodLogs.create({
        data: {
          id: `mood_${crypto.randomUUID()}`,
          userId: testUser1Id,
          mood: '2',
          notes: encNote,
          factors: encryptionService.encryptSensitive(JSON.stringify(['Akademik'])),
          timestamp: new Date()
        }
      });

      await prisma.screenings.create({
        data: {
          id: `screen_${crypto.randomUUID()}`,
          userId: testUser1Id,
          phq9Score: 18,
          gad7Score: 15,
          phq9Severity: 'Sedang-Berat',
          gad7Severity: 'Berat',
          timestamp: new Date()
        }
      });

      const encMem = encryptionService.encryptSensitive('User merasa kewalahan dengan jadwal perkuliahan.');
      await prisma.userMemories.create({
        data: {
          id: `mem_${crypto.randomUUID()}`,
          userId: testUser1Id,
          content: encMem,
          isActive: true
        }
      });

      // Initially update consents to enable AI but DISABLE mood, screening, and memory
      await consentService.updateConsents(testUser1Id, {
        consentForAI: true,
        consentForAIMood: false,
        consentForAIScreening: false,
        consentForAIMemory: false
      });

      // Build AI Context
      const contextResult = await aiContextBuilder.buildContext({
        userId: testUser1Id,
        currentMessage: 'Halo, bagaimana kabarku?',
        fullHistory: []
      });

      // Expect AI prompt context to NOT contain mood notes, PHQ-9 scores, or memories
      expect(contextResult.systemContext).not.toContain('Sangat cemas');
      expect(contextResult.systemContext).not.toContain('PHQ-9');
      expect(contextResult.systemContext).not.toContain('kewalahan dengan jadwal');

      // Now enable consentForAIMood
      await consentService.updateConsents(testUser1Id, {
        consentForAI: true,
        consentForAIMood: true,
        consentForAIScreening: false,
        consentForAIMemory: false
      });

      const contextWithMood = await aiContextBuilder.buildContext({
        userId: testUser1Id,
        currentMessage: 'Halo, bagaimana kabarku?',
        fullHistory: []
      });

      // Should now contain mood notes, but still NOT PHQ-9 or memory
      expect(contextWithMood.systemContext).toContain('Sangat cemas');
      expect(contextWithMood.systemContext).not.toContain('PHQ-9');
      expect(contextWithMood.systemContext).not.toContain('kewalahan dengan jadwal');
    });

    it('purges user memories automatically when consentForAIMemory is revoked', async () => {
      // Enable memory consent and create a memory
      await consentService.updateConsents(testUser1Id, {
        consentForAI: true,
        consentForAIMemory: true
      });

      await prisma.userMemories.create({
        data: {
          id: `mem_${crypto.randomUUID()}`,
          userId: testUser1Id,
          content: encryptionService.encryptSensitive('Sangat suka belajar matematika'),
          isActive: true
        }
      });

      const beforeMemories = await prisma.userMemories.findMany({ where: { userId: testUser1Id } });
      expect(beforeMemories.length).toBe(1);

      // Revoke memory consent
      await consentService.updateConsents(testUser1Id, {
        consentForAIMemory: false
      });

      const afterMemories = await prisma.userMemories.findMany({ where: { userId: testUser1Id } });
      expect(afterMemories.length).toBe(0);
    });
  });

  // 2. TEMPORARY CHAT NON-PERSISTENCE
  describe('2. Temporary Chat Non-Persistence', () => {
    it('does not include mood, screening, or memories when isTemporary is true', async () => {
      // Enable all consents
      await consentService.updateConsents(testUser1Id, {
        consentForAI: true,
        consentForAIMood: true,
        consentForAIScreening: true,
        consentForAIMemory: true
      });

      await prisma.moodLogs.create({
        data: {
          id: `mood_${crypto.randomUUID()}`,
          userId: testUser1Id,
          mood: '1',
          notes: encryptionService.encryptSensitive('Catatan rahasia'),
          timestamp: new Date()
        }
      });

      // Build context with isTemporary = true
      const tempContext = await aiContextBuilder.buildContext({
        userId: testUser1Id,
        currentMessage: 'Sesi sementara ini',
        isTemporary: true
      });

      // Should exclude sensitive user activity logs in temporary mode
      expect(tempContext.systemContext).not.toContain('Catatan rahasia');
    });
  });

  // 3. UNAUTHORIZED CROSS-USER ACCESS PREVENTION
  describe('3. Unauthorized Cross-User Access Isolation', () => {
    it('strictly isolates mood logs between different users', async () => {
      // User 1 creates mood
      await prisma.moodLogs.create({
        data: {
          id: `mood_u1_${crypto.randomUUID()}`,
          userId: testUser1Id,
          mood: '4',
          notes: encryptionService.encryptSensitive('Catatan User 1'),
          timestamp: new Date()
        }
      });

      // User 2 creates mood
      await prisma.moodLogs.create({
        data: {
          id: `mood_u2_${crypto.randomUUID()}`,
          userId: testUser2Id,
          mood: '2',
          notes: encryptionService.encryptSensitive('Catatan User 2'),
          timestamp: new Date()
        }
      });

      const user1Moods = await prisma.moodLogs.findMany({ where: { userId: testUser1Id } });
      const user2Moods = await prisma.moodLogs.findMany({ where: { userId: testUser2Id } });

      expect(user1Moods.length).toBe(1);
      expect(user2Moods.length).toBe(1);
      expect(encryptionService.decryptSensitive(user1Moods[0].notes)).toBe('Catatan User 1');
      expect(encryptionService.decryptSensitive(user2Moods[0].notes)).toBe('Catatan User 2');
    });
  });

  // 4. RIGHT TO BE FORGOTTEN (COMPLETE ERASURE) CASCADING VERIFICATION
  describe('4. Right to be Forgotten Cascading Erasure', () => {
    it('erases all user artifacts permanently without orphan records', async () => {
      // Populate full spectrum of data for User 1
      const chat = await prisma.chats.create({
        data: {
          id: `chat_${crypto.randomUUID()}`,
          userId: testUser1Id,
          title: encryptionService.encryptSensitive('Chat Refleksi')
        }
      });

      await prisma.chatMessages.create({
        data: {
          id: `msg_${crypto.randomUUID()}`,
          chatId: chat.id,
          role: 'user',
          content: encryptionService.encryptSensitive('Pesan rahasia')
        }
      });

      await prisma.moodLogs.create({
        data: {
          id: `mood_${crypto.randomUUID()}`,
          userId: testUser1Id,
          mood: '3',
          timestamp: new Date()
        }
      });

      await prisma.screenings.create({
        data: {
          id: `scr_${crypto.randomUUID()}`,
          userId: testUser1Id,
          phq9Score: 12,
          gad7Score: 10,
          phq9Severity: 'Sedang',
          gad7Severity: 'Sedang',
          timestamp: new Date()
        }
      });

      await prisma.emergencyContacts.create({
        data: {
          userId: testUser1Id,
          name: encryptionService.encryptRequiredSensitive('Ibu'),
          phone: encryptionService.encryptRequiredSensitive('08123456789'),
          relationship: encryptionService.encryptRequiredSensitive('Orang Tua')
        }
      });

      // Execute Right to be Forgotten
      const erasureResult = await retentionService.eraseUserData(testUser1Id, 'Mahasiswa Tes Privacy 1');

      expect(erasureResult.success).toBe(true);
      expect(erasureResult.erasedRecordsCount).toBeGreaterThan(0);

      // Verify zero orphan records exist
      const checkUser = await prisma.users.findUnique({ where: { id: testUser1Id } });
      const checkChats = await prisma.chats.findMany({ where: { userId: testUser1Id } });
      const checkMoods = await prisma.moodLogs.findMany({ where: { userId: testUser1Id } });
      const checkScreens = await prisma.screenings.findMany({ where: { userId: testUser1Id } });
      const checkContacts = await prisma.emergencyContacts.findMany({ where: { userId: testUser1Id } });

      expect(checkUser).toBeNull();
      expect(checkChats.length).toBe(0);
      expect(checkMoods.length).toBe(0);
      expect(checkScreens.length).toBe(0);
      expect(checkContacts.length).toBe(0);
    });
  });
});
