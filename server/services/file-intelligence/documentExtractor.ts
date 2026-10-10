import { validateAndInspectFile } from './magicByteValidator.js';
import { getAdapterForKind } from './adapters/index.js';
import { SupportedFileKind, DocumentBlock } from '../../../shared/contracts/files.js';
import { DocumentProcessingException } from './fileTypes.js';

export interface ExtractedDocResult {
  text: string;
  metadata: {
    filename: string;
    mimeType: string;
    pageCount?: number;
    slideCount?: number;
    sheetCount?: number;
    [key: string]: any;
  };
  documentId?: string;
  filename?: string;
  mimeType?: string;
  kind?: SupportedFileKind;
  size?: number;
  checksum?: string;
  pageCount?: number;
  slideCount?: number;
  sheetCount?: number;
  blocks?: DocumentBlock[];
}

export class DocumentExtractor {
  static async extractDocument(input: {
    buffer: Buffer;
    filename: string;
    mimeType?: string;
    abortSignal?: AbortSignal;
  }): Promise<ExtractedDocResult> {
    const { buffer, filename, mimeType, abortSignal } = input;

    try {
      // 1. VALIDATE using magic bytes, extensions, security checks
      const verified = await validateAndInspectFile(buffer, filename, mimeType);

      // 2. GET format-aware adapter
      const adapter = getAdapterForKind(verified.fileKind);

      // 3. EXTRACT
      const extraction = await adapter.extract({
        documentId: `doc_${Date.now()}`,
        filename: verified.sanitizedName,
        mimeType: verified.verifiedMime,
        kind: verified.fileKind,
        buffer,
        checksum: verified.checksum,
        abortSignal
      });

      // Construct simple structured result requested in Phase 9 Section 2
      return {
        text: extraction.normalizedText,
        metadata: {
          filename: verified.sanitizedName,
          mimeType: verified.verifiedMime,
          pageCount: extraction.pageCount,
          slideCount: extraction.slideCount,
          sheetCount: extraction.sheetCount,
          size: buffer.length,
          checksum: verified.checksum,
          fileKind: verified.fileKind
        },
        documentId: extraction.documentId,
        filename: verified.sanitizedName,
        mimeType: verified.verifiedMime,
        kind: verified.fileKind,
        size: buffer.length,
        checksum: verified.checksum,
        pageCount: extraction.pageCount,
        slideCount: extraction.slideCount,
        sheetCount: extraction.sheetCount,
        blocks: extraction.blocks
      };
    } catch (error: any) {
      // Structure/Map error codes exactly as requested in Section 8
      let code = 'EXTRACTION_FAILED';
      let message = 'Dokumen tidak dapat diproses.';

      if (error instanceof DocumentProcessingException) {
        if (error.code === 'UNSUPPORTED_FORMAT') {
          const lowerExt = filename.split('.').pop()?.toLowerCase() || '';
          if (['pdf', 'docx', 'pptx', 'xlsx'].includes(lowerExt)) {
            code = 'INVALID_DOCUMENT';
          } else {
            code = 'UNSUPPORTED_FORMAT';
          }
        } else if (error.code === 'FILE_TOO_LARGE' || error.code === 'ARCHIVE_TOO_LARGE') {
          code = 'DOCUMENT_TOO_LARGE';
        } else if (error.code === 'EXTRACTION_LIMIT') {
          code = 'DOCUMENT_LIMIT_EXCEEDED';
        } else if (error.code === 'SECURITY_REJECTED') {
          code = 'INVALID_DOCUMENT';
          message = 'Dokumen ditolak karena alasan keamanan.';
        } else if (error.code === 'SIGNATURE_MISMATCH' || error.code === 'MIME_MISMATCH') {
          code = 'INVALID_DOCUMENT';
        } else if (error.code === 'PARSER_ERROR') {
          code = 'PARSER_ERROR'; // Kept for exact compatibility with existing security tests
        } else {
          code = 'EXTRACTION_FAILED';
        }
        message = error.safeMessage || message;
      } else {
        message = error.message || message;
      }

      throw new DocumentProcessingException(code as any, message);
    }
  }
}

export async function extractDocument(input: {
  buffer: Buffer;
  filename: string;
  mimeType?: string;
  abortSignal?: AbortSignal;
}): Promise<ExtractedDocResult> {
  return DocumentExtractor.extractDocument(input);
}
