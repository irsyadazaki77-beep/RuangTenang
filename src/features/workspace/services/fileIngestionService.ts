import { FileValidationResult, WorkspaceFileAttachment } from '../types.js';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const SUPPORTED_EXTENSIONS = new Set([
  // Text
  'txt', 'md', 'markdown', 'csv', 'json',
  // Code
  'py', 'js', 'jsx', 'ts', 'tsx', 'java', 'cpp', 'c', 'h', 'sql', 'html', 'css', 'xml', 'yaml', 'yml', 'sh', 'r',
  // Documents
  'pdf', 'docx',
  // Presentations
  'pptx',
  // Spreadsheets
  'xlsx',
  // Images (preview only)
  'png', 'jpg', 'jpeg', 'webp'
]);

export const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'json',
  'py', 'js', 'jsx', 'ts', 'tsx', 'java', 'cpp', 'c', 'h', 'sql', 'html', 'css', 'xml', 'yaml', 'yml', 'sh', 'r'
]);

export function isTextBasedFile(filename: string, mimeType?: string): boolean {
  if (mimeType) {
    if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml') {
      return true;
    }
  }
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? TEXT_EXTENSIONS.has(ext) : false;
}

export function validateFileHeader(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'EMPTY_FILE', message: 'Tidak ada berkas yang dipilih.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'EMPTY_FILE', message: 'Berkas kosong (0 byte).' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { 
      valid: false, 
      error: 'TOO_LARGE', 
      message: `Ukuran berkas (${(file.size / (1024 * 1024)).toFixed(1)}MB) melebihi batas maksimal 5MB.` 
    };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: 'UNSUPPORTED_TYPE',
      message: `Format berkas .${ext} belum didukung. Format didukung: PDF, DOCX, PPTX, XLSX, TXT, MD, CSV, JSON, PNG, JPG.`
    };
  }

  return { valid: true };
}

/**
 * Polls backend status endpoint until document processing completes (or times out)
 */
async function pollProcessingStatus(
  attachmentId: string,
  maxAttempts = 15,
  intervalMs = 800
): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(`/api/v1/chat/attachments/${attachmentId}/status`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        const att = data.attachment;
        if (att && (att.status === 'ready' || att.status === 'failed')) {
          return att;
        }
      }
    } catch {}
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return null;
}

/**
 * Production File Ingestion Pipeline for Workspace:
 * Sends file to server for magic-byte validation, format extraction, normalization, and chunk indexing.
 * Does NOT hold full extracted binary/text in client state.
 */
export async function processFileForWorkspace(
  file: File,
  chatId?: string
): Promise<FileValidationResult> {
  const headerValidation = validateFileHeader(file);
  if (!headerValidation.valid) {
    return headerValidation;
  }

  try {
    const formData = new FormData();
    formData.append('files', file);
    if (chatId) {
      formData.append('chatId', chatId);
    }

    const res = await fetch('/api/v1/chat/attachments/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const errMsg = data.message || data.error?.message || 'Gagal mengunggah berkas.';
      const errCode = data.code || data.error?.code || 'UPLOAD_FAILED';
      return {
        valid: false,
        error: errCode === 'SECURITY_REJECTED' || errCode === 'PROMPT_INJECTION' ? 'SECURITY_REJECTED' : 'UPLOAD_FAILED',
        message: errMsg
      };
    }

    let att = data.attachment || (data.attachments && data.attachments[0]);
    if (!att) {
      return {
        valid: false,
        error: 'UPLOAD_FAILED',
        message: 'Respon server tidak memuat metadata lampiran.'
      };
    }

    // If still in processing status, poll until ready
    if (att.status === 'processing') {
      const polled = await pollProcessingStatus(att.id);
      if (polled) {
        att = polled;
      }
    }

    if (att.status === 'failed') {
      return {
        valid: false,
        error: 'PROCESSING_FAILED',
        message: att.errorMessage || 'Gagal mengekstrak struktur berkas dokumen.'
      };
    }

    const attachment: WorkspaceFileAttachment = {
      id: att.id,
      name: att.filename || file.name,
      size: att.size || file.size,
      mimeType: att.mimeType || file.type || 'application/octet-stream',
      fileKind: att.fileKind || 'text',
      status: att.status || 'ready',
      pageCount: att.pageCount,
      slideCount: att.slideCount,
      sheetCount: att.sheetCount,
      url: att.url || `/api/v1/chat/attachments/${att.id}`,
      checksum: att.checksum
    };

    return { valid: true, file: attachment };
  } catch (err: any) {
    console.error('[WORKSPACE_FILE_INGESTION_ERROR]', err);
    return {
      valid: false,
      error: 'READ_FAILED',
      message: err.message || 'Terjadi gangguan jaringan saat memproses berkas.'
    };
  }
}
