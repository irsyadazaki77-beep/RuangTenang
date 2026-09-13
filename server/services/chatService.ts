import { scanAndSanitizePII } from './piiService.js';
import { detectPromptInjection, sanitizeInput } from '../security.js';
import { encryptionService } from './encryptionService.js';
import { chatRepository, SEARCH_RESULT_CAP } from '../repositories/chatRepository.js';
import { prisma } from '../database.js';
import { sessionSummaryService, StructuredSessionSummary } from './sessionSummaryService.js';

export class ChatService {
  static async getUserChats(userId: string, limit = 100, offset = 0) {
    const chats = await chatRepository.getUserChats(userId, limit, offset);
    
    // Decrypt titles
    return chats.map(c => ({
      ...c,
      title: encryptionService.decryptSensitive(c.title) || c.title
    }));
  }

  static async getChatMessages(chatId: string, limit = 50, cursor?: string) {
    const messages = await chatRepository.getChatMessages(chatId, limit, cursor);

    let nextCursor = null;
    let records = messages;
    if (messages.length > limit) {
      records = messages.slice(0, limit);
      nextCursor = records[records.length - 1]?.id || null;
    }

    const decryptedData = records.reverse().map(m => ({
      ...m,
      content: encryptionService.decryptSensitive(m.content) || m.content
    }));

    return {
      data: decryptedData,
      nextCursor
    };
  }

  static async updateTitle(chatId: string, title: string) {
    const encryptedTitle = encryptionService.encryptSensitive(title.substring(0, 100)) || title.substring(0, 100);
    return await chatRepository.updateTitle(chatId, encryptedTitle);
  }

  static async togglePin(chatId: string) {
    const chat = await chatRepository.findChatById(chatId);
    if (!chat) return null;
    return await chatRepository.updatePinStatus(chatId, !chat.isPinned);
  }

  static async toggleArchive(chatId: string, isArchived: boolean) {
    return await chatRepository.updateArchiveStatus(chatId, isArchived);
  }

  static async deleteChat(chatId: string) {
    return await chatRepository.deleteChat(chatId);
  }

  static async searchChats(userId: string, query: string) {
    if (!query) return [];
    
    // Safety capped search over encrypted chat titles
    const allChats = await chatRepository.getChatsForSearch(userId);

    const lowerQuery = query.toLowerCase();
    const matchedChats = allChats.map(c => ({
      ...c,
      title: encryptionService.decryptSensitive(c.title) || c.title
    })).filter(c => c.title.toLowerCase().includes(lowerQuery));

    return matchedChats.slice(0, SEARCH_RESULT_CAP);
  }

