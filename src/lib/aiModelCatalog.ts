import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
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

const cachedCatalogs = new Map<string, AiModelCatalogResponse>();
const pendingRequests = new Map<string, Promise<AiModelCatalogResponse | null>>();
let mostRecentlyLoadedTier: string | null = null;

export function getCachedAiModelCatalog(tier?: string): AiModelCatalogResponse | null {
  const cacheKey = tier ?? mostRecentlyLoadedTier ?? 'Free';
  return cachedCatalogs.get(cacheKey) ?? null;
}

export function isOllamaOnlyCatalog(models: readonly AiModelOption[]): boolean {
  const configuredProviders = new Set(
    models.filter(model => model.availability !== 'provider_not_configured').map(model => model.provider)
  );
  return configuredProviders.size === 1 && configuredProviders.has('ollama');
}

export async function loadAiModelCatalog(tier = 'Free', forceRefresh = false): Promise<AiModelCatalogResponse | null> {
  const cached = cachedCatalogs.get(tier);
  if (cached && !forceRefresh) return cached;

  const pending = pendingRequests.get(tier);
  if (pending) return pending;

  const request = apiClient.get<AiModelCatalogResponse>('/api/v1/chat/models').then(result => {
    if (!result.success || !result.data || !Array.isArray(result.data.models)) return null;
    cachedCatalogs.set(tier, result.data);
    mostRecentlyLoadedTier = tier;
    return result.data;
  }).catch(() => null).finally(() => {
    if (pendingRequests.get(tier) === request) pendingRequests.delete(tier);
  });

  pendingRequests.set(tier, request);
  return request;
}

interface CatalogState {
  tier: string;
  catalog: AiModelCatalogResponse | null;
  loading: boolean;
  error: boolean;
}

export function useAiModelCatalog() {
  const { user, loading: authLoading } = useAuth();
  const tier = user?.tier || 'Free';
  const [state, setState] = useState<CatalogState>(() => ({
    tier,
    catalog: cachedCatalogs.get(tier) ?? null,
    loading: !cachedCatalogs.has(tier),
    error: false
  }));

  useEffect(() => {
    let active = true;

    if (authLoading) {
      setState(previous => previous.tier === tier
        ? { ...previous, loading: true }
        : { tier, catalog: null, loading: true, error: false });
      return () => { active = false; };
    }

    const cached = cachedCatalogs.get(tier);
    if (cached) {
      setState({ tier, catalog: cached, loading: false, error: false });
      return () => { active = false; };
    }

    setState({ tier, catalog: null, loading: true, error: false });
    loadAiModelCatalog(tier).then(catalog => {
      if (!active) return;
      setState({ tier, catalog, loading: false, error: !catalog });
    });

    return () => { active = false; };
  }, [authLoading, tier]);

  const refresh = useCallback(async () => {
    if (authLoading) return;
    setState(previous => previous.tier === tier
      ? { ...previous, loading: true, error: false }
      : { tier, catalog: null, loading: true, error: false });
    const catalog = await loadAiModelCatalog(tier, true);
    setState(previous => previous.tier === tier
      ? { tier, catalog: catalog ?? previous.catalog, loading: false, error: !catalog }
      : previous);
  }, [authLoading, tier]);

  const isCurrentTier = state.tier === tier;
  const catalog = isCurrentTier && !authLoading ? state.catalog : null;

  return {
    models: catalog?.models ?? [],
    profiles: catalog?.profiles ?? [],
    defaultModel: catalog?.defaultModel ?? DEFAULT_AI_MODEL_ID,
    defaultTenangProfile: catalog?.defaultTenangProfile ?? DEFAULT_TENANG_PROFILE_ID as TenangProfileId,
    defaultKerjaProfile: catalog?.defaultKerjaProfile ?? DEFAULT_KERJA_PROFILE_ID as KerjaProfileId,
    loading: authLoading || !isCurrentTier || state.loading,
    error: !authLoading && isCurrentTier && state.error,
    refresh
  };
}
