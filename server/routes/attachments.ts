import { Router, Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import multer from 'multer';
import { prisma } from '../database.js';
import { optionalAuth } from '../middleware/auth.js';
import { attachmentStorageService, MAX_FILE_SIZE, MAX_ATTACHMENTS_PER_MESSAGE } from '../services/attachmentStorageService.js';
import { documentIngestionService } from '../services/file-intelligence/documentIngestionService.js';
import { DocumentProcessingException } from '../services/file-intelligence/fileTypes.js';
import { attachmentUploadLimiter } from '../middleware/rateLimiters.js';

const router = Router();
const MAX_CONCURRENT_ATTACHMENT_UPLOADS = 4;
let activeAttachmentUploads = 0;

// Configure Multer in-memory storage with strict size and file count limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_ATTACHMENTS_PER_MESSAGE,
    fieldNameSize: 100,
    fieldSize: 4 * 1024,
    fields: 2,
    parts: MAX_ATTACHMENTS_PER_MESSAGE + 2,
    headerPairs: 100
  }
});

// Helper for sending structured error without leaking stack traces
const sendAttachmentError = (res: Response, code: string, message: string, status = 400) => {
  return res.status(status).json({
    success: false,
    code,
    message,
    error: { code, message }
  });
};

const limitConcurrentAttachmentUploads = (_req: Request, res: Response, next: NextFunction) => {
  if (activeAttachmentUploads >= MAX_CONCURRENT_ATTACHMENT_UPLOADS) {
    res.setHeader('Retry-After', '5');
    return sendAttachmentError(res, 'UPLOAD_CAPACITY', 'Server sedang memproses unggahan lain. Coba lagi sebentar.', 503);
  }

  activeAttachmentUploads += 1;
  let released = false;
  const releaseSlot = () => {
    if (released) return;
    released = true;
    activeAttachmentUploads = Math.max(0, activeAttachmentUploads - 1);
  };
  res.once('finish', releaseSlot);
  res.once('close', releaseSlot);
  next();
};

/**
 * Upload attachments endpoint (multipart/form-data)
 */
