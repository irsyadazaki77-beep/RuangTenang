import { FileErrorCode } from '../../../shared/contracts/files.js';
import { MAX_UPLOAD_FILE_SIZE_BYTES } from '../../../shared/contracts/files.js';

export interface FileProcessingLimits {
  maxFileSize: number;
  maxFilesPerRequest: number;
  maxExtractedChars: number;
  maxPdfPages: number;
  maxPptxSlides: number;
  maxXlsxSheets: number;
  maxRowsPerSheet: number;
  maxCsvRows: number;
  maxChunksPerDocument: number;
  maxChunkChars: number;
  chunkOverlapChars: number;
  maxDecompressedArchiveSize: number;
  maxArchiveEntries: number;
  processingTimeoutMs: number;
}

export const DEFAULT_FILE_LIMITS: FileProcessingLimits = {
  maxFileSize: MAX_UPLOAD_FILE_SIZE_BYTES,
  maxFilesPerRequest: 3,
  maxExtractedChars: 500_000,
  maxPdfPages: 50,
  maxPptxSlides: 50,
  maxXlsxSheets: 20,
  maxRowsPerSheet: 1000,
  maxCsvRows: 2000,
  maxChunksPerDocument: 100,
  maxChunkChars: 2000, // ~500 tokens
  chunkOverlapChars: 200,
  maxDecompressedArchiveSize: 25 * 1024 * 1024, // 25MB zip-bomb defense
  maxArchiveEntries: 500,
  processingTimeoutMs: 15_000 // 15 seconds
};

export class DocumentProcessingException extends Error {
  readonly code: FileErrorCode;
  readonly safeMessage: string;
  readonly retryable: boolean;

  constructor(code: FileErrorCode, safeMessage: string, retryable = false) {
    super(`[${code}] ${safeMessage}`);
    this.name = 'DocumentProcessingException';
    this.code = code;
    this.safeMessage = safeMessage;
    this.retryable = retryable;
  }
}
