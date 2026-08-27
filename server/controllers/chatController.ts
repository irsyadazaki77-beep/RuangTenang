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
      const chats = await ChatService.getUserChats(userId);
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
}
