import { getGenAIClient, isAiAvailable, RESILIENT_FALLBACK_AI_MODEL } from '../../config/aiConfig.js';
import { getModelDefinition, isModelAllowedForTier } from './aiModelRegistry.js';
import { executeWithReliability, classifyAiError, getProviderCircuitState } from './aiReliabilityService.js';

export type ModelTier = 'PRIMARY' | 'FALLBACK' | 'COMPLEX' | 'FAST';

/** Compatibility facade for existing internal AI tools; request policy lives in aiReliabilityService. */
export const aiModelRouter = {
  getCircuitState(provider: 'gemini' | 'deepseek' | 'groq' | 'openrouter' = 'gemini'): 'OPEN' | 'HALF-OPEN' | 'CLOSED' {
    return getProviderCircuitState(provider);
  },
  recordSuccess() {},
  recordFailure() {},

  async executeWithTimeoutAndRetry<T>(modelName: string, generateFn: (model: string) => Promise<T>, _options: { timeoutMs?: number; retries?: number } = {}): Promise<T> {
    return executeWithReliability('gemini', () => generateFn(modelName));
  },

  async executeWithFallback<T>(
    requestedModelId: string,
    userTier: string,
    generateFn: (model: string) => Promise<T>,
    options: { timeoutMs?: number; allowFallback?: boolean } = {}
  ): Promise<{ response: T; modelUsed: string; isFallback: boolean }> {
    if (!getGenAIClient() || !isAiAvailable()) throw new Error('AI_UNAVAILABLE');
    if (!isModelAllowedForTier(requestedModelId, userTier)) throw new Error('MODEL_NOT_ALLOWED');
    const primary = getModelDefinition(requestedModelId);
    if (!primary || primary.provider !== 'gemini') throw new Error('MODEL_NOT_FOUND');
    try {
      return { response: await executeWithReliability('gemini', () => generateFn(primary.providerModelId)), modelUsed: primary.id, isFallback: false };
    } catch (error) {
      const classified = classifyAiError(error);
      if (options.allowFallback === false || !classified.retryable) throw classified;
      const fallback = getModelDefinition(RESILIENT_FALLBACK_AI_MODEL);
      if (!fallback || fallback.provider !== 'gemini' || !fallback.allowedTiers.includes(userTier as any)) throw classified;
      return { response: await executeWithReliability('gemini', () => generateFn(fallback.providerModelId)), modelUsed: fallback.id, isFallback: true };
    }
  }
};
