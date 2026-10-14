import { 
  DEFAULT_KERJA_PROFILE_ID, 
  isKerjaProfile, 
  KerjaProfileId,
  AUTO_ROUTING_MODEL_ID
} from '../../../lib/aiModels';

const MODEL_PREFERENCE_KEY = 'ruangkerja.model';

function getModelPreferenceKey(userId?: string): string {
  return userId ? `${MODEL_PREFERENCE_KEY}:${encodeURIComponent(userId)}` : MODEL_PREFERENCE_KEY;
}

export interface LoadedWorkspaceModelPreference {
  modelId: string;
  wasReset: boolean;
}

export function migrateLegacyWorkspaceModelToProfile(savedModel?: string | null): KerjaProfileId {
  if (!savedModel) return DEFAULT_KERJA_PROFILE_ID;
  if (isKerjaProfile(savedModel)) return savedModel;

  const lower = savedModel.toLowerCase();
  if (/reasoner|pro|opus|120b|550b|o1|o3|sonnet|r1|hard|kompleks/i.test(lower)) {
    return 'kerja-hard';
  }
  if (/flash|mini|haiku|fast|8b|nano|cepat|ringan/i.test(lower)) {
    return 'kerja-fast';
  }
  return DEFAULT_KERJA_PROFILE_ID;
}

export function getWorkspaceSessionStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.sessionStorage; } catch { return null; }
}

export function loadWorkspaceModelPreference(storage: Pick<Storage, 'getItem'> | null, userId?: string): LoadedWorkspaceModelPreference {
  try {
    const savedModel = storage?.getItem(getModelPreferenceKey(userId));
    if (!savedModel) {
      return { modelId: AUTO_ROUTING_MODEL_ID, wasReset: false };
    }
    return { modelId: savedModel, wasReset: false };
  } catch {
    return { modelId: AUTO_ROUTING_MODEL_ID, wasReset: false };
  }
}

export function readWorkspaceModelPreference(storage: Pick<Storage, 'getItem'> | null, userId?: string): string {
  return loadWorkspaceModelPreference(storage, userId).modelId;
}

export function saveWorkspaceModelPreference(storage: Pick<Storage, 'setItem'> | null, modelId: string, userId?: string): void {
  if (!modelId.trim()) return;
  try { storage?.setItem(getModelPreferenceKey(userId), modelId); } catch { /* storage may be unavailable */ }
}
