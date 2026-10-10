import { AUTO_ROUTING_MODEL_ID } from '../../../lib/aiModels';
import { getCachedAiModelCatalog } from '../../../lib/aiModelCatalog';

const MODEL_PREFERENCE_KEY = 'ruangkerja.model';

export interface LoadedWorkspaceModelPreference {
  modelId: string;
  wasReset: boolean;
}

export function getWorkspaceSessionStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.sessionStorage; } catch { return null; }
}

export function loadWorkspaceModelPreference(storage: Pick<Storage, 'getItem'> | null): LoadedWorkspaceModelPreference {
  try {
    const savedModel = storage?.getItem(MODEL_PREFERENCE_KEY);
    const catalog = getCachedAiModelCatalog();
    const valid = Boolean(savedModel && (savedModel === AUTO_ROUTING_MODEL_ID || !catalog || catalog.models.some(model => model.id === savedModel)));
    return { modelId: savedModel && valid ? savedModel : AUTO_ROUTING_MODEL_ID, wasReset: Boolean(savedModel && catalog && !valid) };
  } catch {
    return { modelId: AUTO_ROUTING_MODEL_ID, wasReset: false };
  }
}

export function readWorkspaceModelPreference(storage: Pick<Storage, 'getItem'> | null): string {
  return loadWorkspaceModelPreference(storage).modelId;
}

export function saveWorkspaceModelPreference(storage: Pick<Storage, 'setItem'> | null, modelId: string): void {
  if (!modelId.trim()) return;
  try { storage?.setItem(MODEL_PREFERENCE_KEY, modelId); } catch { /* storage may be unavailable */ }
}
