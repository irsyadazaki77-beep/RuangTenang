import { getGenAIClient, isAiAvailable, DEFAULT_AI_MODEL, RESILIENT_FALLBACK_AI_MODEL } from '../../config/aiConfig.js';
import { isModelAllowedForTier, getActualGeminiModel } from './aiModelRegistry.js';

export type ModelTier = 'PRIMARY' | 'FALLBACK' | 'COMPLEX' | 'FAST';

// Circuit Breaker State
let circuitFailures = 0;
const MAX_FAILURES_BEFORE_OPEN = 5;
let circuitOpenUntil = 0;

export const aiModelRouter = {
  getCircuitState(): 'OPEN' | 'HALF-OPEN' | 'CLOSED' {
    if (Date.now() < circuitOpenUntil) return 'OPEN';
    if (circuitFailures >= MAX_FAILURES_BEFORE_OPEN) return 'HALF-OPEN';
    return 'CLOSED';
  },
  
  recordSuccess() {
    circuitFailures = 0;
    circuitOpenUntil = 0;
  },
  
  recordFailure() {
    circuitFailures++;
    if (circuitFailures >= MAX_FAILURES_BEFORE_OPEN) {
      // Open circuit for 20 seconds to give backend/rate limits time to recover
      circuitOpenUntil = Date.now() + 20000;
      console.warn(`[AI_RESILIENCE] Circuit breaker OPENED. Cooling down AI requests for 20s.`);
    }
  },

  async executeWithTimeoutAndRetry<T>(
    modelName: string, 
    generateFn: (model: string) => Promise<T>,
    options: { timeoutMs?: number; retries?: number } = {}
  ): Promise<T> {
    const timeoutMs = options.timeoutMs || 15000;
    const maxRetries = options.retries ?? 2;
    let attempt = 0;
    let lastError: Error | null = null;

    if (this.getCircuitState() === 'OPEN') {
      console.warn(`[AI_RESILIENCE] Circuit is currently OPEN. Bypassing ${modelName} to activate immediate fallback.`);
      throw new Error('AI_CIRCUIT_OPEN');
    }

    while (attempt <= maxRetries) {
      try {
        console.info(`[AI_RESILIENCE] Attempting model "${modelName}" (Attempt ${attempt + 1}/${maxRetries + 1})...`);
        const result = await Promise.race([
          generateFn(modelName),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('AI_REQUEST_TIMEOUT')), timeoutMs)
          )
        ]);
        this.recordSuccess();
        return result;
      } catch (err: any) {
        lastError = err;
        attempt++;
        
        const errMsg = (err?.message || String(err)).toLowerCase();
        console.warn(`[AI_RESILIENCE] Attempt ${attempt} failed for "${modelName}": ${err?.message || 'Unknown error'}`);
        
        // Define non-transient error classification (e.g., prompt safety, invalid params, auth errors)
        const isNonTransient = 
          errMsg.includes('safety_block') || 
          errMsg.includes('safety') || 
          errMsg.includes('policy') || 
          errMsg.includes('validation') || 
          errMsg.includes('api_key') || 
          errMsg.includes('invalid') || 
          errMsg.includes('unauthorized') ||
          (err.status && [400, 401, 403, 422].includes(Number(err.status)));

        if (isNonTransient) {
          console.warn(`[AI_RESILIENCE] Non-transient failure detected (${err?.message}). Skipping retries for this model.`);
          break;
        }
        
        // Trip circuit breaker for repeated systemic failures
        if (attempt > maxRetries) {
          this.recordFailure();
        } else {
          // Short delay backoff (500ms, 1000ms)
          const delayMs = attempt * 500;
          console.info(`[AI_RESILIENCE] Retrying "${modelName}" in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    throw lastError || new Error(`AI execution failed after ${maxRetries} retries on ${modelName}`);
  },

  async executeWithFallback<T>(
    requestedModelId: string,
    userTier: string,
    generateFn: (model: string) => Promise<T>,
    options: { timeoutMs?: number; allowFallback?: boolean } = {}
  ): Promise<{ response: T; modelUsed: string; isFallback: boolean }> {
    const aiClient = getGenAIClient();
    if (!aiClient || !isAiAvailable()) {
      throw new Error('AI_UNAVAILABLE');
    }

    let primaryModel = requestedModelId || DEFAULT_AI_MODEL;
    if (!isModelAllowedForTier(requestedModelId, userTier)) {
      console.warn(`[AI_RESILIENCE] Model ${requestedModelId} not allowed for tier ${userTier}. Defaulting to ${DEFAULT_AI_MODEL}.`);
      primaryModel = DEFAULT_AI_MODEL;
    }

    const actualPrimary = getActualGeminiModel(primaryModel);

    // 1. Try Primary Model with up to 2 retries (Reduced timeout to 8s for instant responsiveness)
    try {
      const response = await this.executeWithTimeoutAndRetry(actualPrimary, generateFn, { 
        timeoutMs: options.timeoutMs || 8000,
        retries: 2
      });
      return { response, modelUsed: primaryModel, isFallback: false };
    } catch (primaryErr: any) {
      if (options.allowFallback === false || primaryErr?.message === 'SAFETY_BLOCK') {
        throw primaryErr;
      }

      // 2. Switch to Internal Fallback Model (lighter / faster)
      const fallbackModel = RESILIENT_FALLBACK_AI_MODEL;
      const actualFallback = getActualGeminiModel(fallbackModel);

      console.warn(`[AI_RESILIENCE] Primary model "${primaryModel}" failed (${primaryErr?.message}). Switching to internal fallback model "${fallbackModel}"...`);

      try {
        const response = await this.executeWithTimeoutAndRetry(actualFallback, generateFn, { 
          timeoutMs: 8000, 
          retries: 1 
        });
        console.info(`[AI_RESILIENCE] Fallback model "${fallbackModel}" succeeded!`);
        return { response, modelUsed: fallbackModel, isFallback: true };
      } catch (fallbackErr: any) {
        console.error(`[AI_RESILIENCE] Both primary ("${primaryModel}") and fallback ("${fallbackModel}") models failed:`, fallbackErr?.message || fallbackErr);
        throw new Error(`AI_ALL_MODELS_FAILED: ${fallbackErr?.message || 'Both primary and fallback models failed'}`);
      }
    }
  }
};
