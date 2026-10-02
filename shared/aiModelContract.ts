export type ProviderId = 'gemini' | 'deepseek' | 'groq' | 'openrouter';
export type ModelCapability = 'chat' | 'streaming' | 'reasoning';
export type ModelAvailability = 'configured' | 'temporarily_unavailable' | 'provider_not_configured';
export type ModelTier = 'Free' | 'Pro' | 'Premium';

/** The only canonical default model ID shared by browser and server. */
export const DEFAULT_AI_MODEL_ID = 'gemini-3.8-flash';

/** Sentinel ID for Auto Smart Routing */
export const AUTO_ROUTING_MODEL_ID = 'auto';

export type RoutingMode = 'manual' | 'auto';

export type TaskCategory =
  | 'general_chat'
  | 'academic_writing'
  | 'research'
  | 'coding'
  | 'document_analysis'
  | 'summarization'
  | 'brainstorming'
  | 'structured_reasoning'
  | 'translation';

export type LatencyPreference = 'fast' | 'balanced' | 'deep';
export type QualityPreference = 'standard' | 'high' | 'very_high';

export interface AiRoutingAttachment {
  filename?: string;
  mimeType?: string;
  size?: number;
}

export interface AiRoutingContext {
  routingMode?: RoutingMode;
  manualModelId?: string;
  workspaceMode?: boolean;
  chatMode?: string;
  responseStyle?: string;
  taskCategory?: TaskCategory;
  latencyPreference?: LatencyPreference;
  qualityPreference?: QualityPreference;
  requestedCapabilities?: ModelCapability[];
  streamingRequired?: boolean;
  userTier?: ModelTier;
  attachments?: AiRoutingAttachment[];
  excludedModelIds?: string[];
  presetId?: string;
}

export interface RoutingDecision {
  selectedModelId: string;
  provider: ProviderId;
  routingMode: RoutingMode;
  routingReason: string;
  fallbackCandidates: string[];
}

/** Safe API DTO; intentionally excludes providerModelId and credentials. */
export interface AiModelOption {
  id: string;
  name: string;
  category: string;
  tag: string;
  description: string;
  recommendedFor: string;
  speed: 'Sangat Cepat' | 'Cepat' | 'Sedang';
  reasoning: 'Tinggi' | 'Sangat Tinggi' | 'Standar';
  provider: ProviderId;
  capabilities: ModelCapability[];
  allowedTiers: ModelTier[];
  availability: ModelAvailability;
  available: boolean;
  providerAvailable: boolean;
  selectable: boolean;
  isDefault: boolean;
}

export interface AiModelCatalogResponse {
  defaultModel: string;
  models: AiModelOption[];
}
