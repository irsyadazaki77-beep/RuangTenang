import { aiProviderConfig } from '../../config/aiProviderConfig.js';
import type { AiRequestOptions } from './aiRequestService.js';
import { getModelDefinition } from './aiModelRegistry.js';
import { AI_RELIABILITY_POLICY, classifyAiError } from './aiReliabilityService.js';

type OpenAIMessage = { role: 'system' | 'user' | 'assistant'; content: string };

function buildMessages(options: AiRequestOptions): OpenAIMessage[] {
  const messages: OpenAIMessage[] = [];
  if (options.systemInstruction) messages.push({ role: 'system', content: options.systemInstruction });
  for (const item of options.history || []) {
    const content = (item.parts || []).map(part => part.text || '').join('\n').trim();
    if (content) messages.push({ role: item.role === 'model' ? 'assistant' : 'user', content });
  }
  messages.push({ role: 'user', content: options.prompt });
  return messages;
}

function getRetryAfterMs(response: Response): number | undefined {
  const value = response.headers.get('retry-after');
  if (!value) return undefined;
  const milliseconds = Number.isFinite(Number(value)) ? Number(value) * 1000 : Date.parse(value) - Date.now();
  return milliseconds > 0 ? milliseconds : undefined;
}

async function providerError(response: Response, streaming = false) {
  const errorDetail = await response.text().catch(() => '');

  let parsedMsg: string;
  try {
    const json = JSON.parse(errorDetail);
    parsedMsg = json.error?.message || json.message || errorDetail;
  } catch {
    parsedMsg = errorDetail;
  }

  const isQuota = /quota|billing|credit_balance_exhausted|insufficient_quota|credits remaining/i.test(errorDetail);
  const error = Object.assign(
    new Error(`OPENAI_${streaming ? 'STREAM_' : ''}ERROR_${response.status}${isQuota ? '_QUOTA_EXHAUSTED' : ''}: ${parsedMsg || response.statusText}`),
    {
      statusCode: response.status,
      retryAfterMs: getRetryAfterMs(response)
    }
  );
  return classifyAiError(error);
}

export const openaiService = {
  getApiKey(): string {
    return aiProviderConfig.getApiKey('openai');
  },

  isAvailable(): boolean {
    return Boolean(this.getApiKey());
  },

  mapModelName(modelId: string): string {
    const model = getModelDefinition(modelId);
    if (!model || model.provider !== 'openai') throw new Error('MODEL_NOT_FOUND');
    return model.providerModelId;
  },

  async generateResponse(options: AiRequestOptions, targetModel: string): Promise<{ text: string; modelUsed: string; isFallback: boolean }> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('OPENAI_API_KEY_MISSING');
    const model = this.mapModelName(targetModel);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_RELIABILITY_POLICY.connectTimeoutMs);
    const abort = () => controller.abort();
    if (options.abortSignal?.aborted) controller.abort();
    else options.abortSignal?.addEventListener('abort', abort, { once: true });

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: buildMessages(options),
          max_completion_tokens: Math.min(options.maxOutputTokens || (!options.userId || options.userId === 'guest' ? 500 : 1000), !options.userId || options.userId === 'guest' ? 500 : 1000),
          stream: false,
          store: false
        }),
        signal: controller.signal
      });
      if (!response.ok) throw await providerError(response);
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) throw Object.assign(new Error('AI_PROVIDER_CONTENT_ERROR_INVALID_RESPONSE'), { category: 'CONTENT_ERROR', retryable: false });
      return { text: text.trim(), modelUsed: targetModel, isFallback: false };
    } catch (error) {
      const normalized = classifyAiError(error);
      console.warn(`[OPENAI] Request failed category=${normalized.category}`);
      throw normalized;
    } finally {
      clearTimeout(timeoutId);
      options.abortSignal?.removeEventListener('abort', abort);
    }
  },

  async generateStream(options: AiRequestOptions, targetModel: string): Promise<{ stream: AsyncGenerator<{ text: string }, void, unknown>; modelUsed: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('OPENAI_API_KEY_MISSING');
    const model = this.mapModelName(targetModel);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_RELIABILITY_POLICY.totalRequestTimeoutMs);
    const abort = () => controller.abort();
    if (options.abortSignal?.aborted) controller.abort();
    else options.abortSignal?.addEventListener('abort', abort, { once: true });

    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: buildMessages(options),
          max_completion_tokens: !options.userId || options.userId === 'guest' ? 500 : 1000,
          stream: true,
          store: false
        }),
        signal: controller.signal
      });
      if (!response.ok || !response.body) throw await providerError(response, true);
    } catch (error) {
      clearTimeout(timeoutId);
      options.abortSignal?.removeEventListener('abort', abort);
      throw classifyAiError(error);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    async function* chunks(): AsyncGenerator<{ text: string }, void, unknown> {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') return;
            try {
              const content = JSON.parse(payload).choices?.[0]?.delta?.content;
              if (typeof content === 'string' && content) yield { text: content };
            } catch {
              throw Object.assign(new Error('AI_STREAM_CONTENT_ERROR'), { category: 'CONTENT_ERROR', retryable: false });
            }
          }
        }
      } catch (error) {
        throw classifyAiError(error);
      } finally {
        clearTimeout(timeoutId);
        options.abortSignal?.removeEventListener('abort', abort);
        try { reader.releaseLock(); } catch { /* stream already closed */ }
      }
    }

    return { stream: chunks(), modelUsed: targetModel };
  }
};
