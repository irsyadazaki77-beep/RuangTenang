import { getGenAIClient, DEFAULT_AI_MODEL, CALMING_FALLBACK_MESSAGE } from '../../config/aiConfig.js';
import { aiContextBuilder } from './aiContextBuilder.js';
import { aiSafetyService } from './aiSafetyService.js';
import { scanAndSanitizePII } from '../piiService.js';
import { getLocalFallbackResponse } from '../../routes/fallbackAi.js';
import { getActualGeminiModel, resolveAiModel, getModelDefinition, isModelAllowedForTier } from './aiModelRegistry.js';
import { AI_PROVIDER_ADAPTERS } from './aiProviderAdapters.js';
import { geminiAdapter } from './geminiAdapter.js';
import { AI_RELIABILITY_POLICY, executeWithReliability, guardAiStream, recordProviderStreamFailure } from './aiReliabilityService.js';

import type { RoutingDecision } from '../../../shared/aiModelContract.js';
import type { ModelCapability } from '../../../shared/aiModelContract.js';

export interface AiRequestOptions {
  userId?: string;
  userTier?: string;
  requestedModelId: string;
  prompt: string;
  history?: Array<{ role: 'user' | 'model'; parts: { text: string }[] }>;
  attachments?: any[];
  systemInstruction?: string;
  abortSignal?: AbortSignal;
  routingDecision?: RoutingDecision;
  fallbackCandidates?: string[];
  /** Preserve the requested candidate identity and report provider failures as-is. */
  comparisonMode?: boolean;
}

export function selectReliableModelCandidates(options: AiRequestOptions, primaryModelId: string, requirements: { capability: ModelCapability; hasAttachments?: boolean }): string[] {
  const selected = [primaryModelId];
  if (options.comparisonMode || options.routingDecision?.routingMode !== 'auto' || !AI_RELIABILITY_POLICY.fallbackEnabled) return selected;
  for (const modelId of options.fallbackCandidates || options.routingDecision.fallbackCandidates || []) {
    const model = getModelDefinition(modelId);
    if (!model || selected.includes(modelId) || !isModelAllowedForTier(modelId, options.userTier || 'Free')) continue;
    if (!model.capabilities.includes(requirements.capability) || (requirements.hasAttachments && model.provider !== 'gemini')) continue;
    selected.push(modelId);
    if (selected.length === 3) break;
  }
  return selected;
}

