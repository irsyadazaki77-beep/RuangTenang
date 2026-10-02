export type WorkspaceMode = 'RUANG_TENANG' | 'RUANG_KERJA';

export type WorkspaceResponseMode = 'Ringkas' | 'Seimbang' | 'Mendalam';
export type WorkspaceResponseStyle = 'Default' | 'Akademik' | 'Langkah demi langkah' | 'Formal';

export interface WorkspaceComposerConfig {
  aiModel: string;
  responseMode: WorkspaceResponseMode;
  responseStyle: WorkspaceResponseStyle;
  presetId?: string;
  taskCategory?: string;
  latencyPreference?: string;
  qualityPreference?: string;
  comparisonModelIds?: string[];
}

export interface WorkspaceComparisonRun {
  comparisonId: string;
  chatId?: string;
  prompt: string;
  selectedModelIds: string[];
  responseStyle: string;
  presetId?: string;
  taskCategory?: string;
  latencyPreference?: string;
  qualityPreference?: string;
  activeContext?: { title: string; content: string };
}

export type WorkspaceComparisonCandidateStatus = 'queued' | 'streaming' | 'completed' | 'failed' | 'cancelled';

export interface WorkspaceComparisonCandidate {
  candidateId: string;
  modelId: string;
  modelName: string;
  status: WorkspaceComparisonCandidateStatus;
  output: string;
  latencyMs?: number;
  error?: string;
}

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

export type WorkspaceFileKind = 
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

export type WorkspaceAttachmentStatus = 
  | 'uploading' 
  | 'processing' 
  | 'ready' 
  | 'failed' 
  | 'error';

export interface WorkspaceFileAttachment {
  id?: string;
  name: string;
  content?: string;
  size?: number;
  mimeType?: string;
  fileKind?: WorkspaceFileKind;
  isText?: boolean;
  status?: WorkspaceAttachmentStatus;
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
  | 'INVALID_FILE'
  | 'SIGNATURE_MISMATCH'
  | 'MIME_MISMATCH'
  | 'READ_FAILED' 
  | 'UPLOAD_FAILED' 
  | 'PROCESSING_FAILED' 
  | 'PROCESSING_TIMEOUT'
  | 'SECURITY_REJECTED'
  | 'UNAUTHORIZED_ACCESS';

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
