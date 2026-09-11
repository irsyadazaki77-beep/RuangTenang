import { scanAndSanitizePII } from './piiService.js';
import { detectPromptInjection, sanitizeInput } from '../security.js';
import { encryptionService } from './encryptionService.js';
import { chatRepository, SEARCH_RESULT_CAP } from '../repositories/chatRepository.js';

export class ChatService {
  static async getUserChats(userId: string) {
    const chats = await chatRepository.getUserChats(userId);
    
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
