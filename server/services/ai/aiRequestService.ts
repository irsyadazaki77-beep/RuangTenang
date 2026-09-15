import { getGenAIClient, DEFAULT_AI_MODEL, RESILIENT_FALLBACK_AI_MODEL, CALMING_FALLBACK_MESSAGE } from '../../config/aiConfig.js';
import { aiContextBuilder } from './aiContextBuilder.js';
import { aiSafetyService } from './aiSafetyService.js';
import { aiModelRouter } from './aiModelRouter.js';
import { scanAndSanitizePII } from '../piiService.js';
import { getLocalFallbackResponse } from '../../routes/fallbackAi.js';
import { isModelAllowedForTier, getActualGeminiModel } from './aiModelRegistry.js';

export interface AiRequestOptions {
  userId?: string;
  userTier?: string;
  requestedModelId: string;
  prompt: string;
  history?: Array<{ role: 'user' | 'model'; parts: { text: string }[] }>;
  attachments?: any[];
  systemInstruction?: string;
  abortSignal?: AbortSignal;
}

/**
 * Creates an empathetic, smooth-streaming async generator when all AI models fail or are rate-limited.
 */
async function* createCalmingFallbackStream(fallbackText: string) {
  const words = fallbackText.split(' ');
  for (let i = 0; i < words.length; i++) {
    const chunk = (i === 0 ? '' : ' ') + words[i];
    yield {
      text: chunk,
      candidates: [{ content: { parts: [{ text: chunk }] } }]
    };
    await new Promise(resolve => setTimeout(resolve, 25));
  }
}

