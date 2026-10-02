import { useEffect, useState } from 'react';
import { apiClient } from './apiClient';
import { AiModelCatalogResponse, AiModelOption, DEFAULT_AI_MODEL_ID } from './aiModels';

let cachedCatalog: AiModelCatalogResponse | null = null;
let pendingRequest: Promise<AiModelCatalogResponse | null> | null = null;

export function getCachedAiModelCatalog(): AiModelCatalogResponse | null { return cachedCatalog; }

export async function loadAiModelCatalog(): Promise<AiModelCatalogResponse | null> {
  if (cachedCatalog) return cachedCatalog;
  if (!pendingRequest) {
    pendingRequest = apiClient.get<AiModelCatalogResponse>('/api/v1/chat/models').then(result => {
      if (!result.success || !result.data || !Array.isArray(result.data.models)) return null;
      cachedCatalog = result.data;
      return cachedCatalog;
    }).catch(() => null).finally(() => { pendingRequest = null; });
  }
  return pendingRequest;
}

export function useAiModelCatalog() {
  const [models, setModels] = useState<AiModelOption[]>(cachedCatalog?.models ?? []);
  const [defaultModel, setDefaultModel] = useState(cachedCatalog?.defaultModel ?? DEFAULT_AI_MODEL_ID);
  const [loading, setLoading] = useState(!cachedCatalog);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    loadAiModelCatalog().then(catalog => {
      if (!active) return;
      if (catalog) {
        setModels(catalog.models);
        setDefaultModel(catalog.defaultModel);
        setError(false);
      } else {
        setError(true);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return { models, defaultModel, loading, error };
}
