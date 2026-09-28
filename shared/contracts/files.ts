import { z } from 'zod';

export type SupportedFileKind = 
  | 'text'
  | 'markdown'
  | 'csv'
  | 'json'
  | 'pdf'
  | 'docx'
  | 'pptx'
  | 'xlsx'
  | 'image'
  | 'code';

export type ProcessingStatus = 
  | 'pending'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'unsupported';

export type FileErrorCode =
  | 'INVALID_FILE_TYPE'
  | 'MIME_MISMATCH'
  | 'SIGNATURE_MISMATCH'
  | 'FILE_TOO_LARGE'
  | 'TOO_MANY_FILES'
  | 'ARCHIVE_TOO_LARGE'
  | 'EXTRACTION_LIMIT'
  | 'UNSUPPORTED_FORMAT'
  | 'PROCESSING_TIMEOUT'
  | 'PROCESSING_ABORTED'
  | 'PARSER_ERROR'
  | 'SECURITY_REJECTED'
  | 'STORAGE_ERROR'
  | 'OWNERSHIP_ERROR'
  | 'EMPTY_FILE'
  | 'EXTRACTION_FAILED'
  | 'INVALID_DOCUMENT'
  | 'DOCUMENT_TOO_LARGE'
  | 'DOCUMENT_LIMIT_EXCEEDED';

export interface FileDescriptor {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  fileKind: SupportedFileKind;
  checksum: string;
}

export interface DocumentBlock {
  blockId: string;
  text: string;
  pageNumber?: number;
  slideNumber?: number;
  sheetName?: string;
  section?: string;
  sourceOffset?: number;
}

export interface ExtractedDocument {
  documentId: string;
  filename: string;
  mimeType: string;
  kind: SupportedFileKind;
  size: number;
  checksum: string;
  pageCount?: number;
  slideCount?: number;
  sheetCount?: number;
  blocks: DocumentBlock[];
  normalizedText: string;
  metadata?: Record<string, any>;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  index: number;
  text: string;
  tokenEstimate: number;
  pageStart?: number;
  pageEnd?: number;
  slideNumber?: number;
  sheetName?: string;
  section?: string;
  sourceRef: string; // e.g. "Tugas.pdf [Hal. 2]" or "Data.xlsx [Sheet: Ringkasan]"
  checksum: string;
}

export interface FileSourceReference {
  documentId: string;
  filename: string;
  page?: number;
  slide?: number;
  sheet?: string;
  section?: string;
  sourceRef: string;
  snippet?: string;
}

export interface AttachmentResponseDTO {
  id: string;
  filename: string;
  mimeType: string;
  fileKind: SupportedFileKind;
  size: number;
  status: ProcessingStatus;
  url: string;
  checksum?: string;
  pageCount?: number;
  slideCount?: number;
  sheetCount?: number;
  errorMessage?: string;
  errorCode?: FileErrorCode;
  createdAt: string;
  processedAt?: string;
}

export const FileUploadQuerySchema = z.object({
  chatId: z.string().optional(),
  workspaceMode: z.boolean().optional()
});
