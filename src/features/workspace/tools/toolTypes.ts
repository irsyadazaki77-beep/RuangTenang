import { ArtifactType } from '../types';
import { ModelTier } from '../../../lib/aiModels';

export type WorkspaceToolCategory = 
  | 'Writing' 
  | 'Research' 
  | 'Coding' 
  | 'Citation' 
  | 'Outline' 
  | 'Analysis' 
  | 'Productivity';

export type WorkspaceToolExecutionMode = 'ai' | 'client_utility' | 'export';

export type WorkspaceToolOutputType = 
  | 'TEXT' 
  | 'ARTIFACT_UPDATE' 
  | 'ARTIFACT_CREATE' 
  | 'CITATION' 
  | 'DOWNLOAD' 
  | 'STRUCTURED';

export interface WorkspaceToolInputSchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  label: string;
  description?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: unknown;
}

export interface WorkspaceToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon identifier
  category: WorkspaceToolCategory;
  executionMode: WorkspaceToolExecutionMode;
  outputType: WorkspaceToolOutputType;
  supportedArtifactTypes?: ArtifactType[];
  requiredCapabilities?: string[];
  requiresArtifact?: boolean;
  requiresSelection?: boolean;
  supportsStreaming?: boolean;
  requiredTier?: ModelTier;
  inputSchema?: WorkspaceToolInputSchemaField[];
  promptTemplate?: (input: Record<string, any>, contextText: string) => string;
}

export interface WorkspaceToolContext {
  userId?: string;
  userTier?: ModelTier;
  activeArtifact?: {
    id: string;
    title: string;
    type: ArtifactType;
    language?: string;
    content: string;
    version?: number;
  } | null;
  selectedText?: string;
  chatId?: string;
  selectedModel?: string;
  presetId?: string;
  abortSignal?: AbortSignal;
}

export interface WorkspaceToolExecutionPayload {
  toolId: string;
  input: Record<string, any>;
  context: WorkspaceToolContext;
}

export type WorkspaceToolErrorCode = 
  | 'TOOL_NOT_FOUND' 
  | 'TOOL_UNAVAILABLE' 
  | 'INVALID_TOOL_INPUT' 
  | 'MISSING_ARTIFACT' 
  | 'MISSING_SELECTION' 
  | 'TIER_RESTRICTED' 
  | 'EXECUTION_FAILED' 
  | 'ABORTED' 
  | 'PROMPT_INJECTION_DETECTED' 
  | 'RESULT_INVALID';

export interface WorkspaceToolExecutionResult {
  success: boolean;
  toolId: string;
  outputType: WorkspaceToolOutputType;
  text?: string;
  proposedContent?: string;
  artifactTitle?: string;
  artifactType?: ArtifactType;
  artifactLanguage?: string;
  downloadData?: {
    filename: string;
    mimeType: string;
    content: string;
  };
  metadata?: Record<string, any>;
  error?: {
    code: WorkspaceToolErrorCode;
    message: string;
  };
}