export const aiRequestService = {
  async generateChatResponse(options: AiRequestOptions): Promise<{ text: string; modelUsed: string; isFallback: boolean }> {
    const { userId, userTier = 'Free', requestedModelId, prompt, history = [], systemInstruction, abortSignal, attachments = [] } = options;

    if (aiSafetyService.detectPromptInjection(prompt)) {
      throw new Error('PROMPT_INJECTION_DETECTED');
    }
    const resolvedModel = resolveAiModel(requestedModelId || DEFAULT_AI_MODEL, userTier);
    const requestId = globalThis.crypto?.randomUUID?.() || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

    const candidates = selectReliableModelCandidates(options, resolvedModel.id, { capability: 'chat', hasAttachments: attachments.length > 0 });
    let lastError: unknown;
    let failedProvider: string | undefined;
    for (const [index, modelId] of candidates.entries()) {
      const model = resolveAiModel(modelId, userTier);
      if (index > 0 && failedProvider === model.provider && ['NETWORK_ERROR', 'PROVIDER_UNAVAILABLE'].includes((lastError as any)?.category)) continue;
      try {
        let outputText = '';
        if (model.provider === 'gemini') {
          const client = getGenAIClient();
          if (!client) throw new Error('PROVIDER_NOT_CONFIGURED');
          const response = await executeWithReliability(model.provider, signal => geminiAdapter.generate(client, {
            model: getActualGeminiModel(modelId),
            contents: [...sanitizedHistory, { role: 'user', parts: userParts }],
            config: { systemInstruction: fullSystemInstruction, temperature: 0.6, maxOutputTokens: outputTokens, abortSignal: signal }
          }), abortSignal, requestId);
          outputText = response.text || '';
        } else {
          const adapter = AI_PROVIDER_ADAPTERS[model.provider];
          if (!adapter.isAvailable()) throw new Error('PROVIDER_NOT_CONFIGURED');
          const response = await executeWithReliability(model.provider, signal => adapter.generate({
            ...options,
            requestedModelId: modelId,
            prompt: sanitizedPrompt,
            history: sanitizedHistory,
            // Non-Gemini adapters do not have the same attachment handling path.
            // Never forward raw inline data to them by spreading the original options.
            attachments: [],
            systemInstruction: fullSystemInstruction,
            abortSignal: signal
          }, modelId), abortSignal, requestId);
          outputText = response.text;
        }
        const validation = aiSafetyService.validateOutput(outputText);
        if (!validation.isValid) return { text: 'Maaf, respons yang saya siapkan tidak dapat ditampilkan karena aturan keamanan. Jika Anda memerlukan bantuan khusus, mohon hubungi profesional medis atau konselor.', modelUsed: 'safety-override', isFallback: true };
        return { text: outputText, modelUsed: modelId, isFallback: index > 0 };
      } catch (error) {
        lastError = error;
        failedProvider = model.provider;
        if (abortSignal?.aborted) throw error;
        console.warn(`[AI_REQUEST] requestId=${requestId} attempt=${index + 1} model=${modelId} failed category=${(error as any)?.category || 'INTERNAL_ERROR'}`);
        if (index + 1 >= candidates.length || !(error as any)?.retryable) break;
      }
    }
    const errCategory = (lastError as any)?.category;
    if (errCategory === 'ABORTED') throw lastError;
    const localFallback = getLocalFallbackResponse(prompt);
    return { text: localFallback.text || CALMING_FALLBACK_MESSAGE, modelUsed: 'local-empathetic-fallback', isFallback: true };
  },

  async generateStreamResponse(options: AiRequestOptions): Promise<{ stream: AsyncGenerator<any, any, unknown>, modelUsed: string, isFallback: boolean, requestId: string }> {
    const { userId, userTier = 'Free', requestedModelId, prompt, history = [], systemInstruction, abortSignal, attachments = [], comparisonMode = false } = options;

    if (aiSafetyService.detectPromptInjection(prompt)) {
      throw new Error('PROMPT_INJECTION_DETECTED');
    }
    const resolvedModel = resolveAiModel(requestedModelId || DEFAULT_AI_MODEL, userTier);

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
    
    const requestId = globalThis.crypto?.randomUUID?.() || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

    if (userId && !isAnonymous && !comparisonMode && !fullSystemInstruction.includes('[CONTEXT_BOUNDARIES]')) {
       const userContext = await aiContextBuilder.buildContext({ userId, abortSignal });
       if (userContext.systemContext) {
         fullSystemInstruction += `\n\n${userContext.systemContext}`;
       }
    }

    const candidates = selectReliableModelCandidates(options, resolvedModel.id, { capability: 'streaming', hasAttachments: attachments.length > 0 });
    let lastError: unknown;
    let failedProvider: string | undefined;
    for (const [index, modelId] of candidates.entries()) {
      const model = resolveAiModel(modelId, userTier);
      if (index > 0 && failedProvider === model.provider && ['NETWORK_ERROR', 'PROVIDER_UNAVAILABLE'].includes((lastError as any)?.category)) continue;
      const streamController = new AbortController();
      const onParentAbort = () => streamController.abort();
      if (abortSignal?.aborted) streamController.abort();
      else abortSignal?.addEventListener('abort', onParentAbort, { once: true });
      try {
        let source: AsyncGenerator<any, any, unknown>;
        if (model.provider === 'gemini') {
          const client = getGenAIClient();
          if (!client) throw new Error('PROVIDER_NOT_CONFIGURED');
          source = await executeWithReliability(model.provider, signal => {
            signal.addEventListener('abort', onParentAbort, { once: true });
            return geminiAdapter.generateStream(client, {
            model: getActualGeminiModel(modelId),
            contents: [...sanitizedHistory, { role: 'user', parts: userParts }],
            config: { systemInstruction: fullSystemInstruction, temperature: 0.6, maxOutputTokens: outputTokens, abortSignal: streamController.signal }
            });
          }, streamController.signal, requestId);
        } else {
          const adapter = AI_PROVIDER_ADAPTERS[model.provider];
          if (!adapter.isAvailable()) throw new Error('PROVIDER_NOT_CONFIGURED');
          const result = await executeWithReliability(model.provider, signal => {
            signal.addEventListener('abort', onParentAbort, { once: true });
            return adapter.generateStream({
              ...options,
              requestedModelId: modelId,
              prompt: sanitizedPrompt,
              history: sanitizedHistory,
              // Non-Gemini adapters do not have the same attachment handling path.
              // Never forward raw inline data to them by spreading the original options.
              attachments: [],
              systemInstruction: fullSystemInstruction,
              abortSignal: streamController.signal
            }, modelId);
          }, streamController.signal, requestId);
          source = result.stream;
        }
        const guardedStream = async function* () {
          try { yield* guardAiStream(source, streamController.signal, () => streamController.abort()); }
          catch (error) { recordProviderStreamFailure(model.provider, error); throw error; }
          finally { abortSignal?.removeEventListener('abort', onParentAbort); }
        };
        return { stream: guardedStream(), modelUsed: modelId, isFallback: index > 0, requestId };
      } catch (error) {
        abortSignal?.removeEventListener('abort', onParentAbort);
        streamController.abort();
        lastError = error;
        failedProvider = model.provider;
        console.warn(`[AI_REQUEST] requestId=${requestId} attempt=${index + 1} model=${modelId} failed category=${(error as any)?.category || 'INTERNAL_ERROR'}`);
        if (abortSignal?.aborted || !(error as any)?.retryable || index + 1 >= candidates.length) throw error;
      }
    }
    throw lastError;
  }
};