router.post(
  '/chat/attachments/upload',
  optionalAuth,
  attachmentUploadLimiter,
  limitConcurrentAttachmentUploads,
  (req: Request, res: Response, next) => {
    // Multer upload middleware handler with limit error catching
    const uploadHandler = upload.array('files', MAX_ATTACHMENTS_PER_MESSAGE);
    uploadHandler(req as any, res as any, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return sendAttachmentError(res, 'FILE_TOO_LARGE', 'Ukuran berkas melebihi batas maksimum 5MB', 400);
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return sendAttachmentError(res, 'TOO_MANY_FILES', 'Maksimal 3 lampiran diperbolehkan per pesan', 400);
          }
          if (err.code === 'LIMIT_FIELD_COUNT' || err.code === 'LIMIT_PART_COUNT') {
            return sendAttachmentError(res, 'TOO_MANY_FORM_FIELDS', 'Data formulir unggahan melebihi batas.', 400);
          }
          if (err.code === 'LIMIT_FIELD_VALUE') {
            return sendAttachmentError(res, 'FORM_FIELD_TOO_LARGE', 'Nilai formulir unggahan terlalu besar.', 400);
          }
          if (err.code === 'LIMIT_FIELD_KEY') {
            return sendAttachmentError(res, 'FORM_FIELD_NAME_TOO_LONG', 'Nama kolom formulir terlalu panjang.', 400);
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return sendAttachmentError(res, 'INVALID_FILE_FIELD', 'Kolom lampiran tidak valid atau jumlah lampiran melebihi batas.', 400);
          }
          return sendAttachmentError(res, 'UPLOAD_ERROR', 'Permintaan unggahan tidak valid.', 400);
        }
        return sendAttachmentError(res, 'UPLOAD_FAILED', 'Gagal memproses unggahan.', 400);
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId || 'guest';
      const files = (req.files as Express.Multer.File[]) || [];
      const { chatId } = req.body;

      // Validate chat ownership if chatId is provided
      if (chatId) {
        const chat = await prisma.chats.findUnique({
          where: { id: chatId }
        });
        if (chat) {
          // Check ownership: chat must belong to authenticated user (or both guest)
          if (chat.userId !== userId) {
            return sendAttachmentError(res, 'UNAUTHORIZED_ACCESS', 'Anda tidak memiliki akses ke percakapan ini.', 403);
          }
        } else if (userId !== 'guest') {
          // If chatId specified for authenticated user doesn't exist yet, return 404
          return sendAttachmentError(res, 'NOT_FOUND', 'Percakapan tujuan tidak ditemukan.', 404);
        }
      }

      // Handle raw buffer or single file fallback if uploaded as single file 'file'
      let fileList = files;
      if (!fileList.length && (req as any).file) {
        fileList = [(req as any).file];
      }

      if (!fileList || fileList.length === 0) {
        return sendAttachmentError(res, 'EMPTY_FILE', 'Tidak ada berkas yang diunggah', 400);
      }

      if (fileList.length > MAX_ATTACHMENTS_PER_MESSAGE) {
        return sendAttachmentError(res, 'TOO_MANY_FILES', 'Maksimal 3 lampiran diperbolehkan per pesan', 400);
      }

      const savedAttachments = [];
      const processingController = new AbortController();
      const abortProcessingOnDisconnect = () => {
        if (!res.writableEnded) processingController.abort();
      };
      res.once('close', abortProcessingOnDisconnect);

      for (const file of fileList) {
        try {
          const saved = await documentIngestionService.ingestFile({
            userId,
            buffer: file.buffer,
            originalFilename: file.originalname,
            clientMime: file.mimetype,
            chatId,
            abortSignal: processingController.signal
          });

          savedAttachments.push({
            id: saved.id,
            filename: saved.filename,
            mimeType: saved.mimeType,
            fileKind: saved.fileKind || 'text',
            size: saved.size,
            status: saved.status || 'ready',
            pageCount: saved.pageCount,
            slideCount: saved.slideCount,
            sheetCount: saved.sheetCount,
            url: saved.url || `/api/v1/chat/attachments/${saved.id}`
          });
        } catch (fileErr: any) {
          let code = 'INVALID_FILE';
          let msg = fileErr.safeMessage || fileErr.message || 'Berkas tidak valid.';

          if (fileErr instanceof DocumentProcessingException) {
            if (fileErr.code === 'FILE_TOO_LARGE') code = 'FILE_TOO_LARGE';
            else if (fileErr.code === 'EMPTY_FILE') code = 'EMPTY_FILE';
            else if (fileErr.code === 'SECURITY_REJECTED') code = 'SECURITY_REJECTED';
            else if (fileErr.code === 'SIGNATURE_MISMATCH') code = 'SIGNATURE_MISMATCH';
            else if (fileErr.code === 'MIME_MISMATCH') code = 'MIME_MISMATCH';
            else if (fileErr.code === 'UNSUPPORTED_FORMAT') code = 'UNSUPPORTED_TYPE';
            else if (fileErr.code === 'ARCHIVE_TOO_LARGE') code = 'ARCHIVE_TOO_LARGE';
            else if (fileErr.code === 'PROCESSING_ABORTED') code = 'PROCESSING_ABORTED';
            else if (fileErr.code === 'OWNERSHIP_ERROR') code = 'UNAUTHORIZED_ACCESS';
            else code = fileErr.code;
          } else {
            const rawMessage = fileErr.message || '';
            const parts = rawMessage.split(':');
            const rawCode = parts[0] ? parts[0].trim() : 'INVALID_FILE';
            msg = parts.slice(1).join(':').trim() || fileErr.message || 'Berkas tidak valid.';

            if (rawCode === 'FILE_TOO_LARGE') code = 'FILE_TOO_LARGE';
            else if (rawCode === 'EMPTY_FILE') code = 'EMPTY_FILE';
            else if (rawCode === 'SECURITY_REJECTED' || rawCode.startsWith('PROMPT_INJECTION')) code = 'SECURITY_REJECTED';
            else if (rawCode === 'SIGNATURE_MISMATCH' || rawCode === 'INVALID_FILE_SIGNATURE') code = 'SIGNATURE_MISMATCH';
            else if (rawCode === 'MIME_MISMATCH' || rawCode === 'EXTENSION_MIMETYPE_MISMATCH') code = 'MIME_MISMATCH';
            else if (rawCode === 'UNSUPPORTED_FORMAT') code = 'UNSUPPORTED_TYPE';
          }

          // Safe metadata log only
          console.warn(`[ATTACHMENT_UPLOAD_REJECTED] code=${code} size=${file.size}`);
          return sendAttachmentError(res, code, msg, 400);
        }
      }

      return res.status(201).json({
        success: true,
        attachments: savedAttachments,
        attachment: savedAttachments[0]
      });
    } catch (err: any) {
      console.error('[ATTACHMENT_UPLOAD_FATAL_ERROR]', err?.message || 'Unknown error');
      return sendAttachmentError(res, 'UPLOAD_FAILED', 'Terjadi kesalahan saat memproses unggahan lampiran', 500);
    }
  }
);

