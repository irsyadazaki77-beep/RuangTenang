import type { 
  WorkspaceAiPreset, 
  PresetId, 
  UserPersonalizationPreferences,
  PresetSelectionSnapshot
} from '../../../lib/aiPresets';
import { AUTO_ROUTING_MODEL_ID } from '../../../lib/aiModels';
import { DEFAULT_PRESET_ID } from '../constants/presetConstants';
import { safeLocalStorage } from '../../../lib/storage';
import { getCachedAiModelCatalog } from '../../../lib/aiModelCatalog';

export interface PresetValidationResult {
  valid: boolean;
  error?: string;
  sanitizedPreset?: WorkspaceAiPreset;
}

export function getUserPresetStorageKey(userId?: string | null): string {
  const safeId = (userId && userId.trim()) ? userId.trim() : 'guest';
  return `ruangkerja_custom_presets_${safeId}`;
}

export function getUserPersonalizationStorageKey(userId?: string | null): string {
  const safeId = (userId && userId.trim()) ? userId.trim() : 'guest';
  return `ruangkerja_personalization_${safeId}`;
}

export function getUserActivePresetStorageKey(userId?: string | null): string {
  const safeId = (userId && userId.trim()) ? userId.trim() : 'guest';
  return `ruangkerja_active_preset_${safeId}`;
}

export const VALID_TASK_CATEGORIES = [
  'general_chat',
  'academic_writing',
  'research',
  'coding',
  'document_analysis',
  'summarization',
  'brainstorming',
  'structured_reasoning',
  'translation'
] as const;

export const VALID_RESPONSE_MODES = ['Ringkas', 'Seimbang', 'Mendalam'] as const;
export const VALID_RESPONSE_STYLES = ['Default', 'Akademik', 'Langkah demi langkah', 'Formal'] as const;
export const VALID_LATENCY_PREFERENCES = ['fast', 'balanced', 'deep'] as const;
export const VALID_QUALITY_PREFERENCES = ['standard', 'high', 'very_high'] as const;

/**
 * Validates and sanitizes a custom preset object before saving or rendering.
 * Rejects arbitrary or malformed data from storage or user input.
 */
export function validateCustomPreset(
  input: unknown,
  existingPresets: WorkspaceAiPreset[] = []
): PresetValidationResult {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Data preset tidak valid.' };
  }

  const raw = input as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';

  if (!name || name.length < 2) {
    return { valid: false, error: 'Nama preset minimal 2 karakter.' };
  }
  if (name.length > 50) {
    return { valid: false, error: 'Nama preset maksimal 50 karakter.' };
  }

  // Check duplicate name against existing custom presets (excluding preset with same ID if updating)
  const targetId = typeof raw.id === 'string' ? raw.id.trim() : '';
  const duplicate = existingPresets.find(p => p.id !== targetId && p.name.trim().toLowerCase() === name.toLowerCase());
  if (duplicate) {
    return { valid: false, error: `Preset dengan nama "${name}" sudah ada.` };
  }

  const routingMode = raw.routingMode === 'manual' ? 'manual' : 'auto';
  let preferredModelId: string | undefined = undefined;

  if (typeof raw.preferredModelId === 'string' && raw.preferredModelId.trim()) {
    const trimmedModel = raw.preferredModelId.trim();
    if (trimmedModel !== AUTO_ROUTING_MODEL_ID) {
      const catalog = getCachedAiModelCatalog();
      if (catalog && !catalog.models.some(m => m.id === trimmedModel)) {
        return { valid: false, error: `Model "${trimmedModel}" tidak ditemukan dalam katalog.` };
      }
      preferredModelId = trimmedModel;
    }
  }

  const taskCategory = typeof raw.taskCategory === 'string' && (VALID_TASK_CATEGORIES as readonly string[]).includes(raw.taskCategory)
    ? (raw.taskCategory as any)
    : undefined;

  const latencyPreference = typeof raw.latencyPreference === 'string' && (VALID_LATENCY_PREFERENCES as readonly string[]).includes(raw.latencyPreference)
    ? (raw.latencyPreference as any)
    : undefined;

  const qualityPreference = typeof raw.qualityPreference === 'string' && (VALID_QUALITY_PREFERENCES as readonly string[]).includes(raw.qualityPreference)
    ? (raw.qualityPreference as any)
    : undefined;

  const responseMode = typeof raw.responseMode === 'string' && (VALID_RESPONSE_MODES as readonly string[]).includes(raw.responseMode)
    ? (raw.responseMode as any)
    : 'Seimbang';

  const responseStyle = typeof raw.responseStyle === 'string' && (VALID_RESPONSE_STYLES as readonly string[]).includes(raw.responseStyle)
    ? (raw.responseStyle as any)
    : 'Default';

  const description = typeof raw.description === 'string'
    ? raw.description.trim().slice(0, 160)
    : 'Preset kustom RuangKerja';

  const icon = typeof raw.icon === 'string' && raw.icon.trim().length <= 30
    ? raw.icon.trim()
    : 'Star';

  const id = targetId || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const sanitized: WorkspaceAiPreset = {
    id,
    name,
    description,
    icon,
    scope: 'custom',
    group: 'Custom',
    routingMode,
    preferredModelId,
    taskCategory,
    latencyPreference,
    qualityPreference,
    responseMode,
    responseStyle,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return { valid: true, sanitizedPreset: sanitized };
}

