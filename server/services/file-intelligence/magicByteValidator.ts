import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import { SupportedFileKind } from '../../../shared/contracts/files.js';
import { DocumentProcessingException, DEFAULT_FILE_LIMITS } from './fileTypes.js';

export interface VerifiedFileInfo {
  verifiedMime: string;
  sanitizedName: string;
  fileKind: SupportedFileKind;
  checksum: string;
  size: number;
}

const TEXT_CODE_EXTS = new Set([
  'txt', 'md', 'markdown', 'py', 'js', 'jsx', 'ts', 'tsx', 'java', 'cpp', 'c', 'h',
  'json', 'csv', 'sql', 'html', 'css', 'xml', 'yaml', 'yml', 'sh', 'r', 'bib', 'ris'
]);

export function sanitizeFilename(rawFilename: string): string {
  if (!rawFilename || typeof rawFilename !== 'string') return 'document.bin';
  
  // Strip directory traversals (slashes, backslashes, double dots, null bytes)
  let name = rawFilename.replace(/[\/\\]/g, '').replace(/\.\.+/g, '').replace(/\0/g, '').trim();
  
  // Strip control characters
  name = name.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Disallow executable double extensions
  name = name.replace(/\.(php|exe|sh|bat|cmd|pl|cgi|asp|aspx|jsp|svg|js|cjs|mjs|vbs|jar|com|scr)\./gi, '.');

  if (!name || name === '.') return 'document.bin';

  if (name.length > 255) {
    const ext = path.extname(name);
    const base = path.basename(name, ext);
    name = base.substring(0, 240 - ext.length) + ext;
  }
  
  return name;
}

export function isExecutableOrDangerous(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 2) return false;
  // Windows PE MZ header
  if (buffer[0] === 0x4D && buffer[1] === 0x5A) return true;
  // Linux ELF
  if (buffer.length >= 4 && buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) return true;
  // Mach-O binary
  if (buffer.length >= 4) {
    const magic = buffer.readUInt32BE(0);
    if ([0xFEEDFACE, 0xFEEDFACF, 0xCAFEBABE, 0xCEFAEDFE, 0xCFFAEDFE].includes(magic)) {
      return true;
    }
  }
  return false;
}

