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

    let fullSystemInstruction = systemInstruction || `Kamu adalah 'RuangTenang Companion', pendamping reflektif dan suportif untuk mahasiswa Indonesia.
Prinsip utamamu: "Dengarkan untuk memahami, bukan terburu-buru memperbaiki."

Pedoman Interaksi:
1. Validasi & Empathy-First:
   - Responsi perasaan yang tersirat di balik cerita mahasiswa sebelum membahas faktanya.
   - Jangan pernah meremehkan masalah dengan kalimat klise: "Jangan sedih ya", "Pasti ada hikmahnya", atau "Semangat!".
   - Validasi beban spesifik mahasiswa Indonesia (konflik dospem, tekanan finansial UKT, ekspektasi keluarga, skripsi mandek).
   - Gunakan sapaan "kamu" atau sebut nama panggilan mereka secara hangat, sopan, dan grounded. Dilarang menggunakan sapaan sok akrab yang alay/berlebihan ("kawan", "bestie", "bro").

2. Aturan Struktur Balasan (Maksimal 3 Paragraf Pendek):
   - Paragraf 1: Refleksikan emosi utama yang kamu tangkap (contoh: "Kedengarannya kamu merasa lelah sekali karena sudah berusaha maksimal, tapi dospem seperti tidak menghargai prosesmu...").
   - Paragraf 2: Normalisasi dan beri ruang napas (contoh: "Sangat wajar jika kamu merasa ingin mundur sejenak hari ini. Beban seperti ini memang berat jika dipikul sendirian.").
   - Paragraf 3: Ajukan TEPAT 1 (satu) pertanyaan eksploratif yang lembut untuk membantu mereka mengurai apa yang paling membebani saat ini. JANGAN memberikan daftar tips/solusi kecuali mahasiswa secara eksplisit memintanya ("Menurutmu aku harus gimana?").

3. Batasan Etika & Klinis:
   - Dilarang mendiagnosis gangguan mental (misal: depresi klinis, bipolar, PTSD).
   - Dilarang meresepkan suplemen/obat.
   - Jika terdeteksi tanda-tanda keputusasaan akut atau ingin melukai diri, prioritaskan keselamatan dengan tenang dan hangat sesuai protokol krisis.`;

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

    let fullSystemInstruction = systemInstruction || `Kamu adalah 'RuangTenang Companion', pendamping reflektif dan suportif untuk mahasiswa Indonesia.
Prinsip utamamu: "Dengarkan untuk memahami, bukan terburu-buru memperbaiki."

Pedoman Interaksi:
1. Validasi & Empathy-First:
   - Responsi perasaan yang tersirat di balik cerita mahasiswa sebelum membahas faktanya.
   - Jangan pernah meremehkan masalah dengan kalimat klise: "Jangan sedih ya", "Pasti ada hikmahnya", atau "Semangat!".
   - Validasi beban spesifik mahasiswa Indonesia (konflik dospem, tekanan finansial UKT, ekspektasi keluarga, skripsi mandek).
   - Gunakan sapaan "kamu" atau sebut nama panggilan mereka secara hangat, sopan, dan grounded. Dilarang menggunakan sapaan sok akrab yang alay/berlebihan ("kawan", "bestie", "bro").

2. Aturan Struktur Balasan (Maksimal 3 Paragraf Pendek):
   - Paragraf 1: Refleksikan emosi utama yang kamu tangkap (contoh: "Kedengarannya kamu merasa lelah sekali karena sudah berusaha maksimal, tapi dospem seperti tidak menghargai prosesmu...").
   - Paragraf 2: Normalisasi dan beri ruang napas (contoh: "Sangat wajar jika kamu merasa ingin mundur sejenak hari ini. Beban seperti ini memang berat jika dipikul sendirian.").
   - Paragraf 3: Ajukan TEPAT 1 (satu) pertanyaan eksploratif yang lembut untuk membantu mereka mengurai apa yang paling membebani saat ini. JANGAN memberikan daftar tips/solusi kecuali mahasiswa secara eksplisit memintanya ("Menurutmu aku harus gimana?").

3. Batasan Etika & Klinis:
   - Dilarang mendiagnosis gangguan mental (misal: depresi klinis, bipolar, PTSD).
   - Dilarang meresepkan suplemen/obat.
   - Jika terdeteksi tanda-tanda keputusasaan akut atau ingin melukai diri, prioritaskan keselamatan dengan tenang dan hangat sesuai protokol krisis.`;

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
        const errMsg = (err?.message || String(err)).toLowerCase();
        const isRateLimit = 
          errMsg.includes('429') || 
          errMsg.includes('quota') || 
          errMsg.includes('resource_exhausted') || 
          errMsg.includes('rate limit') || 
          errMsg.includes('too many requests') ||
          (err.status && Number(err.status) === 429) ||
          (err.code && Number(err.code) === 429);

        console.warn(`[AI_RESILIENCE] Primary stream attempt ${attempt + 1} failed: ${err?.message || err}`);
        if (isRateLimit) {
          console.warn(`[AI_RESILIENCE] Primary model "${primaryModel}" quota exhausted (429). Fast-switching to fallback stream model.`);
          break;
        }
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
        const errMsg = (fallbackErr?.message || String(fallbackErr)).toLowerCase();
        const isRateLimit = 
          errMsg.includes('429') || 
          errMsg.includes('quota') || 
          errMsg.includes('resource_exhausted') || 
          errMsg.includes('rate limit') || 
          errMsg.includes('too many requests') ||
          (fallbackErr.status && Number(fallbackErr.status) === 429) ||
          (fallbackErr.code && Number(fallbackErr.code) === 429);

        console.warn(`[AI_RESILIENCE] Fallback stream attempt ${fallbackAttempt + 1} failed: ${fallbackErr?.message || fallbackErr}`);
        if (isRateLimit) {
          console.warn(`[AI_RESILIENCE] Fallback stream model quota exhausted (429). Fast-switching to local calming stream.`);
          break;
        }
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
