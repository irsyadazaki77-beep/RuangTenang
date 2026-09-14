import { getGenAIClient, isAiAvailable } from '../../config/aiConfig.js';
import { isModelAllowedForTier, getActualGeminiModel } from './aiModelRegistry.js';

export type ModelTier = 'PRIMARY' | 'FALLBACK' | 'COMPLEX' | 'FAST';

// Circuit Breaker State
let circuitFailures = 0;
const MAX_FAILURES_BEFORE_OPEN = 5;
let circuitOpenUntil = 0;

export const aiModelRouter = {
  getCircuitState() {
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
      // Open circuit for 30 seconds
      circuitOpenUntil = Date.now() + 30000;
      console.warn(`[CIRCUIT_BREAKER] AI service circuit OPENED. Rejecting requests for 30s.`);
    }
  },

  async executeWithTimeoutAndRetry(
    modelName: string, 
    generateFn: (model: string) => Promise<any>,
    options: { timeoutMs?: number; retries?: number } = {}
  ): Promise<any> {
    const timeoutMs = options.timeoutMs || 15000;
    const maxRetries = options.retries || 2;
    let attempt = 0;
    let lastError: Error | null = null;

    if (this.getCircuitState() === 'OPEN') {
      throw new Error('AI_CIRCUIT_OPEN');
    }

    while (attempt <= maxRetries) {
      try {
        const result = await Promise.race([
          generateFn(modelName),
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs))
        ]);
        this.recordSuccess();
        return result;
      } catch (err: any) {
        lastError = err;
        attempt++;
        
        const errMsg = (err.message || String(err)).toLowerCase();
        console.warn(`[AI_MODEL_ROUTER] Attempt ${attempt} failed for ${modelName}: ${err.message || 'Unknown error'}`);
        
        // Define non-transient error classification
        const isNonTransient = 
          errMsg.includes('safety_block') || 
          errMsg.includes('safety') || 
          errMsg.includes('policy') || 
          errMsg.includes('validation') || 
          errMsg.includes('unauthorized') || 
          errMsg.includes('api_key') || 
          errMsg.includes('invalid') || 
          errMsg.includes('auth') ||
          (err.status && [400, 401, 403, 422].includes(Number(err.status)));

        if (isNonTransient) {
          console.warn(`[AI_MODEL_ROUTER] Non-transient failure detected (${err.message || err}). Aborting retry loop immediately.`);
          break; // Don't trip circuit breaker for user/auth errors
        }
        
        // Trip circuit breaker for repeated systemic failures (if max retries exhausted for this request)
        if (attempt > maxRetries) {
          this.recordFailure();
        }
        
        if (attempt <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        }
      }
    }
    throw lastError || new Error('AI execution failed after retries');
  },

  async executeWithFallback(
    requestedModelId: string,
    userTier: string,
    generateFn: (model: string) => Promise<any>,
    options: { timeoutMs?: number; allowFallback?: boolean } = {}
  ): Promise<{ response: any; modelUsed: string }> {
    const aiClient = getGenAIClient();
    if (!aiClient || !isAiAvailable()) {
      throw new Error('AI_UNAVAILABLE');
    }

    let primaryModel = requestedModelId;
    if (!isModelAllowedForTier(requestedModelId, userTier)) {
      console.warn(`[AI_MODEL_ROUTER] Model ${requestedModelId} not allowed for tier ${userTier}. Falling back to default.`);
      primaryModel = 'gemini-3.1-flash-lite';
    }

    const actualPrimary = getActualGeminiModel(primaryModel);

    try {
      const response = await this.executeWithTimeoutAndRetry(actualPrimary, generateFn, { timeoutMs: options.timeoutMs });
      return { response, modelUsed: primaryModel };
    } catch (err: any) {
      if (options.allowFallback === false || err.message === 'SAFETY_BLOCK') {
        throw err;
      }
      console.warn(`[AI_MODEL_ROUTER] Switching to fallback from ${primaryModel}`);
      const fallbackModel = 'gemini-3.1-flash-lite';
      try {
         const response = await this.executeWithTimeoutAndRetry(getActualGeminiModel(fallbackModel), generateFn, { timeoutMs: 10000, retries: 1 });
         return { response, modelUsed: fallbackModel };
      } catch (fallbackErr: any) {
         throw new Error(`AI_FALLBACK_FAILED: ${fallbackErr.message || 'Unknown'}`);
      }
    }
  }
};
