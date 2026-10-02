import type {
  LatencyPreference,
  ModelCapability,
  QualityPreference,
  RoutingMode,
  TaskCategory
} from './aiModelContract';

export type PresetScope = 'builtin' | 'custom';

export type PresetId =
  | 'cepat'
  | 'seimbang'
  | 'mendalam'
  | 'akademik'
  | 'coding'
  | 'research'
  | (string & {});

export type PresetGroup = 'Recommended' | 'Academic' | 'Development' | 'Custom';

export type WorkspaceResponseMode = 'Ringkas' | 'Seimbang' | 'Mendalam';
export type WorkspaceResponseStyle = 'Default' | 'Akademik' | 'Langkah demi langkah' | 'Formal';

export interface WorkspaceAiPreset {
  id: PresetId;
  name: string;
  description: string;
  icon: string;
  scope: PresetScope;
  group: PresetGroup;
  routingMode: RoutingMode;
  preferredModelId?: string;
  taskCategory?: TaskCategory;
  latencyPreference?: LatencyPreference;
  qualityPreference?: QualityPreference;
  responseMode?: WorkspaceResponseMode;
  responseStyle?: WorkspaceResponseStyle;
  capabilities?: ModelCapability[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PresetSelectionSnapshot {
  presetId: PresetId;
  presetName: string;
  routingMode: RoutingMode;
  selectedModelId: string;
  taskCategory?: TaskCategory;
  latencyPreference?: LatencyPreference;
  qualityPreference?: QualityPreference;
  responseMode?: WorkspaceResponseMode;
  responseStyle?: WorkspaceResponseStyle;
}

export interface UserPersonalizationPreferences {
  defaultPresetId: PresetId;
  preferredModelId?: string;
  preferredResponseMode?: WorkspaceResponseMode;
  preferredResponseStyle?: WorkspaceResponseStyle;
}

export type PresetAvailability = 'available' | 'partially_available' | 'unavailable';
