import { 
  FileValidationResult, 
  WorkspaceFileAttachment, 
  WorkspaceFileKind, 
  FileValidationErrorType 
} from '../types.js';

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

export interface AttachmentStatusResponseDTO {
  id: string;
  filename: string;
  mimeType: string;
  fileKind: WorkspaceFileKind;
  size: number;
  status: 'processing' | 'ready' | 'failed' | 'pending';
  url: string;
  checksum?: string;
  pageCount?: number;
  slideCount?: number;
  sheetCount?: number;
  errorMessage?: string;
  errorCode?: string;
}

export interface PollResult {
  success: boolean;
  attachment?: AttachmentStatusResponseDTO;
  timeout?: boolean;
  errorMessage?: string;
}

/**
 * Polls backend status endpoint until document processing completes (or times out)
 * Explicit timeout, timer cleanup, and cancellation support.
 */
export async function pollProcessingStatus(
  attachmentId: string,
  maxAttempts = 15,
  intervalMs = 800,
  signal?: AbortSignal
): Promise<PollResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) {
      return { success: false, timeout: false, errorMessage: 'Pemrosesan dibatalkan.' };
    }

    try {
      const res = await fetch(`/api/v1/chat/attachments/${attachmentId}/status`, {
        credentials: 'include',
        signal
      });

      if (res.ok) {
        const data = await res.json();
        const att = data.attachment as AttachmentStatusResponseDTO | undefined;
        if (att) {
          if (att.status === 'ready' || att.status === 'failed') {
            return { success: true, attachment: att };
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, timeout: false, errorMessage: 'Pemrosesan dibatalkan.' };
      }
    }

    if (attempt < maxAttempts - 1) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          if (signal) signal.removeEventListener('abort', onAbort);
          resolve();
        }, intervalMs);

        const onAbort = () => {
          clearTimeout(timer);
          reject(new Error('AbortError'));
        };

        if (signal) {
          signal.addEventListener('abort', onAbort, { once: true });
        }
      }).catch(() => {});
    }
  }

  return { success: false, timeout: true };
}

function mapServerErrorCode(serverCode?: string): FileValidationErrorType {
  switch (serverCode) {
    case 'FILE_TOO_LARGE':
      return 'TOO_LARGE';
    case 'EMPTY_FILE':
      return 'EMPTY_FILE';
    case 'UNSUPPORTED_TYPE':
    case 'UNSUPPORTED_FORMAT':
      return 'UNSUPPORTED_TYPE';
    case 'SIGNATURE_MISMATCH':
      return 'SIGNATURE_MISMATCH';
    case 'MIME_MISMATCH':
      return 'MIME_MISMATCH';
    case 'SECURITY_REJECTED':
    case 'PROMPT_INJECTION':
    case 'PROMPT_INJECTION_IN_ATTACHMENT':
      return 'SECURITY_REJECTED';
    case 'UNAUTHORIZED_ACCESS':
    case 'OWNERSHIP_ERROR':
      return 'UNAUTHORIZED_ACCESS';
    case 'PROCESSING_TIMEOUT':
      return 'PROCESSING_TIMEOUT';
    case 'PROCESSING_FAILED':
    case 'PARSER_ERROR':
    case 'EXTRACTION_FAILED':
      return 'PROCESSING_FAILED';
    default:
      return 'UPLOAD_FAILED';
  }
}

/**
 * Production File Ingestion Pipeline for Workspace:
 * Sends file to server for magic-byte validation, format extraction, normalization, and chunk indexing.
 * Does NOT hold full extracted binary/text in client state.
 */
export async function processFileForWorkspace(
  file: File,
  chatId?: string,
  signal?: AbortSignal
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
      body: formData,
      signal
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const errMsg = data.message || data.error?.message || 'Gagal mengunggah berkas.';
      const rawCode = data.code || data.error?.code || 'UPLOAD_FAILED';
      return {
        valid: false,
        error: mapServerErrorCode(rawCode),
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

    // If still in processing status, poll until ready with strict timeout
    if (att.status === 'processing') {
      const pollResult = await pollProcessingStatus(att.id, 15, 800, signal);
      if (pollResult.success && pollResult.attachment) {
        att = pollResult.attachment;
      } else if (pollResult.timeout) {
        return {
          valid: false,
          error: 'PROCESSING_TIMEOUT',
          message: 'Pemrosesan dokumen melebihi batas waktu tunggu. Silakan coba lagi.'
        };
      } else {
        return {
          valid: false,
          error: 'PROCESSING_FAILED',
          message: pollResult.errorMessage || 'Pemrosesan berkas terhenti.'
        };
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
      fileKind: (att.fileKind as WorkspaceFileKind) || 'text',
      status: att.status || 'ready',
      pageCount: att.pageCount,
      slideCount: att.slideCount,
      sheetCount: att.sheetCount,
      url: att.url || `/api/v1/chat/attachments/${att.id}`,
      checksum: att.checksum
    };

    return { valid: true, file: attachment };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        valid: false,
        error: 'READ_FAILED',
        message: 'Pengunggahan berkas dibatalkan.'
      };
    }
    const errMessage = err instanceof Error ? err.message : 'Terjadi gangguan jaringan saat memproses berkas.';
    return {
      valid: false,
      error: 'READ_FAILED',
      message: errMessage
    };
  }
}
