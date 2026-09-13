import { Router, Request, Response } from 'express';
import multer from 'multer';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { attachmentStorageService, MAX_FILE_SIZE, MAX_ATTACHMENTS_PER_MESSAGE } from '../services/attachmentStorageService.js';

const router = Router();

// Configure Multer in-memory storage with strict size and file count limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_ATTACHMENTS_PER_MESSAGE
  }
});

// Helper for sending structured error
const sendAttachmentError = (res: Response, code: string, message: string, status = 400) => {
  return res.status(status).json({
    success: false,
    code,
    message,
    error: { code, message }
  });
};

/**
 * Upload attachments endpoint (multipart/form-data)
 */
router.post(
  '/chat/attachments/upload',
  optionalAuth,
  (req: Request, res: Response, next) => {
    // Multer upload middleware handler with limit error catching
    const uploadHandler = upload.array('files', MAX_ATTACHMENTS_PER_MESSAGE);
    uploadHandler(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return sendAttachmentError(res, 'FILE_TOO_LARGE', 'Ukuran berkas melebihi batas maksimum 5MB', 400);
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return sendAttachmentError(res, 'TOO_MANY_FILES', 'Maksimal 3 lampiran diperbolehkan', 400);
          }
          return sendAttachmentError(res, 'UPLOAD_ERROR', err.message, 400);
        }
        return sendAttachmentError(res, 'UPLOAD_FAILED', err.message || 'Gagal memproses unggahan', 400);
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId || 'guest';
      const files = (req.files as Express.Multer.File[]) || [];
      const { chatId } = req.body;

      // Handle raw buffer or single file fallback if uploaded as single file 'file'
      let fileList = files;
      if (!fileList.length && (req as any).file) {
        fileList = [(req as any).file];
      }

      if (!fileList || fileList.length === 0) {
        return sendAttachmentError(res, 'NO_FILES_PROVIDED', 'Tidak ada berkas yang diunggah', 400);
      }

      if (fileList.length > MAX_ATTACHMENTS_PER_MESSAGE) {
        return sendAttachmentError(res, 'TOO_MANY_FILES', 'Maksimal 3 lampiran diperbolehkan per pesan', 400);
      }

      const savedAttachments = [];

      for (const file of fileList) {
        try {
          const saved = await attachmentStorageService.saveAttachment({
            userId,
            buffer: file.buffer,
            originalFilename: file.originalname,
            clientMime: file.mimetype,
            chatId
          });

          savedAttachments.push({
            id: saved.id,
            filename: saved.filename,
            mimeType: saved.mimeType,
            size: saved.size,
            url: `/api/v1/chat/attachments/${saved.id}`
          });
        } catch (fileErr: any) {
          console.warn(`[ATTACHMENT_UPLOAD_REJECTED] ${fileErr.message}`);
          return sendAttachmentError(
            res,
            fileErr.message.split(':')[0] || 'INVALID_FILE',
            fileErr.message.split(':').slice(1).join(':').trim() || fileErr.message,
            400
          );
        }
      }

      return res.status(201).json({
        success: true,
        attachments: savedAttachments,
        attachment: savedAttachments[0]
      });
    } catch (err: any) {
      console.error('[ATTACHMENT_UPLOAD_FATAL_ERROR]', err);
      return sendAttachmentError(res, 'INTERNAL_UPLOAD_ERROR', 'Terjadi kesalahan saat menyimpan lampiran', 500);
    }
  }
);

/**
 * Download/view attachment file endpoint
 * Validates chat ownership / IDOR access control
 */
router.get('/chat/attachments/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || 'guest';
    const attachmentId = req.params.id;

    if (!attachmentId) {
      return sendAttachmentError(res, 'MISSING_ATTACHMENT_ID', 'ID Lampiran tidak ditemukan', 400);
    }

    const result = await attachmentStorageService.getAttachmentForUser(attachmentId, userId);

    if (!result) {
      return sendAttachmentError(res, 'NOT_FOUND', 'Berkas lampiran tidak ditemukan', 404);
    }

    const { attachment, buffer } = result;

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.filename)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    return res.send(buffer);
  } catch (err: any) {
    if (err.message.includes('UNAUTHORIZED_ACCESS')) {
      return sendAttachmentError(res, 'UNAUTHORIZED_ACCESS', 'Anda tidak memiliki akses ke berkas ini', 403);
    }
    if (err.message.includes('FILE_NOT_FOUND')) {
      return sendAttachmentError(res, 'NOT_FOUND', 'Berkas tidak ditemukan pada server', 404);
    }
    return sendAttachmentError(res, 'FETCH_ATTACHMENT_FAILED', 'Gagal mengambil berkas lampiran', 500);
  }
});

/**
 * Delete attachment endpoint
 */
router.delete('/chat/attachments/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const attachmentId = req.params.id;

    const success = await attachmentStorageService.deleteAttachment(attachmentId, userId);
    if (!success) {
      return sendAttachmentError(res, 'NOT_FOUND', 'Berkas lampiran tidak ditemukan', 404);
    }

    return res.json({ success: true, message: 'Berkas berhasil dihapus' });
  } catch (err: any) {
    if (err.message.includes('UNAUTHORIZED_ACCESS')) {
      return sendAttachmentError(res, 'UNAUTHORIZED_ACCESS', 'Anda tidak berhak menghapus berkas ini', 403);
    }
    return sendAttachmentError(res, 'DELETE_ATTACHMENT_FAILED', 'Gagal menghapus berkas lampiran', 500);
  }
});

export default router;
