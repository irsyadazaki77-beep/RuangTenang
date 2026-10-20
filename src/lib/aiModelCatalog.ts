import { useEffect, useState } from 'react';
import { apiClient } from './apiClient';
import {
  AiModelCatalogResponse,
  AiModelOption,
  AiProfileOption,
  DEFAULT_AI_MODEL_ID,
  DEFAULT_TENANG_PROFILE_ID,
  DEFAULT_KERJA_PROFILE_ID,
  TenangProfileId,
  KerjaProfileId
} from './aiModels';

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
  const [profiles, setProfiles] = useState<AiProfileOption[]>(cachedCatalog?.profiles ?? []);
  const [defaultModel, setDefaultModel] = useState(cachedCatalog?.defaultModel ?? DEFAULT_AI_MODEL_ID);
  const [defaultTenangProfile, setDefaultTenangProfile] = useState<TenangProfileId>(cachedCatalog?.defaultTenangProfile ?? DEFAULT_TENANG_PROFILE_ID);
  const [defaultKerjaProfile, setDefaultKerjaProfile] = useState<KerjaProfileId>(cachedCatalog?.defaultKerjaProfile ?? DEFAULT_KERJA_PROFILE_ID);
  const [loading, setLoading] = useState(!cachedCatalog);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    loadAiModelCatalog().then(catalog => {
      if (!active) return;
      if (catalog) {
        setModels(catalog.models);
        setProfiles(catalog.profiles ?? []);
        setDefaultModel(catalog.defaultModel);
        if (catalog.defaultTenangProfile) setDefaultTenangProfile(catalog.defaultTenangProfile);
        if (catalog.defaultKerjaProfile) setDefaultKerjaProfile(catalog.defaultKerjaProfile);
        setError(false);
      } else {
        setError(true);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return {
    models,
    profiles,
    defaultModel,
    defaultTenangProfile,
    defaultKerjaProfile,
    loading,
    error
  };
}
