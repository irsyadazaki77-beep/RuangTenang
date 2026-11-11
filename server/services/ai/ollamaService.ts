import type { AiRequestOptions } from './aiRequestService.js';
import { getModelDefinition } from './aiModelRegistry.js';
import { AI_RELIABILITY_POLICY, classifyAiError } from './aiReliabilityService.js';
import { getLocalModel, isLocalModelAvailable, localInferenceQueue, ollamaBaseUrl, refreshOllamaInventory } from './ollamaRuntime.js';

type OllamaMessage = { role: 'system' | 'user' | 'assistant'; content: string; images?: string[] };

function buildMessages(options: AiRequestOptions): OllamaMessage[] {
  let cleanSystemInstruction = options.systemInstruction || '';
  let userContent = options.prompt;

  // For local Ollama models (especially lightweight models like Qwen 1.7B / 3B / 8B):
  // If system instruction contains extracted document context (<untrusted_document_context...>),
  // extract it and move it exclusively into the user prompt.
  // CRITICAL: Strip it from system instruction so document text is NOT duplicated
  // in both system and user prompts. This halves context token usage, stays within 4096 ctx,
  // and keeps the system instruction static so Ollama's prompt caching (KV-cache) hits!
  if (cleanSystemInstruction && cleanSystemInstruction.includes('<untrusted_document_context')) {
    const docMatch = cleanSystemInstruction.match(/<untrusted_document_context[^>]*>([\s\S]*?)<\/untrusted_document_context>/i);
    if (docMatch && docMatch[1]) {
      const docText = docMatch[1].trim();
      if (docText.length > 0) {
        userContent = `[DOKUMEN TERLAMPIR UNTUK DIANALISIS (ISI TEKS HASIL EKSTRAKSI)]\n${docText}\n[/DOKUMEN TERLAMPIR]\n\nPetunjuk Penting: Jawablah secara akurat HANYA berdasarkan teks dokumen di atas. Dilarang keras mengarang atau berhalusinasi mengenai informasi, data, atau metodologi yang tidak tertulis pada kutipan dokumen. Jika informasi tidak ada di dalam dokumen, katakan dengan jelas bahwa informasi tersebut tidak ditemukan.\n\nPermintaan pengguna terkait dokumen di atas:\n${userContent}`;
      }
    }
    cleanSystemInstruction = cleanSystemInstruction.replace(/<untrusted_document_context[^>]*>[\s\S]*?<\/untrusted_document_context>/gi, '').trim();
  }

  const isAssignmentOrHardProblem = /\b(tugas|pr\b|soal|ujian|kuis|hitung|rumus|turunkan|pembuktian|algoritma|kompleksitas|studi kasus|analisis kasus|susah|sulit|kalkulus|matematika|fisika|kimia|akuntansi|hukum)\b/i.test(options.prompt);
  if (isAssignmentOrHardProblem && !cleanSystemInstruction.includes('FIRST-PRINCIPLES')) {
    cleanSystemInstruction += `\n\n[PROTOKOL SUPREME FIRST-PRINCIPLES & AKURASI TUGAS AKADEMIK]
Untuk pertanyaan tugas kuliah atau permasalahan analitis ini:
1. Uraikan secara jelas apa yang DIKETAHUI (Given) dan apa yang DITANYAKAN (Target).
2. Jika ada parameter implisit pada soal, nyatakan ASUMSI KERJA secara transparan. DILARANG KERAS mengarang data palsu.
3. Paparkan langkah penurunan solusi secara bertahap (step-by-step), matematis, dan logis.
4. Lakukan verifikasi hasil akhir (sanity check) sebelum menyimpulkan.
5. Berikan penjelasan konsep inti secara ringkas agar mahasiswa memahami esensinya.`;
  }

  const isCodingRequest = /\b(koding|coding|typescript|javascript|python|buatkan kode|tuliskan kode|fungsi|class|implementasi|async|promise|lru|cache|kompilasi|code)\b/i.test(options.prompt);
  if (isCodingRequest && !cleanSystemInstruction.includes('KODE PRODUKSI BERSIH')) {
    cleanSystemInstruction += `\n\n[PROTOKOL REKAYASA KODE PRODUKSI BERSIH & SINTAKSIS ZERO-ERROR]
Untuk implementasi kode program:
1. SCOPE & VARIABLE ISOLATION: Pastikan semua variabel dan identifier benar-benar didefinisikan dalam scope lokal fungsi/metode. JANGAN PERNAH mereferensikan parameter luar yang tidak ada (contoh: pada method get(key), jangan memakai variabel value).
2. GETTER VS METHOD: Jika spesifikasi meminta getter, gunakan sintaks 'public get propertyName(): Type'.
3. ATURAN BAKU LRU CACHE:
   - Gunakan ukuran bawaan 'this.cache.size', DILARANG membuat counter 'private size: number' manual agar tidak terjadi inkonsistensi saat eviction.
   - Pada get(key): jika tidak ada return undefined. Jika ada: ambil val, refresh posisi MRU (this.cache.delete(key) lalu this.cache.set(key, val)), lalu return val.
   - Pada put(key, value): jika key sudah ada, this.cache.delete(key). Jika belum ada dan this.cache.size >= this.capacity, hapus key paling lama (const oldest = this.cache.keys().next().value; if (oldest !== undefined) this.cache.delete(oldest);). Lalu this.cache.set(key, value).
   - Getter size: 'public get size(): number { return this.cache.size; }'.
4. IN-MEMORY ASYNC: Untuk pembatasan konkurensi (concurrency limit / asyncPool), gunakan murni antrean in-memory JavaScript/TypeScript (Promise.all / Promise.race / async loop). DILARANG membuat Web Worker atau berkas eksternal.
5. TYPE-SAFETY & AST BALANCE: Tulis kode TypeScript yang valid, seimbang kurung kurawal ({}), tanpa error sintaks, dan siap eksekusi langsung.
6. BERIKAN HANYA KODE UTUH di dalam blok \`\`\`typescript tanpa placeholder.`;
  }

  const messages: OllamaMessage[] = [];
  if (cleanSystemInstruction) messages.push({ role: 'system', content: cleanSystemInstruction });

  const history = [...(options.history || [])];
  // If the last item in history is a user message, avoid duplicate user turns
  let trailingUserNote = '';
  if (history.length > 0 && history[history.length - 1].role === 'user') {
    const lastUserTurn = history.pop()!;
    const partsText = (lastUserTurn.parts || []).map(p => p.text || '').join('\n').trim();
    if (partsText && partsText !== options.prompt.trim()) {
      const remaining = partsText.replace(options.prompt.trim(), '').trim();
      if (remaining) trailingUserNote = remaining;
    }
  }

  for (const item of history) {
    const content = (item.parts || []).map(part => part.text || '').join('\n').trim();
    if (content) messages.push({ role: item.role === 'model' ? 'assistant' : 'user', content });
  }

  const images = (options.attachments || []).filter(a => a.base64 && a.mimeType?.startsWith('image/'))
    .map(a => a.base64.includes(',') ? a.base64.split(',')[1] : a.base64);

  if (trailingUserNote) {
    userContent = `${userContent}\n\n[Konteks RuangKerja]\n${trailingUserNote}`;
  }

  messages.push({ role: 'user', content: userContent, ...(images.length ? { images } : {}) });
  return messages;
}

