import { getGenAIClient, DEFAULT_AI_MODEL } from '../../config/aiConfig.js';
import { aiContextBuilder } from './aiContextBuilder.js';
import { aiSafetyService } from './aiSafetyService.js';
import { scanAndSanitizePII } from '../piiService.js';
import { getActualGeminiModel, isRegisteredModelAvailable, resolveAiModel, getModelDefinition, isModelAllowedForTier } from './aiModelRegistry.js';
import { AI_PROVIDER_ADAPTERS } from './aiProviderAdapters.js';
import { geminiAdapter } from './geminiAdapter.js';
import { AI_RELIABILITY_POLICY, executeWithReliability, guardAiStream, recordProviderStreamFailure } from './aiReliabilityService.js';
import { isCampusAiEnabledForUser } from '../campusTenantService.js';

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
  /** Optional hard cap for bounded agent decisions. */
  maxOutputTokens?: number;
  /** Request provider JSON mode where supported; other adapters receive a validated JSON-only prompt. */
  responseFormat?: 'json';
}

export function selectReliableModelCandidates(options: AiRequestOptions, primaryModelId: string, requirements: { capability: ModelCapability; hasAttachments?: boolean }): string[] {
  const selected = [primaryModelId];
  const fallbackPermitted = !options.comparisonMode && AI_RELIABILITY_POLICY.fallbackEnabled && (
    options.routingDecision?.routingMode === 'auto' || Boolean(options.routingDecision?.profileId)
  );
  if (!fallbackPermitted) return selected;

  for (const modelId of options.fallbackCandidates || options.routingDecision?.fallbackCandidates || []) {
    const model = getModelDefinition(modelId);
    if (!model || selected.includes(modelId) || !isModelAllowedForTier(modelId, options.userTier || 'Free')) continue;
    const providerAvailable = model.provider === 'gemini'
      ? Boolean(getGenAIClient())
      : AI_PROVIDER_ADAPTERS[model.provider].isAvailable();
    if (!providerAvailable || !isRegisteredModelAvailable(model)) continue;
    if (!model.capabilities.includes(requirements.capability)) continue;
    if (requirements.hasAttachments && !model.capabilities.includes('vision')) continue;
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

    if (!(await isCampusAiEnabledForUser(userId))) {
      return {
        text: 'Layanan AI sedang dinonaktifkan oleh kampus. Kamu tetap dapat melihat kontak bantuan dan membuat janji dengan konselor.',
        modelUsed: 'campus-policy',
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
    const hasAttachments = Boolean(attachments && attachments.length > 0);
    const defaultLimit = hasAttachments ? 2500 : (isAnonymous ? 1500 : 2500);
    const outputTokens = options.maxOutputTokens || defaultLimit;

    let fullSystemInstruction = systemInstruction || `Kamu adalah 'RuangTenang Companion', pendamping reflektif, empatik, dan suportif untuk mahasiswa Indonesia.
Prinsip utamamu: "Dengarkan dengan penuh pemahaman, hadir secara suportif, dan bantu selesaikan masalah dengan tenang."

Pedoman Interaksi & Klasifikasi Kebutuhan:
1. Pembedaan Konteks Respons:
   a. Jika Pengguna Curhat / Berbagi Beban Emosi (Lelah, Cemas, Sedih, Burnout, dll):
      - Validasi & Empathy-First: respon perasaan di balik cerita sebelum membahas fakta.
      - Normalisasi perasaan mahasiswa (konflik dospem, tekanan skripsi, finansial, ekspektasi keluarga) dan beri ruang bernapas tanpa menghakimi.
      - Ajukan TEPAT 1 (satu) pertanyaan eksploratif yang lembut untuk membantu mereka mengurai beban pikiran saat ini.
      - Hindari kalimat klise ("Jangan sedih ya", "Semangat!").
   b. Jika Pengguna Meminta Pemahaman Dokumen / Lampiran / Tugas / Pertanyaan Akademik Praktis (misal: "pahami pdf saya", "rangkum laporan ini", "jelaskan konsep ini"):
      - DILARANG berhalusinasi emosi negatif atau membuat drama fiktif (JANGAN meminta maaf tanpa alasan, jangan berasumsi pengguna kesal atau lelah jika tidak mereka sebutkan).
      - Sambut dengan hangat dan berikan pengantar singkat yang positif dan suportif.
      - Sajikan bedah isi dokumen/tugas secara LENGKAP, TERSTRUKTUR, dan TUNTAS (gunakan poin-poin/bullet list yang rapi, rincian fitur atau temuan utama, serta penegasan tujuan).
      - JANGAN PERNAH memotong penjelasan di tengah kalimat; tuntaskan seluruh poin penting dokumen sampai selesai.
      - Tutup dengan pertanyaan atau tawaran tindak lanjut praktis (misal: "Apakah ada bagian atau fitur spesifik yang ingin kita bahas lebih dalam atau kita kembangkan?").

2. Gaya Bahasa & Sapaan:
   - Gunakan sapaan "kamu" atau nama panggilan pengguna secara hangat, santun, dan bersahabat.
   - Dilarang menggunakan sapaan sok akrab yang berlebihan ("kawan", "bestie", "bro").
   - Jika merujuk dokumen di Ruang Tenang, sebutkan nama fitur atau bagian dokumen secara natural dan mudah dipahami.

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
      if (index > 0 && failedProvider === model.provider && model.provider !== 'ollama' && ['TIMEOUT', 'NETWORK_ERROR', 'PROVIDER_UNAVAILABLE', 'RATE_LIMIT', 'QUOTA_EXCEEDED', 'AUTH_ERROR'].includes((lastError as any)?.category)) continue;
      try {
        let outputText = '';
        if (process.env.NODE_ENV === 'test' && process.env.E2E_MOCK_AI === '1') {
          outputText = `Jawaban fixture deterministik: ${sanitizedPrompt.slice(0, 500)}`;
        } else if (model.provider === 'gemini') {
          const client = getGenAIClient();
          if (!client) throw Object.assign(new Error('PROVIDER_NOT_CONFIGURED'), { category: 'PROVIDER_UNAVAILABLE', retryable: true });
          const response = await executeWithReliability(model.provider, signal => geminiAdapter.generate(client, {
            model: getActualGeminiModel(modelId),
            contents: [...sanitizedHistory, { role: 'user', parts: userParts }],
            config: { systemInstruction: fullSystemInstruction, temperature: 0.6, maxOutputTokens: outputTokens, ...(options.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}), abortSignal: signal }
          }), abortSignal, requestId, 'response');
          outputText = response.text || '';
        } else {
          const adapter = AI_PROVIDER_ADAPTERS[model.provider];
          if (!adapter.isAvailable()) throw Object.assign(new Error('PROVIDER_NOT_CONFIGURED'), { category: 'PROVIDER_UNAVAILABLE', retryable: true });
          const response = await executeWithReliability(model.provider, signal => adapter.generate({
            ...options,
            requestedModelId: modelId,
            prompt: sanitizedPrompt,
            history: sanitizedHistory,
            // Non-Gemini adapters only receive image attachments if the model supports vision
            attachments: model.capabilities.includes('vision') ? (options.attachments || []) : [],
            systemInstruction: fullSystemInstruction,
            maxOutputTokens: outputTokens,
            abortSignal: signal
          }, modelId), abortSignal, requestId, 'response');
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
        const category = (error as any)?.category;
        const mayTryProfileAlternative = (Boolean(options.routingDecision?.profileId)
          && ['AUTH_ERROR', 'QUOTA_EXCEEDED'].includes(category))
          || (model.provider === 'ollama' && ['CONTENT_ERROR', 'INVALID_REQUEST'].includes(category));
        if (index + 1 >= candidates.length || (!(error as any)?.retryable && !mayTryProfileAlternative)) break;
      }
    }
    const errCategory = (lastError as any)?.category;
    if (errCategory === 'ABORTED') throw lastError;
    // Never turn provider failures into plausible-looking local answers. That
    // would make users trust content that was not generated by the selected AI.
    throw lastError || Object.assign(new Error('No eligible AI provider completed this request.'), {
      category: 'PROVIDER_UNAVAILABLE',
      retryable: true
    });
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
    const hasAttachments = Boolean(attachments && attachments.length > 0);
    const defaultLimit = hasAttachments ? 2500 : (isAnonymous ? 1500 : 2500);
    const outputTokens = options.maxOutputTokens || defaultLimit;

    const requestId = globalThis.crypto?.randomUUID?.() || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (!(await isCampusAiEnabledForUser(userId))) {
      const disabledText = 'Layanan AI sedang dinonaktifkan oleh kampus. Kamu tetap dapat melihat kontak bantuan dan membuat janji dengan konselor.';
      const disabledStream = async function* () { yield { text: disabledText }; };
      return { stream: disabledStream(), modelUsed: 'campus-policy', isFallback: true, requestId };
    }

    let fullSystemInstruction = systemInstruction || `Kamu adalah 'RuangTenang Companion', pendamping reflektif, empatik, dan suportif untuk mahasiswa Indonesia.
Prinsip utamamu: "Dengarkan dengan penuh pemahaman, hadir secara suportif, dan bantu selesaikan masalah dengan tenang."

Pedoman Interaksi & Klasifikasi Kebutuhan:
1. Pembedaan Konteks Respons:
   a. Jika Pengguna Curhat / Berbagi Beban Emosi (Lelah, Cemas, Sedih, Burnout, dll):
      - Validasi & Empathy-First: respon perasaan di balik cerita sebelum membahas fakta.
      - Normalisasi perasaan mahasiswa (konflik dospem, tekanan skripsi, finansial, ekspektasi keluarga) dan beri ruang bernapas tanpa menghakimi.
      - Ajukan TEPAT 1 (satu) pertanyaan eksploratif yang lembut untuk membantu mereka mengurai beban pikiran saat ini.
      - Hindari kalimat klise ("Jangan sedih ya", "Semangat!").
   b. Jika Pengguna Meminta Pemahaman Dokumen / Lampiran / Tugas / Pertanyaan Akademik Praktis (misal: "pahami pdf saya", "rangkum laporan ini", "jelaskan konsep ini"):
      - DILARANG berhalusinasi emosi negatif atau membuat drama fiktif (JANGAN meminta maaf tanpa alasan, jangan berasumsi pengguna kesal atau lelah jika tidak mereka sebutkan).
      - Sambut dengan hangat dan berikan pengantar singkat yang positif dan suportif.
      - Sajikan bedah isi dokumen/tugas secara LENGKAP, TERSTRUKTUR, dan TUNTAS (gunakan poin-poin/bullet list yang rapi, rincian fitur atau temuan utama, serta penegasan tujuan).
      - JANGAN PERNAH memotong penjelasan di tengah kalimat; tuntaskan seluruh poin penting dokumen sampai selesai.
      - Tutup dengan pertanyaan atau tawaran tindak lanjut praktis (misal: "Apakah ada bagian atau fitur spesifik yang ingin kita bahas lebih dalam atau kita kembangkan?").

2. Gaya Bahasa & Sapaan:
   - Gunakan sapaan "kamu" atau nama panggilan pengguna secara hangat, santun, dan bersahabat.
   - Dilarang menggunakan sapaan sok akrab yang berlebihan ("kawan", "bestie", "bro").
   - Jika merujuk dokumen di Ruang Tenang, sebutkan nama fitur atau bagian dokumen secara natural dan mudah dipahami.

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
      if (index > 0 && failedProvider === model.provider && model.provider !== 'ollama' && ['TIMEOUT', 'NETWORK_ERROR', 'PROVIDER_UNAVAILABLE', 'RATE_LIMIT', 'QUOTA_EXCEEDED', 'AUTH_ERROR'].includes((lastError as any)?.category)) continue;
      const streamController = new AbortController();
      const onParentAbort = () => streamController.abort();
      if (abortSignal?.aborted) streamController.abort();
      else abortSignal?.addEventListener('abort', onParentAbort, { once: true });
      try {
        let source: AsyncGenerator<any, any, unknown>;
        if (process.env.NODE_ENV === 'test' && process.env.E2E_MOCK_AI === '1') {
          source = (async function* () {
            yield { text: `Jawaban fixture deterministik: ${sanitizedPrompt.slice(0, 500)}` };
          })();
        } else if (model.provider === 'gemini') {
          const client = getGenAIClient();
          if (!client) throw Object.assign(new Error('PROVIDER_NOT_CONFIGURED'), { category: 'PROVIDER_UNAVAILABLE', retryable: true });
          source = await executeWithReliability(model.provider, signal => {
            return geminiAdapter.generateStream(client, {
            model: getActualGeminiModel(modelId),
            contents: [...sanitizedHistory, { role: 'user', parts: userParts }],
            config: { systemInstruction: fullSystemInstruction, temperature: 0.6, maxOutputTokens: outputTokens, abortSignal: AbortSignal.any([signal, streamController.signal]) }
            });
          }, streamController.signal, requestId, 'first-token');
        } else {
          const adapter = AI_PROVIDER_ADAPTERS[model.provider];
          if (!adapter.isAvailable()) throw Object.assign(new Error('PROVIDER_NOT_CONFIGURED'), { category: 'PROVIDER_UNAVAILABLE', retryable: true });
          const result = await executeWithReliability(model.provider, signal => {
            return adapter.generateStream({
              ...options,
              requestedModelId: modelId,
              prompt: sanitizedPrompt,
              history: sanitizedHistory,
              // Non-Gemini adapters only receive image attachments if the model supports vision
              attachments: model.capabilities.includes('vision') ? (options.attachments || []) : [],
              systemInstruction: fullSystemInstruction,
              maxOutputTokens: outputTokens,
              abortSignal: AbortSignal.any([signal, streamController.signal])
            }, modelId);
          }, streamController.signal, requestId, 'first-token');
          source = result.stream;
        }
        const guardedStream = async function* () {
          let emittedText = false;
          try {
            for await (const chunk of guardAiStream(source, streamController.signal, () => streamController.abort())) {
              if (typeof chunk?.text === 'string' && chunk.text.length) emittedText = true;
              yield chunk;
            }
          } catch (error) {
            recordProviderStreamFailure(model.provider, error);
            const category = (error as any)?.category;
            const fallbackIds = candidates.slice(index + 1).filter(id => {
              const nextModel = getModelDefinition(id);
              return nextModel && (nextModel.provider !== model.provider || model.provider === 'ollama');
            });
            if (!emittedText && !comparisonMode && !abortSignal?.aborted && ((error as any)?.retryable || (model.provider === 'ollama' && category === 'CONTENT_ERROR')) && fallbackIds.length) {
              const fallbackModelId = fallbackIds[0];
              const nextDecision = options.routingDecision?.profileId
                ? { ...options.routingDecision, selectedModelId: fallbackModelId, fallbackCandidates: fallbackIds.slice(1) }
                : options.routingDecision;
              const next = await aiRequestService.generateStreamResponse({
                ...options,
                requestedModelId: fallbackModelId,
                routingDecision: nextDecision,
                fallbackCandidates: fallbackIds.slice(1)
              });
              yield { type: 'model_fallback', modelUsed: next.modelUsed, fallbackFrom: modelId, category } as any;
              yield* next.stream;
              return;
            }
            throw error;
          }
          finally { abortSignal?.removeEventListener('abort', onParentAbort); }
        };
        return { stream: guardedStream(), modelUsed: modelId, isFallback: index > 0, requestId };
      } catch (error) {
        abortSignal?.removeEventListener('abort', onParentAbort);
        streamController.abort();
        lastError = error;
        failedProvider = model.provider;
        console.warn(`[AI_REQUEST] requestId=${requestId} attempt=${index + 1} model=${modelId} failed category=${(error as any)?.category || 'INTERNAL_ERROR'}`);
        const category = (error as any)?.category;
        const mayTryProfileAlternative = (Boolean(options.routingDecision?.profileId)
          && ['AUTH_ERROR', 'QUOTA_EXCEEDED'].includes(category))
          || (model.provider === 'ollama' && ['CONTENT_ERROR', 'INVALID_REQUEST'].includes(category));
        if (abortSignal?.aborted || (!(error as any)?.retryable && !mayTryProfileAlternative) || index + 1 >= candidates.length) throw error;
      }
    }
    throw lastError;
  }
};
