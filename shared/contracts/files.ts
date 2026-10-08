import { z } from 'zod';

export const MAX_WORKSPACE_ACTIVE_ATTACHMENTS = 8;
/** Maximum binaries accepted by one multipart upload request. */
export const MAX_ATTACHMENT_UPLOAD_BATCH = 3;
/** Normal Chat message attachment limit; Workspace has a separate active-document limit. */
export const MAX_CHAT_ATTACHMENTS_PER_MESSAGE = 3;
export const MAX_UPLOAD_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_CONTEXT_TOKENS = 2500;
export const MAX_DOCUMENT_CONTEXT_CHUNKS = 8;
export const SUPPORTED_WORKSPACE_FILE_EXTENSIONS = [
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'bib', 'ris',
  'py', 'js', 'jsx', 'ts', 'tsx', 'java', 'cpp', 'c', 'h', 'sql', 'html', 'css', 'xml', 'yaml', 'yml', 'sh', 'r',
  'pdf', 'docx', 'pptx', 'xlsx', 'png', 'jpg', 'jpeg', 'webp'
] as const;

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
  | 'PROCESSING_IN_PROGRESS'
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
  citationId?: string;
  documentId: string;
  filename: string;
  page?: number;
  slide?: number;
  sheet?: string;
  section?: string;
  sourceRef: string;
  snippet?: string;
}

export type ResearchSourceProvenance = 'uploaded_file' | 'workspace_artifact' | 'user_note' | 'external_verified' | 'unknown';
export interface ResearchSource {
  id: string;
  workspaceId: string;
  type: ResearchSourceProvenance;
  title: string;
  author?: string;
  year?: number;
  fileName?: string;
  pageCount?: number;
  url?: string;
  doi?: string;
  metadataConfidence: 'verified' | 'parsed' | 'user_provided' | 'unknown';
  createdAt: string;
}
export const ResearchSourceMetadataSchema = z.object({
  title: z.string().trim().min(1).max(240),
  author: z.string().trim().max(240).optional(),
  year: z.number().int().min(1000).max(2200).optional(),
  doi: z.string().trim().max(300).regex(/^10\.\d{4,9}\/\S+$/).optional(),
  url: z.string().url().max(1000).refine(value => value.startsWith('https://'), 'URL sumber harus menggunakan HTTPS.').optional()
}).strict();
export type ResearchSourceMetadata = z.infer<typeof ResearchSourceMetadataSchema>;
export interface ResearchCitation {
  id: string;
  sourceId: string;
  chunkId?: string;
  page?: number;
  section?: string;
  excerpt?: string;
  supportType: 'direct_support' | 'partial_support' | 'background' | 'contradicting';
}
export interface ResearchClaim {
  id: string;
  text: string;
  citationIds: string[];
  verificationStatus: 'supported' | 'partially_supported' | 'unsupported' | 'conflicting' | 'unverified';
}

/** Immutable document context selected for one Workspace model request. */
export interface WorkspaceContextSnapshot {
  id: string;
  query: string;
  createdAt: string;
  selectedAttachmentIds: string[];
  selectedChunks: DocumentChunk[];
  sourceReferences: FileSourceReference[];
  tokenBudget: number;
  totalTokensUsed: number;
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
