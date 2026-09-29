import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../../database.js';
import { validateAndInspectFile, VerifiedFileInfo } from './magicByteValidator.js';
import { getAdapterForKind } from './adapters/index.js';
import { DocumentExtractor } from './documentExtractor.js';
import { normalizationService } from './normalizationService.js';
import { chunkingService } from './chunkingService.js';
import { DocumentProcessingException, DEFAULT_FILE_LIMITS } from './fileTypes.js';
import { AttachmentResponseDTO, SupportedFileKind } from '../../../shared/contracts/files.js';

export const ATTACHMENTS_DIR = path.join(process.cwd(), 'uploads', 'attachments');

if (!fs.existsSync(ATTACHMENTS_DIR)) {
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
}

export interface IngestFileInput {
  userId: string;
  buffer: Buffer;
  originalFilename: string;
  clientMime?: string;
  chatId?: string;
  messageId?: string;
  abortSignal?: AbortSignal;
}

export const documentIngestionService = {
  /**
   * Complete Ingestion Pipeline:
   * VALIDATE -> STORE -> PROCESS -> EXTRACT -> NORMALIZE -> CHUNK -> PERSIST
   */
  async ingestFile(input: IngestFileInput): Promise<AttachmentResponseDTO> {
    const { userId, buffer, originalFilename, clientMime, chatId, messageId, abortSignal } = input;

    if (abortSignal?.aborted) {
      throw new DocumentProcessingException('PROCESSING_ABORTED', 'Proses unggah berkas dibatalkan.');
    }

    // 1. VALIDATE: Magic Byte, extension, and limits validation
    const verified: VerifiedFileInfo = await validateAndInspectFile(buffer, originalFilename, clientMime);

    // 2. IDEMPOTENCY / DEDUPLICATION: Check if identical file already exists for this user in this chat
    const existing = await prisma.attachments.findFirst({
      where: {
        userId,
        checksum: verified.checksum,
        chatId: chatId || null,
        status: 'ready'
      },
      include: { chunks: true }
    });

    if (existing) {
      // Re-use existing processed document idempotently without redundant extraction
      let meta: any = {};
      try { if (existing.metadata) meta = JSON.parse(existing.metadata); } catch {}

      return {
        id: existing.id,
        filename: existing.filename,
        mimeType: existing.mimeType,
        fileKind: (existing.fileKind as SupportedFileKind) || verified.fileKind,
        size: existing.size,
        status: 'ready',
        url: `/api/v1/chat/attachments/${existing.id}`,
        checksum: existing.checksum || undefined,
        pageCount: meta.pageCount,
        slideCount: meta.slideCount,
        sheetCount: meta.sheetCount,
        createdAt: existing.createdAt.toISOString(),
        processedAt: existing.processedAt ? existing.processedAt.toISOString() : undefined
      };
    }

    // 3. STORE: Write file securely with randomized name and safe permissions (0o600)
    const attachmentId = `att_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const storageFilename = `${attachmentId}.bin`;
    const storagePath = path.join(ATTACHMENTS_DIR, storageFilename);
    const relativeStoragePath = `uploads/attachments/${storageFilename}`;

    await fs.promises.writeFile(storagePath, buffer, { mode: 0o600 });

    // 4. PERSIST METADATA: Initial pending record
    const record = await prisma.attachments.create({
      data: {
        id: attachmentId,
        messageId: messageId || null,
        chatId: chatId || null,
        userId: userId || 'guest',
        filename: verified.sanitizedName,
        mimeType: verified.verifiedMime,
        size: verified.size,
        data: relativeStoragePath,
        checksum: verified.checksum,
        fileKind: verified.fileKind,
        status: 'processing'
      }
    });

    // If image kind, mark ready immediately (preview_only) without text extraction
    if (verified.fileKind === 'image') {
      await prisma.attachments.update({
        where: { id: attachmentId },
        data: {
          status: 'ready',
          processedAt: new Date(),
          metadata: JSON.stringify({ previewOnly: true })
        }
      });

      return {
        id: attachmentId,
        filename: verified.sanitizedName,
        mimeType: verified.verifiedMime,
        fileKind: verified.fileKind,
        size: verified.size,
        status: 'ready',
        url: `/api/v1/chat/attachments/${attachmentId}`,
        checksum: verified.checksum,
        createdAt: record.createdAt.toISOString(),
        processedAt: new Date().toISOString()
      };
    }

    // 5. PROCESS: Execute format-aware extraction adapter
    try {
      const extraction = await DocumentExtractor.extractDocument({
        buffer,
        filename: verified.sanitizedName,
        mimeType: verified.verifiedMime,
        abortSignal
      });

      if (abortSignal?.aborted) {
        throw new DocumentProcessingException('PROCESSING_ABORTED', 'Proses ekstraksi dibatalkan.');
      }

      // 6. NORMALIZE
      const normalized = normalizationService.normalizeDocument(extraction as any);

      // 7. CHUNK
      const chunks = chunkingService.createChunks(normalized);

      // 8. PERSIST CHUNKS & MARK READY
      if (chunks.length > 0) {
        await prisma.documentChunks.createMany({
          data: chunks.map(c => ({
            id: c.id,
            attachmentId,
            userId: userId || 'guest',
            chunkIndex: c.index,
            content: c.text,
            tokenCount: c.tokenEstimate,
            pageStart: c.pageStart ?? null,
            pageEnd: c.pageEnd ?? null,
            slideNumber: c.slideNumber ?? null,
            sheetName: c.sheetName ?? null,
            section: c.section ?? null,
            sourceRef: c.sourceRef ?? null,
            checksum: c.checksum
          }))
        });
      }

      const metadataObj = {
        pageCount: extraction.pageCount,
        slideCount: extraction.slideCount,
        sheetCount: extraction.sheetCount,
        chunkCount: chunks.length,
        extractedChars: normalized.normalizedFullText.length
      };

      const updated = await prisma.attachments.update({
        where: { id: attachmentId },
        data: {
          status: 'ready',
          processedAt: new Date(),
          extractedText: normalized.normalizedFullText.substring(0, 10_000), // Preview cache
          metadata: JSON.stringify(metadataObj)
        }
      });

      return {
        id: updated.id,
        filename: updated.filename,
        mimeType: updated.mimeType,
        fileKind: (updated.fileKind as SupportedFileKind) || verified.fileKind,
        size: updated.size,
        status: 'ready',
        url: `/api/v1/chat/attachments/${updated.id}`,
        checksum: updated.checksum || undefined,
        pageCount: extraction.pageCount,
        slideCount: extraction.slideCount,
        sheetCount: extraction.sheetCount,
        createdAt: updated.createdAt.toISOString(),
        processedAt: updated.processedAt ? updated.processedAt.toISOString() : undefined
      };
    } catch (procErr: any) {
      // Mark as failed in DB
      const errorCode = procErr instanceof DocumentProcessingException ? procErr.code : 'PARSER_ERROR';
      const errorMessage = procErr.safeMessage || procErr.message || 'Gagal mengekstrak isi dokumen.';

      await prisma.attachments.update({
        where: { id: attachmentId },
        data: {
          status: 'failed',
          processingError: `[${errorCode}] ${errorMessage}`
        }
      }).catch(() => {});

      throw (procErr instanceof DocumentProcessingException)
        ? procErr
        : new DocumentProcessingException('PARSER_ERROR', errorMessage);
    }
  },

  /**
   * Retry failed processing for a document
   */
  async retryProcessing(attachmentId: string, userId: string): Promise<AttachmentResponseDTO> {
    const attachment = await prisma.attachments.findUnique({
      where: { id: attachmentId }
    });

    if (!attachment) {
      throw new DocumentProcessingException('OWNERSHIP_ERROR', 'Dokumen tidak ditemukan.');
    }

    if (attachment.userId !== userId && !(attachment.userId === 'guest' && userId === 'guest')) {
      throw new DocumentProcessingException('OWNERSHIP_ERROR', 'Anda tidak memiliki hak akses ke dokumen ini.');
    }

    if (attachment.status === 'processing') {
      throw new DocumentProcessingException('PROCESSING_IN_PROGRESS' as any, 'Dokumen sedang diproses, mohon tunggu.');
    }

    if (attachment.status === 'ready') {
      let meta: any = {};
      try { if (attachment.metadata) meta = JSON.parse(attachment.metadata); } catch {}
      return {
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        fileKind: (attachment.fileKind as SupportedFileKind) || 'text',
        size: attachment.size,
        status: 'ready',
        url: `/api/v1/chat/attachments/${attachment.id}`,
        checksum: attachment.checksum || undefined,
        pageCount: meta.pageCount,
        slideCount: meta.slideCount,
        sheetCount: meta.sheetCount,
        createdAt: attachment.createdAt.toISOString(),
        processedAt: attachment.processedAt?.toISOString()
      };
    }

    const fullPath = path.isAbsolute(attachment.data)
      ? attachment.data
      : path.join(process.cwd(), attachment.data);

    if (!fs.existsSync(fullPath)) {
      throw new DocumentProcessingException('STORAGE_ERROR', 'Berkas fisik tidak ditemukan pada server.');
    }

    const buffer = await fs.promises.readFile(fullPath);

    // Transition failed -> processing
    await prisma.attachments.update({
      where: { id: attachmentId },
      data: {
        status: 'processing',
        processingError: null
      }
    });

    // Clear any partial chunks from prior attempt
    await prisma.documentChunks.deleteMany({
      where: { attachmentId }
    });

    try {
      const extraction = await DocumentExtractor.extractDocument({
        buffer,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
      });

      const normalized = normalizationService.normalizeDocument(extraction as any);
      const chunks = chunkingService.createChunks(normalized);

      if (chunks.length > 0) {
        await prisma.documentChunks.createMany({
          data: chunks.map(c => ({
            id: c.id,
            attachmentId,
            userId: userId || 'guest',
            chunkIndex: c.index,
            content: c.text,
            tokenCount: c.tokenEstimate,
            pageStart: c.pageStart ?? null,
            pageEnd: c.pageEnd ?? null,
            slideNumber: c.slideNumber ?? null,
            sheetName: c.sheetName ?? null,
            section: c.section ?? null,
            sourceRef: c.sourceRef ?? null,
            checksum: c.checksum
          }))
        });
      }

      const metadataObj = {
        pageCount: extraction.pageCount,
        slideCount: extraction.slideCount,
        sheetCount: extraction.sheetCount,
        chunkCount: chunks.length,
        extractedChars: normalized.normalizedFullText.length
      };

      const updated = await prisma.attachments.update({
        where: { id: attachmentId },
        data: {
          status: 'ready',
          processedAt: new Date(),
          extractedText: normalized.normalizedFullText.substring(0, 10_000),
          metadata: JSON.stringify(metadataObj)
        }
      });

      return {
        id: updated.id,
        filename: updated.filename,
        mimeType: updated.mimeType,
        fileKind: (updated.fileKind as SupportedFileKind) || 'text',
        size: updated.size,
        status: 'ready',
        url: `/api/v1/chat/attachments/${updated.id}`,
        checksum: updated.checksum || undefined,
        pageCount: extraction.pageCount,
        slideCount: extraction.slideCount,
        sheetCount: extraction.sheetCount,
        createdAt: updated.createdAt.toISOString(),
        processedAt: updated.processedAt?.toISOString()
      };
    } catch (err: any) {
      await prisma.attachments.update({
        where: { id: attachmentId },
        data: {
          status: 'failed',
          processingError: err.message
        }
      }).catch(() => {});
      throw err;
    }
  },

  /**
   * Delete attachment and all derived data (Right to be Forgotten)
   */
  async deleteAttachment(attachmentId: string, userId: string): Promise<boolean> {
    const attachment = await prisma.attachments.findUnique({
      where: { id: attachmentId }
    });

    if (!attachment) return false;

    if (attachment.userId !== userId && !(attachment.userId === 'guest' && userId === 'guest')) {
      throw new DocumentProcessingException('OWNERSHIP_ERROR', 'Anda tidak berhak menghapus berkas ini.');
    }

    // Unlink physical file from disk
    const fullPath = path.isAbsolute(attachment.data)
      ? attachment.data
      : path.join(process.cwd(), attachment.data);

    if (fs.existsSync(fullPath)) {
      try {
        await fs.promises.unlink(fullPath);
      } catch (e) {
        console.warn('Failed to delete physical file:', e);
      }
    }

    // Cascade delete in Prisma deletes chunks and attachment record
    await prisma.documentChunks.deleteMany({
      where: { attachmentId }
    });

    await prisma.attachments.delete({
      where: { id: attachmentId }
    });

    return true;
  },

  /**
   * Get attachment status
   */
  async getAttachmentStatus(attachmentId: string, userId: string): Promise<AttachmentResponseDTO | null> {
    const attachment = await prisma.attachments.findUnique({
      where: { id: attachmentId }
    });

    if (!attachment) return null;

    if (attachment.userId !== userId && !(attachment.userId === 'guest' && userId === 'guest')) {
      throw new DocumentProcessingException('OWNERSHIP_ERROR', 'Akses tidak diizinkan.');
    }

    let meta: any = {};
    try { if (attachment.metadata) meta = JSON.parse(attachment.metadata); } catch {}

    return {
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      fileKind: (attachment.fileKind as SupportedFileKind) || 'text',
      size: attachment.size,
      status: attachment.status as any,
      url: `/api/v1/chat/attachments/${attachment.id}`,
      checksum: attachment.checksum || undefined,
      pageCount: meta.pageCount,
      slideCount: meta.slideCount,
      sheetCount: meta.sheetCount,
      errorMessage: attachment.processingError || undefined,
      createdAt: attachment.createdAt.toISOString(),
      processedAt: attachment.processedAt?.toISOString()
    };
  }
};