/** List metadata for documents in an owned Workspace conversation. */
router.get('/chat/:chatId/attachments', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || 'guest';
    const chatId = req.params.chatId;
    const chat = await prisma.chats.findFirst({ where: { id: chatId, userId } });
    if (!chat) return sendAttachmentError(res, 'NOT_FOUND', 'Ruang Kerja tidak ditemukan.', 404);

    const attachments = await prisma.attachments.findMany({
      where: { chatId, userId },
      select: {
        id: true, filename: true, mimeType: true, fileKind: true, size: true,
        status: true, checksum: true, metadata: true, processingError: true, createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });
    return res.json({
      success: true,
      attachments: attachments.map(attachment => {
        let metadata: Record<string, unknown> = {};
        try { metadata = attachment.metadata ? JSON.parse(attachment.metadata) as Record<string, unknown> : {}; } catch { /* ignore malformed optional metadata */ }
        return {
          id: attachment.id,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          fileKind: attachment.fileKind || 'text',
          size: attachment.size,
          status: attachment.status,
          checksum: attachment.checksum || undefined,
          pageCount: metadata.pageCount,
          slideCount: metadata.slideCount,
          sheetCount: metadata.sheetCount,
          errorMessage: attachment.processingError || undefined,
          url: `/api/v1/chat/attachments/${attachment.id}`,
          createdAt: attachment.createdAt.toISOString()
        };
      })
    });
  } catch (error) {
    console.error('[WORKSPACE_ATTACHMENT_LIST_FAILED]', error);
    return sendAttachmentError(res, 'ATTACHMENT_LIST_FAILED', 'Gagal memuat dokumen Workspace.', 500);
  }
});

/**
 * Status check endpoint for asynchronous / progressive file processing
 */
router.get('/chat/attachments/:id/status', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || 'guest';
    const attachmentId = req.params.id;

    if (!attachmentId) {
      return sendAttachmentError(res, 'MISSING_ATTACHMENT_ID', 'ID Lampiran tidak ditemukan', 400);
    }

    const { documentIngestionService } = await import('../services/file-intelligence/documentIngestionService.js');
    const statusDto = await documentIngestionService.getAttachmentStatus(attachmentId, userId);

    if (!statusDto) {
      return sendAttachmentError(res, 'NOT_FOUND', 'Berkas lampiran tidak ditemukan', 404);
    }

    return res.json({
      success: true,
      attachment: statusDto
    });
  } catch (err: any) {
    if (err.message.includes('OWNERSHIP_ERROR') || err.message.includes('UNAUTHORIZED')) {
      return sendAttachmentError(res, 'UNAUTHORIZED_ACCESS', 'Anda tidak memiliki akses ke status berkas ini', 403);
    }
    return sendAttachmentError(res, 'STATUS_CHECK_FAILED', 'Gagal memeriksa status pemrosesan berkas', 500);
  }
});

