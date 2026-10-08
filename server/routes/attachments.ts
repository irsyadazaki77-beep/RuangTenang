import { Router, Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import crypto from 'crypto';
import multer from 'multer';
import { prisma } from '../database.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { encryptionService } from '../services/encryptionService.js';
import { attachmentStorageService, MAX_FILE_SIZE } from '../services/attachmentStorageService.js';
import { documentIngestionService } from '../services/file-intelligence/documentIngestionService.js';
import { DocumentProcessingException } from '../services/file-intelligence/fileTypes.js';
import { attachmentUploadLimiter } from '../middleware/rateLimiters.js';
import { MAX_ATTACHMENT_UPLOAD_BATCH, MAX_WORKSPACE_ACTIVE_ATTACHMENTS } from '../../shared/contracts/files.js';
import { TabularAnalysisRequestSchema, TabularTransformRequestSchema } from '../../shared/contracts/tabular.js';
import { createTabularDataset, parseTabularWorkbook, runTabularAnalysis, toSafeCsv, toSafeXlsx, previewTabularTransform } from '../services/tabularDatasetService.js';

const router = Router();
const MAX_CONCURRENT_ATTACHMENT_UPLOADS = 4;
let activeAttachmentUploads = 0;
const pendingWorkspaceAttachmentUploads = new Map<string, number>();

// Configure Multer in-memory storage with strict size and file count limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_ATTACHMENT_UPLOAD_BATCH,
    fieldNameSize: 100,
    fieldSize: 4 * 1024,
    fields: 2,
    parts: MAX_ATTACHMENT_UPLOAD_BATCH + 2,
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

async function loadOwnedTabularAttachment(attachmentId: string, userId: string) {
  let loaded: Awaited<ReturnType<typeof attachmentStorageService.getAttachmentForUser>>;
  try { loaded = await attachmentStorageService.getAttachmentForUser(attachmentId, userId, false); }
  catch { return { error: { code: 'NOT_FOUND', message: 'Dataset tidak ditemukan.', status: 404 } } as const; }
  if (!loaded) return { error: { code: 'NOT_FOUND', message: 'Dataset tidak ditemukan.', status: 404 } } as const;
  const { attachment, buffer } = loaded;
  if (attachment.status !== 'ready') {
    buffer.fill(0);
    return { error: { code: 'ATTACHMENT_NOT_READY', message: 'Dataset tersedia setelah pemrosesan selesai.', status: 409 } } as const;
  }
  if (!attachment.chatId || !['csv', 'tsv', 'xlsx'].includes((attachment.filename.split('.').pop() || '').toLowerCase())) {
    buffer.fill(0);
    return { error: { code: 'UNSUPPORTED_DATASET', message: 'Analisis tabular tersedia untuk CSV, TSV, dan XLSX.', status: 415 } } as const;
  }
  let chat;
  try { chat = await prisma.chats.findFirst({ where: { id: attachment.chatId, userId }, select: { id: true } }); }
  catch {
    buffer.fill(0);
    return { error: { code: 'NOT_FOUND', message: 'Dataset tidak ditemukan.', status: 404 } } as const;
  }
  if (!chat) {
    buffer.fill(0);
    return { error: { code: 'NOT_FOUND', message: 'Dataset tidak ditemukan.', status: 404 } } as const;
  }
  try {
    const workbook = await parseTabularWorkbook(buffer, attachment.filename);
    return { attachment, buffer, workbook } as const;
  } catch (error) {
    buffer.fill(0);
    return { error: { code: 'TABULAR_PARSE_FAILED', message: error instanceof Error ? error.message : 'Dataset gagal dibaca.', status: 422 } } as const;
  }
}

/** Structured, ownership-checked spreadsheet overview and profile. */
router.get('/chat/attachments/:id/dataset', requireAuth, async (req: Request, res: Response) => {
  const loaded = await loadOwnedTabularAttachment(req.params.id, req.user!.userId);
  if ('error' in loaded) return sendAttachmentError(res, loaded.error.code, loaded.error.message, loaded.error.status);
  try {
    const sheetName = typeof req.query.sheet === 'string' ? req.query.sheet : undefined;
    const dataset = createTabularDataset({ attachmentId: loaded.attachment.id, workspaceId: loaded.attachment.chatId!, filename: loaded.attachment.filename, checksum: loaded.attachment.checksum || '', createdAt: loaded.attachment.createdAt, workbook: loaded.workbook, sheetName });
    return res.json({ success: true, data: dataset });
  } finally { loaded.buffer.fill(0); }
});

/** Return a bounded page of structured cells; the browser never receives the full workbook. */
router.get('/chat/attachments/:id/dataset/preview', requireAuth, async (req: Request, res: Response) => {
  const loaded = await loadOwnedTabularAttachment(req.params.id, req.user!.userId);
  if ('error' in loaded) return sendAttachmentError(res, loaded.error.code, loaded.error.message, loaded.error.status);
  try {
    const requestedSheet = typeof req.query.sheet === 'string' ? req.query.sheet : loaded.workbook.activeSheet;
    const sheet = loaded.workbook.sheets.find(candidate => candidate.name === requestedSheet);
    if (!sheet) return sendAttachmentError(res, 'SHEET_NOT_FOUND', 'Sheet tidak ditemukan pada workbook ini.', 404);
    const offset = Math.max(0, Math.min(100_000, Number.parseInt(String(req.query.offset || '0'), 10) || 0));
    const limit = Math.max(1, Math.min(50, Number.parseInt(String(req.query.limit || '25'), 10) || 25));
    return res.json({ success: true, data: { sheetName: sheet.name, columns: sheet.headers, rows: sheet.rows.slice(offset, offset + limit), offset, limit, rowCount: sheet.rows.length } });
  } finally { loaded.buffer.fill(0); }
});

/** Execute a validated allowlisted aggregation in server code, never generated code. */
router.post('/chat/attachments/:id/dataset/analyze', requireAuth, async (req: Request, res: Response) => {
  const parsedPlan = TabularAnalysisRequestSchema.safeParse(req.body);
  if (!parsedPlan.success) return sendAttachmentError(res, 'INVALID_ANALYSIS_PLAN', 'Rencana analisis tidak valid.', 400);
  const loaded = await loadOwnedTabularAttachment(req.params.id, req.user!.userId);
  if ('error' in loaded) return sendAttachmentError(res, loaded.error.code, loaded.error.message, loaded.error.status);
  try {
    const result = runTabularAnalysis({ attachmentId: loaded.attachment.id, filename: loaded.attachment.filename, checksum: loaded.attachment.checksum || '', createdAt: loaded.attachment.createdAt, workbook: loaded.workbook, plan: parsedPlan.data });
    return res.json({ success: true, data: result });
  } catch (error) {
    return sendAttachmentError(res, 'ANALYSIS_VALIDATION_FAILED', error instanceof Error ? error.message : 'Rencana analisis tidak dapat dijalankan.', 422);
  } finally { loaded.buffer.fill(0); }
});

/** Preview transformation changes without persisting or changing the source file. */
router.post('/chat/attachments/:id/dataset/transform/preview', requireAuth, async (req: Request, res: Response) => {
  const parsedPlan = TabularTransformRequestSchema.safeParse(req.body);
  if (!parsedPlan.success) return sendAttachmentError(res, 'INVALID_TRANSFORM_PLAN', 'Rencana transformasi tidak valid.', 400);
  const loaded = await loadOwnedTabularAttachment(req.params.id, req.user!.userId);
  if ('error' in loaded) return sendAttachmentError(res, loaded.error.code, loaded.error.message, loaded.error.status);
  try {
    const preview = previewTabularTransform({ attachmentId: loaded.attachment.id, checksum: loaded.attachment.checksum || '', workbook: loaded.workbook, plan: parsedPlan.data });
    return res.json({ success: true, data: preview.result });
  } catch (error) {
    return sendAttachmentError(res, 'TRANSFORM_PREVIEW_FAILED', error instanceof Error ? error.message : 'Preview transformasi gagal dibuat.', 422);
  } finally { loaded.buffer.fill(0); }
});

/** User-confirmed transformation creates a structured Workspace TABLE artifact; source attachment is immutable. */
router.post('/chat/attachments/:id/dataset/transform/confirm', requireAuth, async (req: Request, res: Response) => {
  const parsedPlan = TabularTransformRequestSchema.safeParse(req.body);
  if (!parsedPlan.success) return sendAttachmentError(res, 'INVALID_TRANSFORM_PLAN', 'Rencana transformasi tidak valid.', 400);
  const loaded = await loadOwnedTabularAttachment(req.params.id, req.user!.userId);
  if ('error' in loaded) return sendAttachmentError(res, loaded.error.code, loaded.error.message, loaded.error.status);
  try {
    const transformed = previewTabularTransform({ attachmentId: loaded.attachment.id, checksum: loaded.attachment.checksum || '', workbook: loaded.workbook, plan: parsedPlan.data });
    const title = `${loaded.attachment.filename.replace(/\.[^.]+$/, '')} · ${transformed.result.sheetName} (derived)`;
    const columns = loaded.workbook.sheets.find(sheet => sheet.name === transformed.result.sheetName)?.headers || [];
    const content = JSON.stringify({ type: 'table', title, columns, rows: transformed.rows, sourceVersion: transformed.result.sourceVersion, sourceFileId: transformed.result.sourceFileId, filename: loaded.attachment.filename, sheetName: transformed.result.sheetName, transformations: parsedPlan.data.operations });
    if (content.length > 1_500_000) return sendAttachmentError(res, 'DERIVED_DATASET_TOO_LARGE', 'Hasil transformasi melebihi batas ukuran artefak Workspace.', 413);
    const chatId = loaded.attachment.chatId!;
    const userId = req.user!.userId;
    const encryptedContent = encryptionService.encryptSensitive(content) || content;
    const now = new Date();
    const artifact = await prisma.artifacts.create({
      data: {
        id: `art_${crypto.randomUUID()}`, userId, chatId, title: title.slice(0, 200), type: 'TABLE', language: 'json', content: encryptedContent, version: 1, createdAt: now, updatedAt: now,
        versions: { create: [{ id: `ver_${crypto.randomUUID()}`, version: 1, title: title.slice(0, 200), content: encryptedContent, createdAt: now }] }
      },
      include: { versions: { orderBy: { version: 'desc' } } }
    });
    return res.status(201).json({ success: true, data: { artifact: { ...artifact, content, versions: artifact.versions.map(version => ({ ...version, content })) }, transform: transformed.result, sourceUnchanged: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transformasi gagal disimpan.';
    const code = message.includes('Versi sumber berubah') ? 'DATASET_VERSION_CHANGED' : 'TRANSFORM_CONFIRM_FAILED';
    return sendAttachmentError(res, code, message, code === 'DATASET_VERSION_CHANGED' ? 409 : 422);
  } finally { loaded.buffer.fill(0); }
});

/** Export an immutable source sheet as CSV with spreadsheet-formula injection protection. */
router.get('/chat/attachments/:id/dataset/export', requireAuth, async (req: Request, res: Response) => {
  const loaded = await loadOwnedTabularAttachment(req.params.id, req.user!.userId);
  if ('error' in loaded) return sendAttachmentError(res, loaded.error.code, loaded.error.message, loaded.error.status);
  try {
    const requestedSheet = typeof req.query.sheet === 'string' ? req.query.sheet : loaded.workbook.activeSheet;
    const sheet = loaded.workbook.sheets.find(candidate => candidate.name === requestedSheet);
    if (!sheet) return sendAttachmentError(res, 'SHEET_NOT_FOUND', 'Sheet tidak ditemukan pada workbook ini.', 404);
    const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
    if (req.query.format && !['csv', 'xlsx'].includes(String(req.query.format))) return sendAttachmentError(res, 'UNSUPPORTED_EXPORT_FORMAT', 'Format ekspor yang diminta tidak didukung.', 400);
    const safeBase = loaded.attachment.filename.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 100) || 'dataset';
    const safeSheet = sheet.name.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'sheet';
    if (format === 'xlsx') {
      const xlsx = await toSafeXlsx(sheet.headers, sheet.rows, safeSheet);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${safeBase}_${safeSheet}.xlsx"`);
      return res.send(xlsx);
    }
    const csv = toSafeCsv(sheet.headers, sheet.rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeBase}_${safeSheet}.csv"`);
    return res.send(`\uFEFF${csv}`);
  } finally { loaded.buffer.fill(0); }
});

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
    const uploadHandler = upload.array('files', MAX_ATTACHMENT_UPLOAD_BATCH);
    uploadHandler(req as any, res as any, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return sendAttachmentError(res, 'FILE_TOO_LARGE', 'Ukuran berkas melebihi batas maksimum 5MB', 400);
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return sendAttachmentError(res, 'TOO_MANY_FILES', `Maksimal ${MAX_ATTACHMENT_UPLOAD_BATCH} berkas per permintaan unggah.`, 400);
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
    let reservedChatId: string | undefined;
    let reservedAttachmentCount = 0;
    const releaseWorkspaceReservation = (count: number) => {
      if (!reservedChatId || count <= 0) return;
      const releaseCount = Math.min(count, reservedAttachmentCount);
      reservedAttachmentCount -= releaseCount;
      const next = Math.max(0, (pendingWorkspaceAttachmentUploads.get(reservedChatId) || 0) - releaseCount);
      if (next) pendingWorkspaceAttachmentUploads.set(reservedChatId, next);
      else pendingWorkspaceAttachmentUploads.delete(reservedChatId);
    };
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

      if (fileList.length > MAX_ATTACHMENT_UPLOAD_BATCH) {
        return sendAttachmentError(res, 'TOO_MANY_FILES', `Maksimal ${MAX_ATTACHMENT_UPLOAD_BATCH} berkas per permintaan unggah.`, 400);
      }

      if (chatId && req.body.workspaceMode === 'true') {
        reservedChatId = chatId;
        reservedAttachmentCount = fileList.length;
        pendingWorkspaceAttachmentUploads.set(chatId, (pendingWorkspaceAttachmentUploads.get(chatId) || 0) + fileList.length);
        const existingCount = await prisma.attachments.count({ where: { chatId, userId } });
        const pendingCount = pendingWorkspaceAttachmentUploads.get(chatId) || fileList.length;
        if (existingCount + pendingCount > MAX_WORKSPACE_ACTIVE_ATTACHMENTS) {
          return sendAttachmentError(res, 'WORKSPACE_ATTACHMENT_LIMIT', `Maksimal ${MAX_WORKSPACE_ACTIVE_ATTACHMENTS} dokumen aktif dalam satu Ruang Kerja.`, 400);
        }
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
          releaseWorkspaceReservation(1);
        } catch (fileErr: any) {
          if (fileErr.attachment) {
            savedAttachments.push(fileErr.attachment);
            releaseWorkspaceReservation(1);
            continue;
          }
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
    } finally {
      releaseWorkspaceReservation(reservedAttachmentCount);
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
        status: true, checksum: true, metadata: true, processingError: true, createdAt: true,
        _count: { select: { chunks: true } }
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
          chunkCount: attachment._count?.chunks ?? 0,
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

/** Return a bounded, ownership-checked text preview from the document's existing extraction. */
router.get('/chat/attachments/:id/preview', requireAuth, async (req: Request, res: Response) => {
  try {
    const attachment = await prisma.attachments.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      select: { id: true, chatId: true, filename: true, mimeType: true, fileKind: true, size: true, status: true, extractedText: true, isEncrypted: true, metadata: true }
    });
    if (!attachment || !attachment.chatId) return sendAttachmentError(res, 'NOT_FOUND', 'Berkas tidak ditemukan.', 404);
    const chat = await prisma.chats.findFirst({ where: { id: attachment.chatId, userId: req.user!.userId }, select: { id: true } });
    if (!chat) return sendAttachmentError(res, 'NOT_FOUND', 'Berkas tidak ditemukan.', 404);
    if (attachment.status !== 'ready') return sendAttachmentError(res, 'ATTACHMENT_NOT_READY', 'Preview tersedia setelah dokumen selesai diproses.', 409);
    let previewText = attachment.extractedText || '';
    if (attachment.isEncrypted) previewText = encryptionService.decryptSensitive(previewText) || '';
    let metadata: Record<string, unknown> = {};
    try { metadata = attachment.metadata ? JSON.parse(attachment.metadata) as Record<string, unknown> : {}; } catch { /* optional */ }
    return res.json({ success: true, data: { id: attachment.id, filename: attachment.filename, mimeType: attachment.mimeType, fileKind: attachment.fileKind, size: attachment.size, chunkCount: metadata.chunkCount, previewText: previewText.slice(0, 20_000) } });
  } catch {
    return sendAttachmentError(res, 'ATTACHMENT_PREVIEW_FAILED', 'Preview dokumen gagal dimuat.', 500);
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
    const statusDto = await documentIngestionService.getAttachmentStatus(attachmentId, userId, typeof req.query.chatId === 'string' ? req.query.chatId : undefined);

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
    const retryController = new AbortController();
    const abortRetryOnDisconnect = () => { if (!res.writableEnded) retryController.abort(); };
    res.once('close', abortRetryOnDisconnect);
    const retriedDto = await documentIngestionService.retryProcessing(attachmentId, userId, typeof req.query.chatId === 'string' ? req.query.chatId : undefined, retryController.signal);
    res.off('close', abortRetryOnDisconnect);

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

    const success = await attachmentStorageService.deleteAttachment(attachmentId, userId, typeof req.query.chatId === 'string' ? req.query.chatId : undefined);
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
