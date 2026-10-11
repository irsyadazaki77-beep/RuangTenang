import { AUTO_ROUTING_MODEL_ID } from '../../../lib/aiModels';
import { getCachedAiModelCatalog } from '../../../lib/aiModelCatalog';

const MODEL_PREFERENCE_KEY = 'ruangkerja.model';

function getModelPreferenceKey(userId?: string): string {
  return userId ? `${MODEL_PREFERENCE_KEY}:${encodeURIComponent(userId)}` : MODEL_PREFERENCE_KEY;
}

export interface LoadedWorkspaceModelPreference {
  modelId: string;
  wasReset: boolean;
}

export function getWorkspaceSessionStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.sessionStorage; } catch { return null; }
}

export function loadWorkspaceModelPreference(storage: Pick<Storage, 'getItem'> | null, userId?: string): LoadedWorkspaceModelPreference {
  try {
    const savedModel = storage?.getItem(getModelPreferenceKey(userId));
    const catalog = getCachedAiModelCatalog();
    const valid = Boolean(savedModel && (savedModel === AUTO_ROUTING_MODEL_ID || !catalog || catalog.models.some(model => model.id === savedModel)));
    return { modelId: savedModel && valid ? savedModel : AUTO_ROUTING_MODEL_ID, wasReset: Boolean(savedModel && catalog && !valid) };
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
