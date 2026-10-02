import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../database.js';
import { aiSafetyService } from './ai/aiSafetyService.js';
import { resolveExistingStoredAttachmentFilePath } from './attachmentFileService.js';
import { encryptionService } from './encryptionService.js';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
export const MAX_ATTACHMENTS_PER_MESSAGE = 3;

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'attachments');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export interface MagicBytesRule {
  mime: string;
  exts: string[];
  check: (buffer: Buffer) => boolean;
}

const MAGIC_BYTES_RULES: MagicBytesRule[] = [
  {
    mime: 'application/pdf',
    exts: ['.pdf'],
    check: (buf: Buffer) => buf.length >= 4 && buf.toString('utf8', 0, 4) === '%PDF'
  },
  {
    mime: 'image/jpeg',
    exts: ['.jpg', '.jpeg'],
    check: (buf: Buffer) => buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF
  },
  {
    mime: 'image/png',
    exts: ['.png'],
    check: (buf: Buffer) => buf.length >= 8 &&
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
      buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A
  },
  {
    mime: 'image/webp',
    exts: ['.webp'],
    check: (buf: Buffer) => buf.length >= 12 &&
      buf.toString('utf8', 0, 4) === 'RIFF' &&
      buf.toString('utf8', 8, 12) === 'WEBP'
  },
  {
    mime: 'application/msword',
    exts: ['.doc'],
    check: (buf: Buffer) => buf.length >= 8 &&
      buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0
  },
  {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    exts: ['.docx'],
    check: (buf: Buffer) => buf.length >= 4 &&
      buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04
  },
  {
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    exts: ['.pptx'],
    check: (buf: Buffer) => buf.length >= 4 &&
      buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04
  },
  {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    exts: ['.xlsx'],
    check: (buf: Buffer) => buf.length >= 4 &&
      buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04
  }
];

