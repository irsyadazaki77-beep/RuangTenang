import { Request, Response } from 'express';
import { ChatService } from '../services/chatService.js';
import { DEFAULT_AI_MODEL, AVAILABLE_AI_MODELS } from '../config/aiConfig.js';

export class ChatController {
  static getModels(_req: Request, res: Response) {
    return res.json({
      defaultModel: DEFAULT_AI_MODEL,
      models: AVAILABLE_AI_MODELS
    });
  }

  static async getHistory(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const chats = await ChatService.getUserChats(userId, limit, offset);
      return res.json(chats);
    } catch (e) {
      return res.status(500).json({ success: false, code: 'FETCH_HISTORY_FAILED', message: 'Gagal mengambil riwayat percakapan' });
    }
  }

  static async getMessages(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const cursor = req.query.cursor as string;
      const result = await ChatService.getChatMessages(req.params.id, limit, cursor);
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ success: false, code: 'FETCH_MESSAGES_FAILED', message: 'Gagal mengambil pesan percakapan' });
    }
  }

  static async updateTitle(req: Request, res: Response) {
    try {
      const { title } = req.body;
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ success: false, code: 'INVALID_INPUT', message: 'Judul tidak valid' });
      }
      await ChatService.updateTitle(req.params.id, title);
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false, code: 'UPDATE_TITLE_FAILED', message: 'Gagal memperbarui judul' });
    }
  }

  static async togglePin(req: Request, res: Response) {
    try {
      const updated = await ChatService.togglePin(req.params.id);
      if (!updated) {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Percakapan tidak ditemukan' });
      }
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false, code: 'TOGGLE_PIN_FAILED', message: 'Gagal menyematkan percakapan' });
    }
  }

  static async toggleArchive(req: Request, res: Response) {
    try {
      const { isArchived } = req.body;
      await ChatService.toggleArchive(req.params.id, !!isArchived);
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false, code: 'ARCHIVE_CHAT_FAILED', message: 'Gagal mengarsipkan percakapan' });
    }
  }

  static async deleteChat(req: Request, res: Response) {
    try {
      await ChatService.deleteChat(req.params.id);
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false, code: 'DELETE_CHAT_FAILED', message: 'Gagal menghapus percakapan' });
    }
  }

  static async search(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const q = req.query.q as string;
      const chats = await ChatService.searchChats(userId, q);
      return res.json(chats);
    } catch (e) {
      return res.status(500).json({ success: false, code: 'SEARCH_FAILED', message: 'Gagal melakukan pencarian' });
    }
  }

  static async searchInChat(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const chatId = req.params.id;
      const q = (req.query.q as string) || '';
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
      const results = await ChatService.searchMessagesInChat(userId, chatId, q, limit);
      return res.json({ success: true, results });
    } catch (e: any) {
      if (e.message === 'CHAT_NOT_FOUND') {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Percakapan tidak ditemukan' });
      }
      return res.status(500).json({ success: false, code: 'SEARCH_IN_CHAT_FAILED', message: 'Gagal mencari dalam percakapan' });
    }
  }

  static async branchChat(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const parentChatId = req.params.id;
      const { messageId, title } = req.body;

      if (!messageId || typeof messageId !== 'string') {
        return res.status(400).json({ success: false, code: 'INVALID_INPUT', message: 'messageId diperlukan' });
      }

      const branchedChat = await ChatService.branchChat(userId, parentChatId, messageId, title);
      return res.status(201).json({ success: true, chat: branchedChat });
    } catch (e: any) {
      if (e.message === 'PARENT_CHAT_NOT_FOUND') {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Percakapan asal tidak ditemukan atau bukan milik Anda' });
      }
      if (e.message === 'MESSAGE_NOT_FOUND') {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Pesan titik cabang tidak ditemukan' });
      }
      return res.status(500).json({ success: false, code: 'BRANCH_FAILED', message: 'Gagal membuat cabang percakapan' });
    }
  }

  static async getBookmarks(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 50;
      const cursor = req.query.cursor as string | undefined;
      const bookmarks = await ChatService.getUserBookmarks(userId, limit, cursor);
      return res.json({ success: true, bookmarks });
    } catch (e) {
      return res.status(500).json({ success: false, code: 'FETCH_BOOKMARKS_FAILED', message: 'Gagal mengambil pesan tersimpan' });
    }
  }

  static async addBookmark(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { chatId, messageId } = req.body;

      if (!chatId || !messageId) {
        return res.status(400).json({ success: false, code: 'INVALID_INPUT', message: 'chatId dan messageId diperlukan' });
      }

      const bookmark = await ChatService.addBookmark(userId, chatId, messageId);
      return res.status(201).json({ success: true, bookmark });
    } catch (e: any) {
      if (e.message === 'CHAT_NOT_FOUND' || e.message === 'MESSAGE_NOT_FOUND') {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Pesan atau percakapan tidak ditemukan' });
      }
      return res.status(500).json({ success: false, code: 'ADD_BOOKMARK_FAILED', message: 'Gagal menyimpan pesan' });
    }
  }

  static async removeBookmark(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const messageId = req.params.messageId || (req.query.messageId as string);

      if (!messageId) {
        return res.status(400).json({ success: false, code: 'INVALID_INPUT', message: 'messageId diperlukan' });
      }

      await ChatService.removeBookmark(userId, messageId);
      return res.json({ success: true, message: 'Pesan berhasil dihapus dari simpanan' });
    } catch (e) {
      return res.status(500).json({ success: false, code: 'REMOVE_BOOKMARK_FAILED', message: 'Gagal menghapus pesan tersimpan' });
    }
  }

  static async getBookmarkedIds(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const chatId = req.query.chatId as string;
      const ids = await ChatService.getUserBookmarkedMessageIds(userId, chatId);
      return res.json({ success: true, bookmarkedMessageIds: ids });
    } catch (e) {
      return res.status(500).json({ success: false, code: 'FETCH_BOOKMARKED_IDS_FAILED', message: 'Gagal mengambil daftar ID simpanan' });
    }
  }

  static async getSummary(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const chatId = req.params.id;
      const summary = await ChatService.getChatSummary(userId, chatId);
      return res.json({ success: true, summary });
    } catch (e: any) {
      if (e.message === 'CHAT_NOT_FOUND') {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Percakapan tidak ditemukan' });
      }
      return res.status(500).json({ success: false, code: 'GET_SUMMARY_FAILED', message: 'Gagal mengambil ringkasan sesi' });
    }
  }

  static async generateSummary(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const chatId = req.params.id;
      const force = req.body?.force === true;
      const summary = await ChatService.generateChatSummary(userId, chatId, force);
      return res.json({ success: true, summary });
    } catch (e: any) {
      if (e.message === 'CHAT_NOT_FOUND') {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Percakapan tidak ditemukan' });
      }
      return res.status(500).json({ success: false, code: 'GENERATE_SUMMARY_FAILED', message: 'Gagal membuat ringkasan sesi' });
    }
  }

  static async updateMemoryPreference(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const chatId = req.params.id;
      const { useMemory } = req.body;

      if (typeof useMemory !== 'boolean') {
        return res.status(400).json({ success: false, code: 'INVALID_INPUT', message: 'useMemory harus bernilai boolean' });
      }

      await ChatService.updateChatMemoryPreference(userId, chatId, useMemory);
      return res.json({ success: true, useMemory });
    } catch (e: any) {
      if (e.message === 'CHAT_NOT_FOUND') {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Percakapan tidak ditemukan' });
      }
      return res.status(500).json({ success: false, code: 'UPDATE_MEMORY_PREF_FAILED', message: 'Gagal memperbarui preferensi memori' });
    }
  }
}
