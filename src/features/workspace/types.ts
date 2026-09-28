export type WorkspaceMode = 'RUANG_TENANG' | 'RUANG_KERJA';

export type ArtifactType = 'DOCUMENT' | 'CODE' | 'CITATION' | 'OUTLINE';

export interface ArtifactVersionRecord {
  id: string;
  artifactId: string;
  version: number;
  content: string;
  title: string;
  createdAt: string;
}

export interface WorkspaceArtifact {
  id: string;
  chatId?: string | null;
  userId?: string;
  title: string;
  type: ArtifactType;
  language?: string; // e.g. 'python', 'javascript', 'typescript', 'sql', 'markdown', 'html', 'css', 'latex'
  content: string;
  version: number;
  createdAt?: string;
  updatedAt: string;
  versions?: ArtifactVersionRecord[];
}

export interface AcademicTaskTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  prompt: string;
  targetArtifact: ArtifactType;
}

export type CitationStyle = 'APA7' | 'IEEE' | 'HARVARD' | 'VANCOUVER' | 'BIBTEX';

export interface ParsedCitationItem {
  id: string;
  raw: string;
  title?: string;
  authors?: string[];
  year?: string;
  journal?: string;
  doiOrUrl?: string;
}

export type StreamingStatus = 'idle' | 'connecting' | 'streaming' | 'completed' | 'aborted' | 'error';

export interface WorkspaceFileAttachment {
  id?: string;
  name: string;
  content?: string;
  size?: number;
  mimeType?: string;
  fileKind?: string;
  isText?: boolean;
  status?: 'uploading' | 'processing' | 'ready' | 'failed' | 'error';
  errorMessage?: string;
  pageCount?: number;
  slideCount?: number;
  sheetCount?: number;
  url?: string;
  checksum?: string;
}

export type FileValidationErrorType = 
  | 'TOO_LARGE' 
  | 'EMPTY_FILE' 
  | 'UNSUPPORTED_TYPE' 
  | 'READ_FAILED' 
  | 'UPLOAD_FAILED' 
  | 'PROCESSING_FAILED' 
  | 'SECURITY_REJECTED';

export interface FileValidationResult {
  valid: boolean;
  error?: FileValidationErrorType;
  message?: string;
  file?: WorkspaceFileAttachment;
}

export type WorkspaceErrorType = 
  | 'network' 
  | 'validation' 
  | 'unauthorized' 
  | 'conflict' 
  | 'not-found' 
  | 'parse-error' 
  | 'persistence-failure' 
  | 'stream-error';

export interface WorkspaceError {
  type: WorkspaceErrorType;
  message: string;
  details?: unknown;
  timestamp: string;
}

export type WorkspaceTab = 'chat' | 'canvas';

export interface StarterTaskItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  primary?: boolean;
  prompt: string;
}

export interface AcademicPromptPill {
  label: string;
  prompt: string;
}