async function connect(options: AiRequestOptions, publicModelId: string, stream: boolean) {
  const model = getModelDefinition(publicModelId);
  if (!model || model.provider !== 'ollama') throw new Error('MODEL_NOT_FOUND');
  if (!ollamaBaseUrl()) throw new Error('OLLAMA_UNAVAILABLE');
  const controller = new AbortController();
  const onAbort = () => { controller.abort(); release?.(); };
  let release: (() => void) | undefined;
  if (options.abortSignal?.aborted) controller.abort();
  else options.abortSignal?.addEventListener('abort', onAbort, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; cleanup(); }, AI_RELIABILITY_POLICY.totalRequestTimeoutMs);
  const cleanup = () => {
    controller.abort();
    clearTimeout(timeout);
    options.abortSignal?.removeEventListener('abort', onAbort);
    release?.();
  };
  const normalize = (error: unknown) => classifyAiError(timedOut ? new Error('OLLAMA_REQUEST_TIMEOUT') : error);
  try {
    release = await localInferenceQueue.acquire(controller.signal);
    await refreshOllamaInventory();
    if (!isLocalModelAvailable(model.providerModelId)) throw new Error('MODEL_NOT_FOUND');
    const local = getLocalModel(model.providerModelId);
    const messages = buildMessages(options);
    if (messages.some(message => message.images?.length) && !local?.capabilities.includes('vision')) {
      throw Object.assign(new Error('OLLAMA_UNSUPPORTED_CAPABILITY'), { statusCode: 400 });
    }
    const configuredContext = process.env.NODE_ENV === 'test' ? 8192 : Number(process.env.OLLAMA_NUM_CTX);
    const contextSize = Number.isInteger(configuredContext) && configuredContext >= 2048 && configuredContext <= 32768 ? configuredContext : 4096;
    const numCtx = Math.min(contextSize, local?.contextLength || contextSize);
    const response = await fetch(`${ollamaBaseUrl()}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model.providerModelId, messages, stream,
        // Keep active model hot in VRAM for responsive multi-turn chat and prompt cache hits.
        // OLLAMA_MAX_LOADED_MODELS=1 automatically handles memory cleanup if another model is requested.
        keep_alive: process.env.NODE_ENV === 'test' ? 0 : (process.env.OLLAMA_KEEP_ALIVE || '30m'),
        // Adaptive Thinking Budget: Allow deep thinking for deep reasoning models (si-gacor, deepseek-r1),
        // while si-pinter utilizes high-speed prompt-anchored deterministic factual inference.
        ...(local?.capabilities.includes('thinking') ? {
          think: options.responseFormat !== 'json' && (
            Boolean(options.enableReasoning) ||
            (options.enableReasoning !== false && (
              options.routingDecision?.profileId === 'kerja-hard' ||
              Boolean(options.routingDecision?.routingReason?.toLowerCase().includes('penalaran')) ||
              Boolean(options.prompt && /\b(bukti|proof|deduksi|mengapa|kenapa|analisis mendalam|step by step|turunkan rumus)\b/i.test(options.prompt))
            ) && (model.id === 'ollama-si-gacor' || model.id === 'ollama-deepseek-r1-1.5b'))
          )
        } : {}),
        ...(options.responseFormat === 'json' ? { format: 'json' } : {}),
        options: {
          temperature: options.responseFormat === 'json' ? 0.1 : (
            (options.routingDecision?.profileId?.startsWith('kerja-') || options.systemInstruction?.includes('RuangKerja'))
              ? (model.id === 'ollama-si-gacor' ? 0.25 : (model.id === 'ollama-si-pinter' ? 0.18 : 0.25))
              : (model.id === 'ollama-si-pinter' ? 0.18 : 0.45)
          ),
          repeat_penalty: options.responseFormat === 'json' ? 1.05 : (
            (options.routingDecision?.profileId?.startsWith('kerja-') || options.systemInstruction?.includes('RuangKerja'))
              ? 1.15
              : (model.id === 'ollama-si-pinter' ? 1.15 : 1.18)
          ),
          repeat_last_n: 256,
          min_p: model.id === 'ollama-si-pinter' ? 0.08 : 0.05,
          top_k: model.id === 'ollama-si-pinter' ? 20 : 40,
          presence_penalty: (options.routingDecision?.profileId?.startsWith('kerja-') || options.systemInstruction?.includes('RuangKerja')) ? 0.0 : 0.2,
          frequency_penalty: (options.routingDecision?.profileId?.startsWith('kerja-') || options.systemInstruction?.includes('RuangKerja')) ? 0.0 : 0.2,
          top_p: model.id === 'ollama-si-pinter' ? 0.85 : 0.9,
          num_ctx: numCtx,
          num_predict: Math.min(
            model.id === 'ollama-deepseek-r1-1.5b'
              ? Math.max(options.maxOutputTokens || 1024, 1024)
              : (options.maxOutputTokens
                ? Math.max(1, options.maxOutputTokens)
                : ((model.id === 'ollama-si-gacor' || model.id === 'ollama-bonsai-27b' || model.id === 'ollama-si-tangguh')
                  ? 2048
                  : 1024)),
            Math.floor(numCtx / 2)
          )
        }
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      // Do not log provider bodies: they may echo prompts or sensitive attachments.
      await response.body?.cancel();
      throw new Error(`OLLAMA_ERROR_${response.status}`);
    }
    return { response, cleanup, normalize };
  } catch (error) { cleanup(); throw normalize(error); }
}

export const ollamaService = {
  getBaseUrl: ollamaBaseUrl,
  isAvailable: () => Boolean(ollamaBaseUrl()),

  async generateResponse(options: AiRequestOptions, publicModelId: string): Promise<{ text: string; modelUsed: string; isFallback: boolean }> {
    const connection = await connect(options, publicModelId, false);
    try {
      const data = await connection.response.json();
      if (data.error) throw new Error('OLLAMA_CONTENT_ERROR');
      const text = data.message?.content;
      if (typeof text !== 'string' || !text.trim()) throw new Error('OLLAMA_EMPTY_CONTENT');
      return { text, modelUsed: publicModelId, isFallback: false };
    } catch (error) { throw connection.normalize(error); }
    finally { connection.cleanup(); }
  },

  async generateStream(options: AiRequestOptions, publicModelId: string): Promise<{ stream: AsyncGenerator<{ text: string }, void, unknown>; modelUsed: string }> {
    const connection = await connect(options, publicModelId, true);
    const stream = async function* (): AsyncGenerator<{ text: string }, void, unknown> {
      const reader = connection.response.body?.getReader();
      let emitted = false;
      let completed = false;
      const parse = (line: string): { text: string } | undefined => {
        if (!line.trim()) return;
        const data = JSON.parse(line);
        if (data.error) throw new Error('OLLAMA_STREAM_CONTENT_ERROR');
        if (data.done) completed = true;
        const text = data.message?.content;
        if (typeof text === 'string' && text.length) { emitted = true; return { text }; }
        // Keep the stream timeout aware of progress without exposing thinking text.
        if (data.message?.thinking) return { text: '' };
      };
      try {
        if (!reader) throw new Error('OLLAMA_STREAM_UNAVAILABLE');
        const decoder = new TextDecoder();
        let buffer = '';
        while (!completed) {
          const { done, value } = await reader.read();
          buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const chunk = parse(line);
            if (chunk) yield chunk;
          }
          if (done) {
            const chunk = parse(buffer);
            if (chunk) yield chunk;
            break;
          }
        }
        if (!completed) throw new Error('OLLAMA_STREAM_CONNECTION_CLOSED');
        if (!emitted) throw new Error('OLLAMA_EMPTY_CONTENT');
      } catch (error) { throw connection.normalize(error); }
      finally {
        connection.cleanup();
        await reader?.cancel().catch(() => undefined);
        reader?.releaseLock();
      }
    };
    return { stream: stream(), modelUsed: publicModelId };
  }
};
