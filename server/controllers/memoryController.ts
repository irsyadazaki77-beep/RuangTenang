import { Request, Response } from 'express';
import { prisma } from '../database.js';
import { encryptionService } from '../services/encryptionService.js';
import { consentService } from '../services/consentService.js';

const sendError = (res: Response, code: string, message: string, status = 500) => {
  res.status(status).json({ 
    success: false, 
    code, 
    message,
    error: { code, message }
  });
};

export class MemoryController {
  static async getMemories(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const memories = await prisma.userMemories.findMany({ where: { userId } });
      const decryptedMemories = memories.map(m => ({
        ...m,
        content: encryptionService.decryptSensitive(m.content) || m.content
      }));
      res.json(decryptedMemories);
    } catch (e) {
      sendError(res, 'FETCH_MEMORIES_FAILED', 'Gagal mengambil memori');
    }
  }

  static async createMemory(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const isConsentGiven = await consentService.canUseMemoriesForAI(userId);
      if (!isConsentGiven) {
        return sendError(res, 'CONSENT_REQUIRED', 'Penyimpanan memori AI dinonaktifkan dalam izin privasi Anda.', 403);
      }

      const { content } = req.body;
      if (!content || typeof content !== 'string') return sendError(res, 'INVALID_INPUT', 'Konten tidak valid', 400);
      const safeContent = content.substring(0, 500);
      const memory = await prisma.userMemories.create({
        data: { id: `mem_${Date.now()}`, userId, content: encryptionService.encryptSensitive(safeContent) || safeContent }
      });
      res.json({ ...memory, content: safeContent });
    } catch (e) {
      sendError(res, 'CREATE_MEMORY_FAILED', 'Gagal menyimpan memori');
    }
  }

  static async updateMemory(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { content, isActive } = req.body;
      const memory = await prisma.userMemories.findFirst({ where: { id: req.params.id, userId } });
      if (!memory) return sendError(res, 'NOT_FOUND', 'Memori tidak ditemukan', 404);

      let updatedContent = memory.content;
      let safeContent = typeof content === 'string' ? content.substring(0, 500) : null;
      
      if (safeContent) {
        updatedContent = encryptionService.encryptSensitive(safeContent) || safeContent;
      } else {
        safeContent = encryptionService.decryptSensitive(memory.content) || memory.content;
      }

      const updated = await prisma.userMemories.update({
        where: { id: req.params.id },
        data: {
          ...(typeof content === 'string' ? { content: updatedContent } : {}),
          ...(typeof isActive === 'boolean' ? { isActive } : {})
        }
      });
      res.json({ ...updated, content: safeContent });
    } catch (e) {
      sendError(res, 'UPDATE_MEMORY_FAILED', 'Gagal memperbarui memori');
    }
  }

  static async deleteMemory(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const result = await prisma.userMemories.deleteMany({ where: { id: req.params.id, userId } });
      if (result.count === 0) return sendError(res, 'NOT_FOUND', 'Memori tidak ditemukan', 404);
      res.json({ success: true });
    } catch (e) {
      sendError(res, 'DELETE_MEMORY_FAILED', 'Gagal menghapus memori');
    }
  }

  static async deleteAllMemories(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      await prisma.userMemories.deleteMany({ where: { userId } });
      res.json({ success: true });
    } catch (e) {
      sendError(res, 'DELETE_MEMORIES_FAILED', 'Gagal menghapus semua memori');
    }
  }
}