/**
 * Loads custom presets safely scoped per user from safeLocalStorage.
 */
export function loadUserCustomPresets(userId?: string | null): WorkspaceAiPreset[] {
  const key = getUserPresetStorageKey(userId);
  const raw = safeLocalStorage.getItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const validPresets: WorkspaceAiPreset[] = [];
    for (const item of parsed) {
      const validation = validateCustomPreset(item, validPresets);
      if (validation.valid && validation.sanitizedPreset) {
        validPresets.push(validation.sanitizedPreset);
      }
    }
    return validPresets;
  } catch {
    return [];
  }
}

/**
 * Saves custom presets scoped per user.
 */
export function saveUserCustomPresets(userId: string | null | undefined, presets: WorkspaceAiPreset[]): void {
  const key = getUserPresetStorageKey(userId);
  const customOnly = presets.filter(p => p.scope === 'custom');
  safeLocalStorage.setItem(key, JSON.stringify(customOnly));
}

/**
 * Loads user personalization preferences (default preset, preferred model, style, mode).
 */
export function loadUserPersonalization(userId?: string | null): UserPersonalizationPreferences {
  const key = getUserPersonalizationStorageKey(userId);
  const raw = safeLocalStorage.getItem(key);
  const fallback: UserPersonalizationPreferences = {
    defaultPresetId: DEFAULT_PRESET_ID,
    preferredResponseMode: 'Seimbang',
    preferredResponseStyle: 'Default'
  };

  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fallback;

    return {
      defaultPresetId: typeof parsed.defaultPresetId === 'string' && parsed.defaultPresetId.trim()
        ? parsed.defaultPresetId.trim()
        : DEFAULT_PRESET_ID,
      preferredModelId: typeof parsed.preferredModelId === 'string' && parsed.preferredModelId.trim()
        ? parsed.preferredModelId.trim()
        : undefined,
      preferredResponseMode: typeof parsed.preferredResponseMode === 'string' && (VALID_RESPONSE_MODES as readonly string[]).includes(parsed.preferredResponseMode)
        ? (parsed.preferredResponseMode as any)
        : 'Seimbang',
      preferredResponseStyle: typeof parsed.preferredResponseStyle === 'string' && (VALID_RESPONSE_STYLES as readonly string[]).includes(parsed.preferredResponseStyle)
        ? (parsed.preferredResponseStyle as any)
        : 'Default'
    };
  } catch {
    return fallback;
  }
}

/**
 * Saves user personalization preferences.
 */
export function saveUserPersonalization(
  userId: string | null | undefined,
  preferences: UserPersonalizationPreferences
): void {
  const key = getUserPersonalizationStorageKey(userId);
  safeLocalStorage.setItem(key, JSON.stringify(preferences));
}

/**
 * Loads active preset selection for current session/user.
 */
export function loadActivePresetId(userId?: string | null): PresetId {
  const key = getUserActivePresetStorageKey(userId);
  const stored = safeLocalStorage.getItem(key);
  if (stored && stored.trim()) return stored.trim();
  const personalization = loadUserPersonalization(userId);
  return personalization.defaultPresetId || DEFAULT_PRESET_ID;
}

/**
 * Saves active preset selection for current user.
 */
export function saveActivePresetId(userId: string | null | undefined, presetId: PresetId): void {
  const key = getUserActivePresetStorageKey(userId);
  safeLocalStorage.setItem(key, presetId);
}

/**
 * Generates a concise human-readable summary of a preset configuration.
 * e.g., "Auto · Mendalam · Akademik"
 */
export function getPresetSummary(preset: WorkspaceAiPreset, manualModelName?: string): string {
  const parts: string[] = [];

  if (manualModelName) {
    parts.push(manualModelName);
  } else if (preset.routingMode === 'manual' && preset.preferredModelId) {
    parts.push(preset.preferredModelId);
  } else {
    parts.push('Auto');
  }

  if (preset.responseMode) {
    parts.push(preset.responseMode);
  }

  if (preset.responseStyle && preset.responseStyle !== 'Default') {
    parts.push(preset.responseStyle);
  } else if (preset.taskCategory && preset.taskCategory !== 'general_chat') {
    const formattedTask = preset.taskCategory
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    parts.push(formattedTask);
  }

  return parts.join(' · ');
}

/**
 * Formats a snapshot of the active preset configuration for the outgoing request.
 */
export function buildPresetRequestSnapshot(
  preset: WorkspaceAiPreset,
  actualSelectedModelId: string
): PresetSelectionSnapshot {
  const isAuto = actualSelectedModelId === AUTO_ROUTING_MODEL_ID;
  return {
    presetId: preset.id,
    presetName: preset.name,
    routingMode: isAuto ? 'auto' : 'manual',
    selectedModelId: actualSelectedModelId,
    taskCategory: preset.taskCategory,
    latencyPreference: preset.latencyPreference,
    qualityPreference: preset.qualityPreference,
    responseMode: preset.responseMode,
    responseStyle: preset.responseStyle
  };
}