export async function validateAndInspectFile(
  buffer: Buffer,
  originalFilename: string,
  declaredMime?: string
): Promise<VerifiedFileInfo> {
  if (!buffer || buffer.length === 0) {
    throw new DocumentProcessingException('EMPTY_FILE', 'Berkas kosong (0 byte).');
  }

  const size = buffer.length;
  if (size > DEFAULT_FILE_LIMITS.maxFileSize) {
    const sizeMb = (size / (1024 * 1024)).toFixed(2);
    throw new DocumentProcessingException(
      'FILE_TOO_LARGE',
      `Ukuran berkas (${sizeMb}MB) melebihi batas maksimal ${(DEFAULT_FILE_LIMITS.maxFileSize / (1024 * 1024))}MB.`
    );
  }

  if (isExecutableOrDangerous(buffer)) {
    throw new DocumentProcessingException(
      'SECURITY_REJECTED',
      'Berkas executable atau biner berbahaya terdeteksi dan ditolak oleh sistem keamanan.'
    );
  }

  const sanitizedName = sanitizeFilename(originalFilename);
  const ext = path.extname(sanitizedName).toLowerCase().replace('.', '');
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  // 1. PDF Validation (%PDF)
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('utf8') === '%PDF') {
    if (ext !== 'pdf') {
      throw new DocumentProcessingException('MIME_MISMATCH', `Ekstensi .${ext} tidak cocok dengan isi berkas PDF.`);
    }
    return {
      verifiedMime: 'application/pdf',
      sanitizedName,
      fileKind: 'pdf',
      checksum,
      size
    };
  }

  // 2. Images (PNG, JPEG, WEBP)
  // PNG
  if (buffer.length >= 8 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
      buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
    if (ext !== 'png') {
      throw new DocumentProcessingException('MIME_MISMATCH', `Ekstensi .${ext} tidak cocok dengan isi berkas PNG.`);
    }
    return {
      verifiedMime: 'image/png',
      sanitizedName,
      fileKind: 'image',
      checksum,
      size
    };
  }

  // JPEG
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    if (!['jpg', 'jpeg'].includes(ext)) {
      throw new DocumentProcessingException('MIME_MISMATCH', `Ekstensi .${ext} tidak cocok dengan isi berkas JPEG.`);
    }
    return {
      verifiedMime: 'image/jpeg',
      sanitizedName,
      fileKind: 'image',
      checksum,
      size
    };
  }

  // WEBP
  if (buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('utf8') === 'RIFF' &&
      buffer.subarray(8, 12).toString('utf8') === 'WEBP') {
    if (ext !== 'webp') {
      throw new DocumentProcessingException('MIME_MISMATCH', `Ekstensi .${ext} tidak cocok dengan isi berkas WEBP.`);
    }
    return {
      verifiedMime: 'image/webp',
      sanitizedName,
      fileKind: 'image',
      checksum,
      size
    };
  }

  // 3. ZIP-based Office Containers (DOCX, PPTX, XLSX)
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)) {
    // Validate ZIP container structure and bomb protection
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(buffer);
    } catch {
      throw new DocumentProcessingException('PARSER_ERROR', 'Struktur arsip dokumen ZIP rusak atau tidak valid.');
    }

    const entries = Object.keys(zip.files);
    if (entries.length > DEFAULT_FILE_LIMITS.maxArchiveEntries) {
      throw new DocumentProcessingException('ARCHIVE_TOO_LARGE', `Arsip dokumen melebihi batas maksimum ${DEFAULT_FILE_LIMITS.maxArchiveEntries} entri.`);
    }

    // Check for malicious macros or executables embedded inside zip
    let totalUncompressedSize = 0;
    for (const entryName of entries) {
      const fileEntry = zip.files[entryName];
      if (!fileEntry.dir) {
        // Zip Bomb protection: check uncompressed size estimate
        // @ts-ignore
        const uncompressed = fileEntry._data?.uncompressedSize || 0;
        totalUncompressedSize += uncompressed;
        if (totalUncompressedSize > DEFAULT_FILE_LIMITS.maxDecompressedArchiveSize) {
          throw new DocumentProcessingException('ARCHIVE_TOO_LARGE', 'Ukuran dekompresi berkas dokumen melebihi batas aman (Zip Bomb defense).');
        }
      }

      const lowerEntry = entryName.toLowerCase();
      if (lowerEntry.endsWith('.exe') || lowerEntry.endsWith('.dll') || lowerEntry.endsWith('.bin') && lowerEntry.includes('vbaproject')) {
        throw new DocumentProcessingException('SECURITY_REJECTED', 'Dokumen memuat macro/skrip biner aktif yang dilarang.');
      }
    }

    // Inspect content types to confirm document format
    const hasWordDoc = entries.some(e => e.startsWith('word/document.xml') || e.startsWith('word/'));
    const hasPpt = entries.some(e => e.startsWith('ppt/presentation.xml') || e.startsWith('ppt/slides/'));
    const hasXls = entries.some(e => e.startsWith('xl/workbook.xml') || e.startsWith('xl/worksheets/'));

    if (ext === 'docx') {
      if (!hasWordDoc && !entries.includes('[Content_Types].xml')) {
        throw new DocumentProcessingException('SIGNATURE_MISMATCH', 'Struktur internal bukan dokumen Microsoft Word valid.');
      }
      return {
        verifiedMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sanitizedName,
        fileKind: 'docx',
        checksum,
        size
      };
    }

    if (ext === 'pptx') {
      if (!hasPpt && !entries.includes('[Content_Types].xml')) {
        throw new DocumentProcessingException('SIGNATURE_MISMATCH', 'Struktur internal bukan presentasi Microsoft PowerPoint valid.');
      }
      return {
        verifiedMime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        sanitizedName,
        fileKind: 'pptx',
        checksum,
        size
      };
    }

    if (ext === 'xlsx') {
      if (!hasXls && !entries.includes('[Content_Types].xml')) {
        throw new DocumentProcessingException('SIGNATURE_MISMATCH', 'Struktur internal bukan lembar sebar Microsoft Excel valid.');
      }
      return {
        verifiedMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sanitizedName,
        fileKind: 'xlsx',
        checksum,
        size
      };
    }

    throw new DocumentProcessingException('SIGNATURE_MISMATCH', `Format arsip ZIP tidak diizinkan untuk ekstensi .${ext}.`);
  }

  // 4. Text-Based Files (txt, md, csv, json, source code)
  // Ensure no binary null bytes exist in text files
  const sampleLength = Math.min(buffer.length, 8192);
  const sample = buffer.subarray(0, sampleLength);
  if (sample.includes(0x00)) {
    throw new DocumentProcessingException('SIGNATURE_MISMATCH', 'Berkas biner tidak dikenal atau mengandung null byte.');
  }

  if (ext === 'json') {
    // Validate JSON structure
    try {
      const text = buffer.toString('utf8');
      JSON.parse(text);
      return {
        verifiedMime: 'application/json',
        sanitizedName,
        fileKind: 'json',
        checksum,
        size
      };
    } catch {
      throw new DocumentProcessingException('PARSER_ERROR', 'Format berkas JSON tidak valid.');
    }
  }

  if (ext === 'csv' || ext === 'tsv') {
    return {
      verifiedMime: 'text/csv',
      sanitizedName,
      fileKind: 'csv',
      checksum,
      size
    };
  }

  if (ext === 'md' || ext === 'markdown') {
    return {
      verifiedMime: 'text/markdown',
      sanitizedName,
      fileKind: 'markdown',
      checksum,
      size
    };
  }

  if (TEXT_CODE_EXTS.has(ext)) {
    const isCode = !['txt', 'md', 'markdown'].includes(ext);
    return {
      verifiedMime: ext === 'txt' ? 'text/plain' : `text/x-${ext}`,
      sanitizedName,
      fileKind: isCode ? 'code' : 'text',
      checksum,
      size
    };
  }

  const KNOWN_BINARY_DOC_EXTS = new Set(['pdf', 'docx', 'pptx', 'xlsx', 'doc', 'png', 'jpg', 'jpeg', 'webp']);
  if (KNOWN_BINARY_DOC_EXTS.has(ext)) {
    throw new DocumentProcessingException('SIGNATURE_MISMATCH', `Format berkas .${ext} tidak valid atau magic byte tidak cocok.`);
  }

  throw new DocumentProcessingException('UNSUPPORTED_FORMAT', `Format berkas .${ext || 'unknown'} belum didukung.`);
}
