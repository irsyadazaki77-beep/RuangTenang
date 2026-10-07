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
  isolatedTaskExecution?: boolean;
  taskContextSourceIds?: string[];
  taskArtifactContext?: string;
  taskWorkspaceInstructions?: string;
}

export interface WorkspaceActiveContext {
  workspaceId?: string;
  workspaceInstructions?: string;
  activeFiles: Array<{ id?: string; name: string }>;
  activeArtifact?: { id: string; title: string; type: ArtifactType; version: number; content: string };
  selectedText?: string;
  presetId?: string;
  taskCategory?: string;
}

export interface WorkspaceRequestSnapshot {
  requestId: string;
  workspaceId?: string;
  userMessage: string;
  model: string;
  presetId?: string;
  taskCategory?: string;
  context: WorkspaceActiveContext;
  config: WorkspaceComposerConfig;
  createdAt: string;
}

export interface WorkspaceComparisonRun {
  comparisonId: string;
  snapshotId: string;
  workspaceIdentity?: string;
  chatId?: string;
  prompt: string;
  selectedModelIds: string[];
  responseStyle: string;
  presetId?: string;
  taskCategory?: string;
  latencyPreference?: string;
  qualityPreference?: string;
  activeContext?: { artifactId?: string; title: string; version?: number; content: string };
  selectedText?: string;
  attachments?: Array<{ id: string; filename: string; mimeType?: string; size?: number; url?: string }>;
  workspaceInstructions?: string;
  includeWorkspaceFiles?: boolean;
  createdAt?: string;
}

export type WorkspaceComparisonCandidateStatus = 'queued' | 'streaming' | 'completed' | 'failed' | 'cancelled';

export interface WorkspaceComparisonCandidate {
  candidateId: string;
  modelId: string;
  comparisonId?: string;
  snapshotId?: string;
  modelName: string;
  status: WorkspaceComparisonCandidateStatus;
  output: string;
  attemptId?: string;
  contextFingerprint?: string;
  latencyMs?: number;
  tokensUsed?: {
    input?: number;
    output?: number;
  };
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
  /** Client-only ownership metadata for artifacts drafted before a chat exists. */
  localWorkspaceId?: string;
  persistenceStatus?: 'local' | 'saving' | 'failed' | 'persistent';
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

/** A text selection captured from the active Canvas editor. Offsets are UTF-16, matching textarea selection APIs. */
export interface WorkspaceArtifactSelection {
  artifactId: string;
  start: number;
  end: number;
  text: string;
}

/** A proposed, version-scoped edit. The base content is retained for local-draft conflict detection. */
export interface ArtifactPatch {
  artifactId: string;
  baseVersion: number;
  baseContent: string;
  start: number;
  end: number;
  originalText: string;
  replacementText: string;
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
  | 'unsupported'
  | 'error';

export interface WorkspaceFileAttachment {
  id?: string;
  clientId?: string;
  name: string;
  createdAt?: string;
  content?: string;
  size?: number;
  mimeType?: string;
  fileKind?: WorkspaceFileKind;
  isText?: boolean;
  status?: WorkspaceAttachmentStatus;
  errorMessage?: string;
  failureStage?: 'upload' | 'processing';
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

export type WorkspaceTab = 'chat' | 'canvas' | 'context' | 'sources';

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
