import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../database.js';
import { aiSafetyService } from './ai/aiSafetyService.js';

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
  }
];

export function isTextFile(buffer: Buffer, originalExt: string): boolean {
  if (!['.txt', '.md'].includes(originalExt.toLowerCase())) {
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

  // Check magic bytes matching
  let matchedRule = MAGIC_BYTES_RULES.find(rule => rule.check(buffer));
  let verifiedMime = matchedRule ? matchedRule.mime : '';

  if (!matchedRule) {
    if (isTextFile(buffer, ext)) {
      verifiedMime = ext === '.md' ? 'text/markdown' : 'text/plain';
    } else {
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

export const attachmentStorageService = {
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
    const { verifiedMime, sanitizedName, size } = validateAndDetectFile(buffer, originalFilename, clientMime);

    // Prompt injection check for text files
    if (verifiedMime === 'text/plain' || verifiedMime === 'text/markdown') {
      const textContent = buffer.toString('utf8');
      if (aiSafetyService.detectPromptInjection(textContent)) {
        throw new Error('PROMPT_INJECTION_IN_ATTACHMENT: Terdeteksi upaya prompt injection dalam isi berkas.');
      }
    }

    const attachmentId = `att_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const storageFilename = `${attachmentId}.bin`;
    const storagePath = path.join(UPLOAD_DIR, storageFilename);
    const relativeStoragePath = path.join('uploads', 'attachments', storageFilename);

    // Write file securely to disk
    await fs.promises.writeFile(storagePath, buffer, { mode: 0o600 });

    // Save metadata and relative storage reference in database (NO raw base64!)
    const record = await prisma.attachments.create({
      data: {
        id: attachmentId,
        messageId: messageId || null,
        chatId: chatId || null,
        userId: userId || 'guest',
        filename: sanitizedName,
        mimeType: verifiedMime,
        size,
        data: relativeStoragePath
      }
    });

    return record;
  },

  async getAttachmentForUser(attachmentId: string, userId: string) {
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
    const fullPath = path.isAbsolute(attachment.data)
      ? attachment.data
      : path.join(process.cwd(), attachment.data);

    if (!fs.existsSync(fullPath)) {
      throw new Error('FILE_NOT_FOUND_ON_DISK: Berkas lampiran tidak ditemukan pada penyimpanan server.');
    }

    const buffer = await fs.promises.readFile(fullPath);
    
    // Integrity check
    if (buffer.length !== attachment.size) {
      console.warn(`[ATTACHMENT_INTEGRITY_WARNING] Buffer length (${buffer.length}) does not match DB record size (${attachment.size})`);
    }

    return {
      attachment,
      buffer,
      base64: buffer.toString('base64')
    };
  },

  async deleteAttachment(attachmentId: string, userId: string) {
    const attachment = await prisma.attachments.findUnique({
      where: { id: attachmentId }
    });

    if (!attachment) return false;

    if (attachment.userId !== userId && !(attachment.userId === 'guest' && userId === 'guest')) {
      throw new Error('UNAUTHORIZED_ACCESS: Anda tidak berhak menghapus berkas ini.');
    }

    const fullPath = path.isAbsolute(attachment.data)
      ? attachment.data
      : path.join(process.cwd(), attachment.data);

    if (fs.existsSync(fullPath)) {
      try {
        await fs.promises.unlink(fullPath);
      } catch (e) {
        console.error('Failed to unlink attachment file:', e);
      }
    }

    await prisma.attachments.delete({
      where: { id: attachmentId }
    });

    return true;
  }
};