/**
 * Retry processing endpoint for failed documents
 */
router.post('/chat/attachments/:id/retry', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || 'guest';
    const attachmentId = req.params.id;

    if (!attachmentId) {
      return sendAttachmentError(res, 'MISSING_ATTACHMENT_ID', 'ID Lampiran tidak ditemukan', 400);
    }

    const { documentIngestionService } = await import('../services/file-intelligence/documentIngestionService.js');
    const retriedDto = await documentIngestionService.retryProcessing(attachmentId, userId);

    return res.json({
      success: true,
      message: 'Pemrosesan ulang berkas berhasil',
      attachment: retriedDto
    });
  } catch (err: any) {
    if (err.message.includes('OWNERSHIP_ERROR')) {
      return sendAttachmentError(res, 'UNAUTHORIZED_ACCESS', 'Anda tidak berhak memproses ulang berkas ini', 403);
    }
    if (err.message.includes('PROCESSING_IN_PROGRESS')) {
      return sendAttachmentError(res, 'PROCESSING_IN_PROGRESS', 'Dokumen sedang diproses, mohon tunggu.', 409);
    }
    return sendAttachmentError(res, 'RETRY_FAILED', err.safeMessage || err.message || 'Gagal memproses ulang berkas', 400);
  }
});

/**
 * Download/view attachment file endpoint
 * Validates ownership and sends secure HTTP headers with sanitized Content-Disposition
 */
router.get('/chat/attachments/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || 'guest';
    const attachmentId = req.params.id;

    if (!attachmentId) {
      return sendAttachmentError(res, 'MISSING_ATTACHMENT_ID', 'ID Lampiran tidak ditemukan', 400);
    }

    const result = await attachmentStorageService.getAttachmentForUser(attachmentId, userId, false);

    if (!result) {
      return sendAttachmentError(res, 'NOT_FOUND', 'Berkas lampiran tidak ditemukan', 404);
    }

    const { attachment, buffer } = result;

    // Sanitize filename to prevent HTTP Header Injection / Response Splitting
    const safeAsciiFilename = (attachment.filename || 'attachment.bin')
      .replace(/["\r\n\0\\]/g, '_')
      .trim();
    const encodedFilename = encodeURIComponent(attachment.filename || 'attachment.bin');

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    res.once('finish', () => buffer.fill(0));
    res.once('close', () => buffer.fill(0));
    Readable.from([buffer]).pipe(res);
    return;
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
router.delete('/chat/attachments/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || 'guest';
    const attachmentId = req.params.id;

    if (!attachmentId) {
      return sendAttachmentError(res, 'MISSING_ATTACHMENT_ID', 'ID Lampiran tidak ditemukan', 400);
    }

    const success = await attachmentStorageService.deleteAttachment(attachmentId, userId);
    if (!success) {
      return sendAttachmentError(res, 'NOT_FOUND', 'Berkas lampiran tidak ditemukan', 404);
    }

    return res.json({ success: true, message: 'Berkas berhasil dihapus' });
  } catch (err: any) {
    if (err.message.includes('UNAUTHORIZED_ACCESS') || err.message.includes('OWNERSHIP_ERROR')) {
      return sendAttachmentError(res, 'UNAUTHORIZED_ACCESS', 'Anda tidak berhak menghapus berkas ini', 403);
    }
    return sendAttachmentError(res, 'DELETE_ATTACHMENT_FAILED', 'Gagal menghapus berkas lampiran', 500);
  }
});

export default router;
