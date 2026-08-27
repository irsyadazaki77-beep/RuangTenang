import { getGenAIClient } from '../../config/aiConfig.js';
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
  systemInstruction?: string;
}

export const aiRequestService = {
  async generateChatResponse(options: AiRequestOptions): Promise<{ text: string; modelUsed: string; isFallback: boolean }> {
    const { userId, userTier = 'Free', requestedModelId, prompt, history = [], systemInstruction } = options;

    if (aiSafetyService.detectPromptInjection(prompt)) {
      throw new Error('PROMPT_INJECTION_DETECTED');
    }

    const sanitizedPrompt = scanAndSanitizePII(prompt).sanitizedText;
    const sanitizedHistory = history.map(h => ({
      ...h,
      parts: h.parts.map(p => ({
        ...p,
        text: scanAndSanitizePII(p.text).sanitizedText
      }))
    }));

    const crisisCheck = aiSafetyService.detectCrisis(sanitizedPrompt);
    if (crisisCheck.isCrisis) {
      return {
        text: aiSafetyService.getCrisisSafeResponse(),
        modelUsed: 'deterministic-crisis-policy',
        isFallback: true
      };
    }

    let fullSystemInstruction = systemInstruction || 'Kamu adalah Teman RuangTenang AI, asisten pendamping reflektif mahasiswa yang sangat hangat, ramah, merangkul, dan empati. Berikan tanggapan yang menenangkan dengan bahasa yang hangat serta gunakan emoji (seperti 🌿, 🤍, 🤗, ✨, ☕, 🫂, 🔐) secara alami. Tegaskan bahwa privasi dan keamanan ceritanya dijaga sesuai kebijakan privasi kami, dan kamu mendengarkan tanpa menghakimi. Kamu BUKAN profesional medis, JANGAN melakukan diagnosis medis atau merekomendasikan resep.';

    if (userId) {
       const userContext = await aiContextBuilder.buildContext({ userId });
       if (userContext) {
         fullSystemInstruction += `\n\n${userContext}`;
       }
    }

    const aiClient = getGenAIClient();
    if (!aiClient) {
      return {
        text: getLocalFallbackResponse(prompt).text,
        modelUsed: 'local-fallback',
        isFallback: true
      };
    }

    try {
      const { response, modelUsed } = await aiModelRouter.executeWithFallback(requestedModelId, userTier, async (modelName) => {
        return await aiClient.models.generateContent({
           model: modelName,
           contents: [...sanitizedHistory, { role: 'user', parts: [{ text: sanitizedPrompt }] }],
           config: {
             systemInstruction: fullSystemInstruction,
             temperature: 0.6,
             maxOutputTokens: 800
           }
        });
      }, { allowFallback: true });

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

      return { text: outputText, modelUsed, isFallback: false };
    } catch (err: any) {
      console.error(`[AI_REQUEST_SERVICE] Final failure: ${err.message}`);
      return {
        text: getLocalFallbackResponse(prompt).text,
        modelUsed: 'local-fallback-after-error',
        isFallback: true
      };
    }
  },

  async generateStreamResponse(options: AiRequestOptions): Promise<{ stream: AsyncGenerator<any, any, unknown>, modelUsed: string }> {
    const { userId, userTier = 'Free', requestedModelId, prompt, history = [], systemInstruction } = options;

    if (aiSafetyService.detectPromptInjection(prompt)) {
      throw new Error('PROMPT_INJECTION_DETECTED');
    }

    const sanitizedPrompt = scanAndSanitizePII(prompt).sanitizedText;
    
    const sanitizedHistory = history.map(h => ({
      ...h,
      parts: h.parts.map(p => ({
        ...p,
        text: scanAndSanitizePII(p.text).sanitizedText
      }))
    }));

    const crisisCheck = aiSafetyService.detectCrisis(sanitizedPrompt);
    if (crisisCheck.isCrisis) {
      throw new Error('CRISIS_DETECTED');
    }

    let fullSystemInstruction = systemInstruction || 'Kamu adalah Teman RuangTenang AI, asisten pendamping reflektif mahasiswa yang sangat hangat, ramah, merangkul, dan empati. Berikan tanggapan yang menenangkan dengan bahasa yang hangat serta gunakan emoji (seperti 🌿, 🤍, 🤗, ✨, ☕, 🫂, 🔐) secara alami. Tegaskan bahwa privasi dan keamanan ceritanya dijaga sesuai kebijakan privasi kami, dan kamu mendengarkan tanpa menghakimi. Kamu BUKAN profesional medis, JANGAN melakukan diagnosis medis atau merekomendasikan resep.';

    if (userId) {
       const userContext = await aiContextBuilder.buildContext({ userId });
       if (userContext) {
         fullSystemInstruction += `\n\n${userContext}`;
       }
    }

    const aiClient = getGenAIClient();
    if (!aiClient) {
      throw new Error('AI_UNAVAILABLE');
    }

    let primaryModel = requestedModelId;
    if (!isModelAllowedForTier(requestedModelId, userTier)) {
      primaryModel = 'gemini-3.1-flash-lite';
    }

    const actualPrimary = getActualGeminiModel(primaryModel);

    try {
       const stream = await aiClient.models.generateContentStream({
           model: actualPrimary,
           contents: [...sanitizedHistory, { role: 'user', parts: [{ text: sanitizedPrompt }] }],
           config: {
             systemInstruction: fullSystemInstruction,
             temperature: 0.6,
             maxOutputTokens: 1000
           }
       });
       return { stream, modelUsed: primaryModel };
    } catch (err: any) {
      console.warn(`[AI_REQUEST_SERVICE] Stream primary failed (${err.message}), attempting fallback.`);
      const fallbackModel = 'gemini-2.5-flash';
      try {
         const stream = await aiClient.models.generateContentStream({
             model: fallbackModel,
             contents: [...sanitizedHistory, { role: 'user', parts: [{ text: sanitizedPrompt }] }],
             config: {
               systemInstruction: fullSystemInstruction,
               temperature: 0.6,
               maxOutputTokens: 1000
             }
         });
         return { stream, modelUsed: fallbackModel };
      } catch (fallbackErr: any) {
         throw new Error('AI_STREAM_FAILED');
      }
    }
  }
};