  /**
   * Search messages within a specific conversation
   */
  static async searchMessagesInChat(userId: string, chatId: string, query: string, limit = 50) {
    if (!query || query.trim().length === 0) return [];
    const chat = await prisma.chats.findFirst({ where: { id: chatId, userId } });
    if (!chat) throw new Error('CHAT_NOT_FOUND');

    const messages = await prisma.chatMessages.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' }
    });

    const lowerQuery = query.toLowerCase().trim();
    const results: Array<{
      id: string;
      role: string;
      content: string;
      snippet: string;
      createdAt: Date;
    }> = [];

    for (const m of messages) {
      const decrypted = encryptionService.decryptSensitive(m.content) || m.content;
      const lowerContent = decrypted.toLowerCase();
      const matchIndex = lowerContent.indexOf(lowerQuery);
      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 40);
        const end = Math.min(decrypted.length, matchIndex + query.length + 60);
        let snippet = decrypted.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < decrypted.length) snippet = snippet + '...';

        results.push({
          id: m.id,
          role: m.role,
          content: decrypted,
          snippet,
          createdAt: m.createdAt
        });

        if (results.length >= limit) break;
      }
    }

    return results;
  }

  /**
   * Branch a conversation starting up to a specific message.
   * Keeps the original chat intact.
   */
  static async branchChat(userId: string, parentChatId: string, messageId: string, customTitle?: string) {
    const parentChat = await chatRepository.findChatById(parentChatId);
    if (!parentChat || parentChat.userId !== userId) {
      throw new Error('PARENT_CHAT_NOT_FOUND');
    }

    const targetMsg = await prisma.chatMessages.findFirst({
      where: { id: messageId, chatId: parentChatId }
    });
    if (!targetMsg) {
      throw new Error('MESSAGE_NOT_FOUND');
    }

    const messagesToClone = await prisma.chatMessages.findMany({
      where: {
        chatId: parentChatId,
        createdAt: { lte: targetMsg.createdAt }
      },
      orderBy: { createdAt: 'asc' }
    });

    const parentDecryptedTitle = encryptionService.decryptSensitive(parentChat.title) || parentChat.title;
    const newChatTitle = customTitle?.trim() || `Cabang: ${parentDecryptedTitle}`;
    const newChatId = `chat_${Date.now()}_b${Math.random().toString(36).substring(2, 7)}`;

    const newChat = await prisma.$transaction(async (tx) => {
      const createdChat = await tx.chats.create({
        data: {
          id: newChatId,
          userId,
          title: encryptionService.encryptSensitive(newChatTitle) || newChatTitle,
          parentChatId,
          branchedFromMessageId: messageId,
          useMemory: parentChat.useMemory
        }
      });

      for (let i = 0; i < messagesToClone.length; i++) {
        const orig = messagesToClone[i];
        await tx.chatMessages.create({
          data: {
            id: `msg_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
            chatId: newChatId,
            role: orig.role,
            content: orig.content,
            plugin: orig.plugin,
            createdAt: new Date(orig.createdAt.getTime() + i)
          }
        });
      }

      return createdChat;
    });

    return {
      ...newChat,
      title: newChatTitle,
      parentChatTitle: parentDecryptedTitle
    };
  }

  /**
   * Bookmarks management with strict ownership validation
   */
  static async getUserBookmarks(userId: string, limit = 50, cursor?: string) {
    const rawBookmarks = await chatRepository.getUserBookmarks(userId, limit, cursor);
    return rawBookmarks.map(b => ({
      id: b.id,
      userId: b.userId,
      chatId: b.chatId,
      messageId: b.messageId,
      createdAt: b.createdAt,
      chatTitle: encryptionService.decryptSensitive(b.chat.title) || b.chat.title,
      message: {
        id: b.message.id,
        role: b.message.role,
        content: encryptionService.decryptSensitive(b.message.content) || b.message.content,
        createdAt: b.message.createdAt
      }
    }));
  }

  static async addBookmark(userId: string, chatId: string, messageId: string) {
    const chat = await prisma.chats.findFirst({ where: { id: chatId, userId } });
    if (!chat) throw new Error('CHAT_NOT_FOUND');
    
    const msg = await prisma.chatMessages.findFirst({ where: { id: messageId, chatId } });
    if (!msg) throw new Error('MESSAGE_NOT_FOUND');

    return await chatRepository.addBookmark(userId, chatId, messageId);
  }

  static async removeBookmark(userId: string, messageId: string) {
    return await chatRepository.removeBookmark(userId, messageId);
  }

  static async getUserBookmarkedMessageIds(userId: string, chatId?: string) {
    return await chatRepository.getUserBookmarkedMessageIds(userId, chatId);
  }

  /**
   * Session Summary management
   */
  static async getChatSummary(userId: string, chatId: string) {
    const chat = await prisma.chats.findFirst({ where: { id: chatId, userId } });
    if (!chat) throw new Error('CHAT_NOT_FOUND');
    if (!chat.summary) return null;
    try {
      return JSON.parse(chat.summary);
    } catch {
      return null;
    }
  }

  static async generateChatSummary(userId: string, chatId: string, force = false): Promise<StructuredSessionSummary> {
    const chat = await prisma.chats.findFirst({ where: { id: chatId, userId } });
    if (!chat) throw new Error('CHAT_NOT_FOUND');

    if (chat.summary && !force) {
      try {
        const parsed = JSON.parse(chat.summary);
        if (parsed.masalahUtama) return parsed;
      } catch {}
    }

    const rawMessages = await prisma.chatMessages.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' }
    });

    const decryptedMessages = rawMessages.map(m => ({
      role: m.role,
      content: encryptionService.decryptSensitive(m.content) || m.content
    }));

    const summary = await sessionSummaryService.generateSummary(userId, decryptedMessages);
    const summaryJson = JSON.stringify(summary);

    await chatRepository.saveChatSummary(chatId, summaryJson);
    return summary;
  }

  /**
   * Chat Memory Preference
   */
  static async updateChatMemoryPreference(userId: string, chatId: string, useMemory: boolean) {
    const chat = await prisma.chats.findFirst({ where: { id: chatId, userId } });
    if (!chat) throw new Error('CHAT_NOT_FOUND');

    return await chatRepository.updateChatMemoryPreference(chatId, useMemory);
  }

  /**
   * Process user input with security, PII scanning, and create database record
   */
  static processUserInput(content: string, maxLength: number = 1000) {
    const rawSanitized = sanitizeInput(content, maxLength);
    const piiResult = scanAndSanitizePII(rawSanitized);
    const isSuspicious = detectPromptInjection(piiResult.sanitizedText);

    return {
      cleanMessage: piiResult.sanitizedText,
      sanitizedContent: piiResult.sanitizedText,
      hasPii: piiResult.hasPii,
      piiTypes: piiResult.detectedTypes,
      isSuspicious
    };
  }
}