export function isTextFile(buffer: Buffer, originalExt: string): boolean {
  const allowed = ['.txt', '.md', '.csv', '.json', '.py', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.sql'];
  if (!allowed.includes(originalExt.toLowerCase())) {
    return false;
  }
  // Check that there are no null bytes or executable headers
  if (buffer.includes(0x00)) return false;
  // Disallow Windows PE binary 'MZ'
  if (buffer.length >= 2 && buffer[0] === 0x4D && buffer[1] === 0x5A) return false;
  // Disallow ELF binary '\x7fELF'
  if (buffer.length >= 4 && bufEquals(buffer.subarray(0, 4), Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) return false;
  
  return true;
}

function bufEquals(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function sanitizeFilename(rawFilename: string): string {
  if (!rawFilename || typeof rawFilename !== 'string') return 'attachment.bin';
  
  // Strip path traversal characters (slashes, backslashes, dot-dots, null bytes)
  let name = rawFilename.replace(/[\/\\]/g, '').replace(/\.\.+/g, '').replace(/\0/g, '').trim();
  
  // Remove control characters
  name = name.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Prevent dangerous double extensions like .php.png or .exe.txt
  name = name.replace(/\.(php|exe|sh|bat|cmd|pl|cgi|asp|aspx|jsp|html|htm|svg|js|cjs|mjs|vbs)\./gi, '.');

  if (!name || name === '.') return 'attachment.bin';

  // Limit filename length to 255 characters
  if (name.length > 255) {
    const ext = path.extname(name);
    const base = path.basename(name, ext);
    name = base.substring(0, 250 - ext.length) + ext;
  }
  
  return name;
}

export function validateAndDetectFile(buffer: Buffer, originalFilename: string, clientMime: string): {
  verifiedMime: string;
  sanitizedName: string;
  size: number;
} {
  if (!buffer || buffer.length === 0) {
    throw new Error('EMPTY_FILE: File buffer kosong atau terkorupsi.');
  }

  const size = buffer.length;
  if (size > MAX_FILE_SIZE) {
    throw new Error(`FILE_TOO_LARGE: Ukuran file (${(size / 1024 / 1024).toFixed(2)}MB) melebihi batas maksimum 5MB.`);
  }

  const ext = path.extname(originalFilename || '').toLowerCase();
  const sanitizedName = sanitizeFilename(originalFilename);

  // Find matching rule considering the extension first if there are multiple rules with same signature (e.g. zip/ooxml)
  let matchedRule = MAGIC_BYTES_RULES.find(rule => rule.exts.includes(ext) && rule.check(buffer))
    || MAGIC_BYTES_RULES.find(rule => rule.check(buffer));
  let verifiedMime = matchedRule ? matchedRule.mime : '';

  if (!matchedRule) {
    if (isTextFile(buffer, ext)) {
      verifiedMime = ext === '.md' ? 'text/markdown' : 'text/plain';
    } else {
      const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.pptx', '.xlsx', '.txt', '.md', '.csv', '.json', '.py', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.sql'];
      if (!allowedExts.includes(ext)) {
        throw new Error(`UNSUPPORTED_FORMAT: Format file .${ext || 'unknown'} tidak didukung.`);
      }
      throw new Error('INVALID_FILE_SIGNATURE: Format file tidak didukung atau magic bytes tidak valid.');
    }
  }

  // Ensure extension matches verified mime type
  if (matchedRule) {
    if (!matchedRule.exts.includes(ext)) {
      throw new Error(`EXTENSION_MIMETYPE_MISMATCH: Ekstensi ${ext} tidak sesuai dengan isi file sebenarnya (${verifiedMime}).`);
    }
  }

  return {
    verifiedMime,
    sanitizedName,
    size
  };
}

import { documentIngestionService } from './file-intelligence/documentIngestionService.js';
import { DocumentProcessingException } from './file-intelligence/fileTypes.js';

export const attachmentStorageService = {
  /**
   * Save and process attachment by delegating to canonical documentIngestionService pipeline.
   * Eliminates duplicate extraction, normalization, and chunking logic.
   */
  async saveAttachment({
    userId,
    buffer,
    originalFilename,
    clientMime,
    chatId,
    messageId
  }: {
    userId: string;
    buffer: Buffer;
    originalFilename: string;
    clientMime: string;
    chatId?: string;
    messageId?: string;
  }) {
    // Check Prompt injection for text files before ingestion for explicit compatibility
    if (clientMime === 'text/plain' || clientMime === 'text/markdown' || originalFilename.endsWith('.txt') || originalFilename.endsWith('.md')) {
      const textContent = buffer.toString('utf8');
      if (aiSafetyService.detectPromptInjection(textContent)) {
        throw new Error('PROMPT_INJECTION_IN_ATTACHMENT: Terdeteksi upaya prompt injection dalam isi berkas.');
      }
    }

    try {
      const responseDto = await documentIngestionService.ingestFile({
        userId,
        buffer,
        originalFilename,
        clientMime,
        chatId,
        messageId
      });

      // Fetch the full DB record so callers expecting the Prisma record receive it
      const record = await prisma.attachments.findUnique({
        where: { id: responseDto.id }
      });

      return record || {
        id: responseDto.id,
        filename: responseDto.filename,
        mimeType: responseDto.mimeType,
        fileKind: responseDto.fileKind,
        size: responseDto.size,
        status: responseDto.status,
        checksum: responseDto.checksum || null,
        data: `uploads/attachments/${responseDto.id}.bin`,
        chatId: chatId || null,
        messageId: messageId || null,
        userId: userId || 'guest',
        metadata: JSON.stringify({
          pageCount: responseDto.pageCount,
          slideCount: responseDto.slideCount,
          sheetCount: responseDto.sheetCount
        }),
        createdAt: new Date(responseDto.createdAt),
        processedAt: responseDto.processedAt ? new Date(responseDto.processedAt) : null,
        extractedText: null,
        processingError: null
      };
    } catch (err: any) {
      if (err instanceof DocumentProcessingException) {
        if (err.code === 'SECURITY_REJECTED') {
          throw new Error('PROMPT_INJECTION_IN_ATTACHMENT: Terdeteksi upaya prompt injection dalam isi berkas.');
        }
        // If file was stored and DB record created, but extraction failed (PARSER_ERROR, EXTRACTION_FAILED),
        // return the failed record for backward compatibility with callers expecting a saved record
        if (err.code === 'PARSER_ERROR' || err.code === 'EXTRACTION_LIMIT' || err.code === 'EXTRACTION_FAILED') {
          const failedRecord = await prisma.attachments.findFirst({
            where: {
              userId,
              filename: originalFilename
            },
            orderBy: { createdAt: 'desc' }
          });
          if (failedRecord) {
            return failedRecord;
          }
        }
        throw new Error(`${err.code}: ${err.safeMessage || err.message}`);
      }
      throw err;
    }
  },

  async getAttachmentForUser(attachmentId: string, userId: string, includeBase64 = true): Promise<{ attachment: NonNullable<Awaited<ReturnType<typeof prisma.attachments.findUnique>>>; buffer: Buffer; base64?: string } | null> {
    const attachment = await prisma.attachments.findUnique({
      where: { id: attachmentId }
    });

    if (!attachment) {
      return null;
    }

    // IDOR / Ownership validation: user must own attachment or both be 'guest'
    if (attachment.userId !== userId && !(attachment.userId === 'guest' && userId === 'guest')) {
      throw new Error('UNAUTHORIZED_ACCESS: Anda tidak memiliki akses ke berkas ini.');
    }

    // Resolve full disk path from relative storage path
    const fullPath = await resolveExistingStoredAttachmentFilePath(attachment.data);

    if (!fullPath || !fs.existsSync(fullPath)) {
      throw new Error('FILE_NOT_FOUND_ON_DISK: Berkas lampiran tidak ditemukan pada penyimpanan server.');
    }

    const storedBuffer = await fs.promises.readFile(fullPath);
    const buffer = attachment.isEncrypted
      ? Buffer.from(encryptionService.decryptSensitive(storedBuffer.toString('utf8')) || '', 'base64')
      : storedBuffer;
    if (attachment.isEncrypted) storedBuffer.fill(0);
    
    // Integrity check
    if (buffer.length !== attachment.size) {
      console.warn(`[ATTACHMENT_INTEGRITY_WARNING] Buffer length (${buffer.length}) does not match DB record size (${attachment.size})`);
    }

    return includeBase64 ? { attachment, buffer, base64: buffer.toString('base64') } : { attachment, buffer };
  },

  async deleteAttachment(attachmentId: string, userId: string): Promise<boolean> {
    try {
      return await documentIngestionService.deleteAttachment(attachmentId, userId);
    } catch (err: any) {
      if (err instanceof DocumentProcessingException && err.code === 'OWNERSHIP_ERROR') {
        throw new Error('UNAUTHORIZED_ACCESS: Anda tidak berhak menghapus berkas ini.');
      }
      throw err;
    }
  }
};
