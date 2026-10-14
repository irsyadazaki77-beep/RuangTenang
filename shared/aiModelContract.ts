export type ProviderId = 'gemini' | 'deepseek' | 'groq' | 'openrouter' | 'openai';
export type ModelCapability = 'chat' | 'streaming' | 'reasoning';
export type ModelAvailability = 'configured' | 'temporarily_unavailable' | 'provider_not_configured';
export type ModelTier = 'Free' | 'Pro' | 'Premium';

/** The only canonical default model ID shared by browser and server. */
export const DEFAULT_AI_MODEL_ID = 'gemini-3.8-flash';

/** Sentinel ID for Auto Smart Routing */
export const AUTO_ROUTING_MODEL_ID = 'auto';

// --- FASE 23: OFFICIAL RUANGTENANG AI PROFILES ---
export type TenangProfileId = 'tenang-turbo' | 'tenang-middle' | 'tenang-low';
export type KerjaProfileId = 'kerja-fast' | 'kerja-santai' | 'kerja-hard';
export type AiProfileId = TenangProfileId | KerjaProfileId;

export const DEFAULT_TENANG_PROFILE_ID: TenangProfileId = 'tenang-middle';
export const DEFAULT_KERJA_PROFILE_ID: KerjaProfileId = 'kerja-santai';

export const TENANG_PROFILE_IDS: readonly TenangProfileId[] = ['tenang-turbo', 'tenang-middle', 'tenang-low'] as const;
export const KERJA_PROFILE_IDS: readonly KerjaProfileId[] = ['kerja-fast', 'kerja-santai', 'kerja-hard'] as const;
export const ALL_AI_PROFILE_IDS: readonly AiProfileId[] = [...TENANG_PROFILE_IDS, ...KERJA_PROFILE_IDS] as const;

export function isTenangProfile(id: string): id is TenangProfileId {
  return (TENANG_PROFILE_IDS as readonly string[]).includes(id);
}

export function isKerjaProfile(id: string): id is KerjaProfileId {
  return (KERJA_PROFILE_IDS as readonly string[]).includes(id);
}

export function isAiProfile(id: string): id is AiProfileId {
  return isTenangProfile(id) || isKerjaProfile(id);
}

export interface AiProfileOption {
  id: AiProfileId;
  name: string;
  scope: 'tenang' | 'kerja';
  tag: string;
  description: string;
  speed: 'Sangat Cepat' | 'Cepat' | 'Sedang';
  reasoning: 'Tinggi' | 'Sangat Tinggi' | 'Standar';
  goal: 'reasoning' | 'speed' | 'balanced';
  isDefault: boolean;
  allowedTiers: ModelTier[];
  selectable: boolean;
  available: boolean;
}

export interface TenangProfileOption extends AiProfileOption {
  id: TenangProfileId;
  scope: 'tenang';
}

export interface KerjaProfileOption extends AiProfileOption {
  id: KerjaProfileId;
  scope: 'kerja';
}

export const TENANG_PROFILES: readonly TenangProfileOption[] = [
  {
    id: 'tenang-turbo',
    name: 'Tenang Turbo',
    scope: 'tenang',
    tag: 'Penalaran Mendalam',
    description: 'Prioritaskan penalaran mendalam, pemahaman konteks, dan restrukturisasi kognitif.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi',
    goal: 'reasoning',
    isDefault: false,
    allowedTiers: ['Free', 'Pro', 'Premium'],
    selectable: true,
    available: true
  },
  {
    id: 'tenang-middle',
    name: 'Tenang Middle',
    scope: 'tenang',
    tag: 'Seimbang & Responsif',
    description: 'Keseimbangan empati, kualitas respons, dan kecepatan interaksi.',
    speed: 'Cepat',
    reasoning: 'Tinggi',
    goal: 'balanced',
    isDefault: true,
    allowedTiers: ['Free', 'Pro', 'Premium'],
    selectable: true,
    available: true
  },
  {
    id: 'tenang-low',
    name: 'Tenang Low',
    scope: 'tenang',
    tag: 'Kilat & Hemat',
    description: 'Respons kilat, ringan, efisien, dan hemat kuota tanpa mengabaikan keselamatan.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    goal: 'speed',
    isDefault: false,
    allowedTiers: ['Free', 'Pro', 'Premium'],
    selectable: true,
    available: true
  }
] as const;

export const KERJA_PROFILES: readonly KerjaProfileOption[] = [
  {
    id: 'kerja-fast',
    name: 'Kerja Fast',
    scope: 'kerja',
    tag: 'Cepat & Ringan',
    description: 'Optimalkan kecepatan untuk pertanyaan singkat, rangkuman sederhana, dan pekerjaan ringan.',
    speed: 'Sangat Cepat',
    reasoning: 'Standar',
    goal: 'speed',
    isDefault: false,
    allowedTiers: ['Free', 'Pro', 'Premium'],
    selectable: true,
    available: true
  },
  {
    id: 'kerja-santai',
    name: 'Kerja Santai',
    scope: 'kerja',
    tag: 'Tugas Harian',
    description: 'Seimbangkan kecepatan, kualitas, dan penggunaan token untuk tugas akademik harian.',
    speed: 'Cepat',
    reasoning: 'Tinggi',
    goal: 'balanced',
    isDefault: true,
    allowedTiers: ['Free', 'Pro', 'Premium'],
    selectable: true,
    available: true
  },
  {
    id: 'kerja-hard',
    name: 'Kerja Hard',
    scope: 'kerja',
    tag: 'Penalaran Kompleks',
    description: 'Prioritaskan reasoning kompleks, analisis dokumen mendalam, coding, dan riset multi-step.',
    speed: 'Sedang',
    reasoning: 'Sangat Tinggi',
    goal: 'reasoning',
    isDefault: false,
    allowedTiers: ['Free', 'Pro', 'Premium'],
    selectable: true,
    available: true
  }
] as const;

export const ALL_AI_PROFILES: readonly AiProfileOption[] = [...TENANG_PROFILES, ...KERJA_PROFILES] as const;

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
  profileId?: AiProfileId;
  workspaceMode?: boolean;
  isWorkspace?: boolean;
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
  selectedModel?: any;
  provider: ProviderId;
  routingMode: RoutingMode;
  routingReason: string;
  fallbackCandidates: string[];
  profileId?: AiProfileId;
  isDegraded?: boolean;
  degradationNotice?: string;
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
  profiles?: AiProfileOption[];
  defaultTenangProfile?: TenangProfileId;
  defaultKerjaProfile?: KerjaProfileId;
}