export const aiRequestService = {
  async generateChatResponse(options: AiRequestOptions): Promise<{ text: string; modelUsed: string; isFallback: boolean }> {
    const { userId, userTier = 'Free', requestedModelId, prompt, history = [], systemInstruction, abortSignal, attachments = [] } = options;

    if (aiSafetyService.detectPromptInjection(prompt)) {
      throw new Error('PROMPT_INJECTION_DETECTED');
    }

    const sanitizedPrompt = scanAndSanitizePII(prompt).sanitizedText;
    const sanitizedHistory = history.slice(-10).map(h => ({
      ...h,
      parts: (h.parts || []).map(p => {
        let text = (p.text || '').substring(0, 1000);
        text = scanAndSanitizePII(text).sanitizedText;
        if (aiSafetyService.detectPromptInjection(text)) {
          text = '[REDACTED_UNTRUSTED_HISTORY_INJECTION]';
        }
        return { text };
      })
    }));

    const crisisCheck = aiSafetyService.detectCrisis(sanitizedPrompt);
    if (crisisCheck.isCrisis) {
      return {
        text: aiSafetyService.getCrisisSafeResponse(),
        modelUsed: 'deterministic-crisis-policy',
        isFallback: true
      };
    }

    const userParts: any[] = [{ text: sanitizedPrompt }];
    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        if (att.base64) {
          const base64Data = att.base64.includes(',') ? att.base64.split(',')[1] : att.base64;
          userParts.push({
            inlineData: {
              data: base64Data,
              mimeType: att.mimeType
            }
          });
        }
      });
    }

    const isAnonymous = !userId || userId === 'guest';
    const outputTokens = isAnonymous ? 300 : 800;
    
    const abortController = new AbortController();
    if (abortSignal) {
      if (abortSignal.aborted) {
        abortController.abort();
      } else {
        abortSignal.addEventListener('abort', () => abortController.abort(), { once: true });
      }
    }
    const timeoutId = setTimeout(() => abortController.abort(), 15000);

    let fullSystemInstruction = systemInstruction || 'Kamu adalah Teman RuangTenang AI, asisten pendamping reflektif mahasiswa yang sangat hangat, ramah, merangkul, dan empati. Berikan tanggapan yang menenangkan dengan bahasa yang hangat serta gunakan emoji (seperti 🌿, 🤍, 🤗, ✨, ☕, 🫂, 🔐) secara alami. Tegaskan bahwa privasi dan keamanan ceritanya dijaga sesuai kebijakan privasi kami, dan kamu mendengarkan tanpa menghakimi. Kamu BUKAN profesional medis, JANGAN melakukan diagnosis medis atau merekomendasikan resep.';

    if (userId && !isAnonymous && !fullSystemInstruction.includes('[CONTEXT_BOUNDARIES]')) {
       const userContext = await aiContextBuilder.buildContext({ userId, abortSignal });
       if (userContext.systemContext) {
         fullSystemInstruction += `\n\n${userContext.systemContext}`;
       }
    }

    const aiClient = getGenAIClient();
    if (!aiClient) {
      clearTimeout(timeoutId);
      console.warn('[AI_RESILIENCE] Gemini client unavailable (missing GEMINI_API_KEY). Using empathetic fallback.');
      const localFallback = getLocalFallbackResponse(prompt);
      return {
        text: localFallback.text || CALMING_FALLBACK_MESSAGE,
        modelUsed: 'local-empathetic-fallback',
        isFallback: true
      };
    }

    try {
      const { response, modelUsed, isFallback } = await aiModelRouter.executeWithFallback(
        requestedModelId || DEFAULT_AI_MODEL, 
        userTier, 
        async (modelName) => {
          return await aiClient.models.generateContent({
             model: modelName,
             contents: [...sanitizedHistory, { role: 'user', parts: userParts }],
             config: {
               systemInstruction: fullSystemInstruction,
               temperature: 0.6,
               maxOutputTokens: outputTokens,
             }
          });
        }, 
        { allowFallback: true, timeoutMs: 15000 }
      );
      clearTimeout(timeoutId);

      const outputText = response.text || '';
      
      const validation = aiSafetyService.validateOutput(outputText);
      if (!validation.isValid) {
        console.warn(`[AI_REQUEST_SERVICE] Output validation failed: ${validation.reason}`);
        return {
          text: 'Maaf, respons yang saya siapkan tidak dapat ditampilkan karena aturan keamanan. Jika Anda memerlukan bantuan khusus, mohon hubungi profesional medis atau konselor.',
          modelUsed: 'safety-override',
          isFallback: true
        };
      }

      return { text: outputText, modelUsed, isFallback };
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(`[AI_RESILIENCE] Both AI models failed for chat response (${err?.message}). Returning empathetic fallback.`);
      const localFallback = getLocalFallbackResponse(prompt);
      return {
        text: localFallback.text || CALMING_FALLBACK_MESSAGE,
        modelUsed: 'local-empathetic-fallback',
        isFallback: true
      };
    }
  },

  async generateStreamResponse(options: AiRequestOptions): Promise<{ stream: AsyncGenerator<any, any, unknown>, modelUsed: string }> {
    const { userId, userTier = 'Free', requestedModelId, prompt, history = [], systemInstruction, abortSignal, attachments = [] } = options;

    if (aiSafetyService.detectPromptInjection(prompt)) {
      throw new Error('PROMPT_INJECTION_DETECTED');
    }

    const sanitizedPrompt = scanAndSanitizePII(prompt).sanitizedText;
    
    const userParts: any[] = [{ text: sanitizedPrompt }];
    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        if (att.base64) {
          const base64Data = att.base64.includes(',') ? att.base64.split(',')[1] : att.base64;
          userParts.push({
            inlineData: {
              data: base64Data,
              mimeType: att.mimeType
            }
          });
        }
      });
    }
    
    const sanitizedHistory = history.slice(-10).map(h => ({
      ...h,
      parts: (h.parts || []).map(p => {
        let text = (p.text || '').substring(0, 1000);
        text = scanAndSanitizePII(text).sanitizedText;
        if (aiSafetyService.detectPromptInjection(text)) {
          text = '[REDACTED_UNTRUSTED_HISTORY_INJECTION]';
        }
        return { text };
      })
    }));

    const crisisCheck = aiSafetyService.detectCrisis(sanitizedPrompt);
    if (crisisCheck.isCrisis) {
      throw new Error('CRISIS_DETECTED');
    }

    const isAnonymous = !userId || userId === 'guest';
    const outputTokens = isAnonymous ? 400 : 1000;
    
    const abortController = new AbortController();
    if (abortSignal) {
      if (abortSignal.aborted) {
        abortController.abort();
      } else {
        abortSignal.addEventListener('abort', () => abortController.abort(), { once: true });
      }
    }
    const timeoutId = setTimeout(() => abortController.abort(), 60000);

    let fullSystemInstruction = systemInstruction || 'Kamu adalah Teman RuangTenang AI, asisten pendamping reflektif mahasiswa yang sangat hangat, ramah, merangkul, dan empati. Berikan tanggapan yang menenangkan dengan bahasa yang hangat serta gunakan emoji (seperti 🌿, 🤍, 🤗, ✨, ☕, 🫂, 🔐) secara alami. Tegaskan bahwa privasi dan keamanan ceritanya dijaga sesuai kebijakan privasi kami, dan kamu mendengarkan tanpa menghakimi. Kamu BUKAN profesional medis, JANGAN melakukan diagnosis medis atau merekomendasikan resep.';

    if (userId && !isAnonymous && !fullSystemInstruction.includes('[CONTEXT_BOUNDARIES]')) {
       const userContext = await aiContextBuilder.buildContext({ userId, abortSignal });
       if (userContext.systemContext) {
         fullSystemInstruction += `\n\n${userContext.systemContext}`;
       }
    }

    const aiClient = getGenAIClient();
    if (!aiClient) {
      clearTimeout(timeoutId);
      console.warn('[AI_RESILIENCE] Gemini client unavailable for streaming. Activating calming text stream.');
      const localFallback = getLocalFallbackResponse(prompt);
      const fallbackText = localFallback.text || CALMING_FALLBACK_MESSAGE;
      return {
        stream: createCalmingFallbackStream(fallbackText),
        modelUsed: 'local-empathetic-fallback'
      };
    }

    let primaryModel = requestedModelId || DEFAULT_AI_MODEL;
    if (!isModelAllowedForTier(requestedModelId, userTier)) {
      primaryModel = DEFAULT_AI_MODEL;
    }

    const actualPrimary = getActualGeminiModel(primaryModel);

    // 1. Attempt Primary Model Stream with Retry
    let primaryError: any = null;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.info(`[AI_RESILIENCE] Streaming with primary model "${primaryModel}" (${actualPrimary}) - Attempt ${attempt + 1}/${maxRetries + 1}...`);
        const primaryStream = await aiClient.models.generateContentStream({
          model: actualPrimary,
          contents: [...sanitizedHistory, { role: 'user', parts: userParts }],
          config: {
            systemInstruction: fullSystemInstruction,
            temperature: 0.6,
            maxOutputTokens: outputTokens,
          }
        });
        clearTimeout(timeoutId);
        aiModelRouter.recordSuccess();
        return { stream: primaryStream, modelUsed: primaryModel };
      } catch (err: any) {
        primaryError = err;
        console.warn(`[AI_RESILIENCE] Primary stream attempt ${attempt + 1} failed: ${err?.message || err}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 400));
        }
      }
    }

    // 2. Switch to Internal Fallback Model Stream (lighter / faster)
    const fallbackModel = RESILIENT_FALLBACK_AI_MODEL;
    const actualFallback = getActualGeminiModel(fallbackModel);
    console.warn(`[AI_RESILIENCE] Primary stream model exhausted (${primaryError?.message}). Switching to internal fallback stream model "${fallbackModel}" (${actualFallback})...`);

    for (let fallbackAttempt = 0; fallbackAttempt <= 1; fallbackAttempt++) {
      try {
        console.info(`[AI_RESILIENCE] Streaming with fallback model "${fallbackModel}" - Attempt ${fallbackAttempt + 1}/2...`);
        const fallbackStream = await aiClient.models.generateContentStream({
          model: actualFallback,
          contents: [...sanitizedHistory, { role: 'user', parts: userParts }],
          config: {
            systemInstruction: fullSystemInstruction,
            temperature: 0.6,
            maxOutputTokens: Math.min(outputTokens, 600),
          }
        });
        clearTimeout(timeoutId);
        aiModelRouter.recordSuccess();
        return { stream: fallbackStream, modelUsed: fallbackModel };
      } catch (fallbackErr: any) {
        console.warn(`[AI_RESILIENCE] Fallback stream attempt ${fallbackAttempt + 1} failed: ${fallbackErr?.message || fallbackErr}`);
        if (fallbackAttempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // 3. Empathetic Fallback Text Stream (If both models fail, gracefully stream reassuring message)
    clearTimeout(timeoutId);
    aiModelRouter.recordFailure();
    console.error('[AI_RESILIENCE] Both primary and fallback Gemini models failed or timed out. Activating calming empathetic stream.');

    const localFallback = getLocalFallbackResponse(prompt);
    const fallbackText = localFallback.text || CALMING_FALLBACK_MESSAGE;

    return {
      stream: createCalmingFallbackStream(fallbackText),
      modelUsed: 'local-empathetic-fallback'
    };
  }
};
