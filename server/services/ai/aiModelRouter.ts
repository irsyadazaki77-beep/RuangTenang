import { getGenAIClient, isAiAvailable } from '../../config/aiConfig.js';
import { isModelAllowedForTier, getModelInfo, getActualGeminiModel } from './aiModelRegistry.js';

export type ModelTier = 'PRIMARY' | 'FALLBACK' | 'COMPLEX' | 'FAST';

export const aiModelRouter = {
  async executeWithTimeoutAndRetry(
    modelName: string, 
    generateFn: (model: string) => Promise<any>,
    options: { timeoutMs?: number; retries?: number } = {}
  ): Promise<any> {
    const timeoutMs = options.timeoutMs || 15000;
    const maxRetries = options.retries || 2;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= maxRetries) {
      try {
        const result = await Promise.race([
          generateFn(modelName),
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs))
        ]);
        return result;
      } catch (err: any) {
        lastError = err;
        attempt++;
        
        console.warn(`[AI_MODEL_ROUTER] Attempt ${attempt} failed for ${modelName}: ${err.message || 'Unknown error'}`);
        
        if (err.message && err.message.includes('SAFETY_BLOCK')) {
          break;
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
      const fallbackModel = 'gemini-2.5-flash';
      try {
         const response = await this.executeWithTimeoutAndRetry(fallbackModel, generateFn, { timeoutMs: 10000, retries: 1 });
         return { response, modelUsed: fallbackModel };
      } catch (fallbackErr: any) {
         throw new Error(`AI_FALLBACK_FAILED: ${fallbackErr.message || 'Unknown'}`);
      }
    }
  }
};
