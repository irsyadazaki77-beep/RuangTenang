import type { AiRequestOptions } from './aiRequestService.js';
import { getModelDefinition } from './aiModelRegistry.js';
import { AI_RELIABILITY_POLICY, classifyAiError } from './aiReliabilityService.js';
import { getLocalModel, isLocalModelAvailable, localInferenceQueue, ollamaBaseUrl, refreshOllamaInventory } from './ollamaRuntime.js';

type OllamaMessage = { role: 'system' | 'user' | 'assistant'; content: string; images?: string[] };

function buildMessages(options: AiRequestOptions): OllamaMessage[] {
  const messages: OllamaMessage[] = [];
  if (options.systemInstruction) messages.push({ role: 'system', content: options.systemInstruction });
  for (const item of options.history || []) {
    const content = (item.parts || []).map(part => part.text || '').join('\n').trim();
    if (content) messages.push({ role: item.role === 'model' ? 'assistant' : 'user', content });
  }
  const images = (options.attachments || []).filter(a => a.base64 && a.mimeType?.startsWith('image/'))
    .map(a => a.base64.includes(',') ? a.base64.split(',')[1] : a.base64);
  messages.push({ role: 'user', content: options.prompt, ...(images.length ? { images } : {}) });
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
    const configuredContext = Number(process.env.OLLAMA_NUM_CTX);
    const contextSize = Number.isInteger(configuredContext) && configuredContext >= 2048 && configuredContext <= 32768 ? configuredContext : 8192;
    const numCtx = Math.min(contextSize, local?.contextLength || contextSize);
    const response = await fetch(`${ollamaBaseUrl()}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model.providerModelId, messages, stream,
        // Release weights after each inference so model switching cannot accumulate RAM/VRAM.
        keep_alive: 0,
        ...(local?.capabilities.includes('thinking') ? { think: false } : {}),
        ...(options.responseFormat === 'json' ? { format: 'json' } : {}),
        options: { temperature: options.responseFormat === 'json' ? 0.1 : 0.6, num_ctx: numCtx,
          // DeepSeek R1 can spend the requested token budget on hidden thinking
          // even when think=false; leave enough room for a visible answer.
          num_predict: Math.min(model.id === 'ollama-deepseek-r1-1.5b'
            ? Math.max(options.maxOutputTokens || 2500, 1024)
            : options.maxOutputTokens || 2500, Math.floor(numCtx / 2)) }
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
