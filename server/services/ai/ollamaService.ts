import { aiProviderConfig } from '../../config/aiProviderConfig.js';
import type { AiRequestOptions } from './aiRequestService.js';
import { getModelDefinition } from './aiModelRegistry.js';
import { classifyAiError } from './aiReliabilityService.js';

type OllamaMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
};

function buildMessages(options: AiRequestOptions): OllamaMessage[] {
  const messages: OllamaMessage[] = [];
  if (options.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction });
  }
  for (const item of options.history || []) {
    const content = (item.parts || []).map(part => part.text || '').join('\n').trim();
    if (content) {
      messages.push({ role: item.role === 'model' ? 'assistant' : 'user', content });
    }
  }

  // Vision / Multimodal image attachments
  if (options.attachments && options.attachments.length > 0) {
    const userContent: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
      { type: 'text', text: options.prompt }
    ];
    for (const att of options.attachments) {
      if (att.base64 && att.mimeType?.startsWith('image/')) {
        const cleanBase64 = att.base64.includes(',') ? att.base64 : `data:${att.mimeType};base64,${att.base64}`;
        userContent.push({
          type: 'image_url',
          image_url: { url: cleanBase64 }
        });
      }
    }
    messages.push({ role: 'user', content: userContent });
  } else {
    messages.push({ role: 'user', content: options.prompt });
  }

  return messages;
}

export const ollamaService = {
  getBaseUrl(): string {
    const raw = aiProviderConfig.getApiKey('ollama') || 'http://127.0.0.1:11434';
    return raw.replace(/\/+$/, '');
  },

  isAvailable(): boolean {
    return Boolean(this.getBaseUrl());
  },

  async generateResponse(options: AiRequestOptions, publicModelId: string): Promise<{ text: string; modelUsed: string; isFallback: boolean }> {
    const model = getModelDefinition(publicModelId);
    if (!model || model.provider !== 'ollama') throw new Error('MODEL_NOT_FOUND');

    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/v1/chat/completions`;
    const messages = buildMessages(options);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    const onAbort = () => controller.abort();
    options.abortSignal?.addEventListener('abort', onAbort, { once: true });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.providerModelId,
          messages,
          temperature: 0.7,
          max_tokens: options.maxOutputTokens || 3000,
          stream: false
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`OLLAMA_ERROR_${response.status}: ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      return {
        text: content,
        modelUsed: publicModelId,
        isFallback: false
      };
    } catch (err: any) {
      const normalized = classifyAiError(err);
      console.warn(`[OLLAMA] Request failed category=${normalized.category}`, err?.message);
      throw normalized;
    } finally {
      clearTimeout(timeout);
      options.abortSignal?.removeEventListener('abort', onAbort);
    }
  },

  async generateStream(options: AiRequestOptions, publicModelId: string): Promise<{ stream: AsyncGenerator<{ text: string }, void, unknown>; modelUsed: string }> {
    const model = getModelDefinition(publicModelId);
    if (!model || model.provider !== 'ollama') throw new Error('MODEL_NOT_FOUND');

    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/v1/chat/completions`;
    const messages = buildMessages(options);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    const onAbort = () => controller.abort();
    options.abortSignal?.addEventListener('abort', onAbort, { once: true });

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.providerModelId,
          messages,
          temperature: 0.7,
          max_tokens: options.maxOutputTokens || 3000,
          stream: true
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`OLLAMA_STREAM_ERROR_${response.status}: ${errText}`);
      }
    } catch (err: any) {
      clearTimeout(timeout);
      options.abortSignal?.removeEventListener('abort', onAbort);
      const normalized = classifyAiError(err);
      console.warn(`[OLLAMA] Stream connection failed category=${normalized.category}`, err?.message);
      throw normalized;
    }

    const stream = async function* (): AsyncGenerator<{ text: string }, void, unknown> {
      try {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('OLLAMA_STREAM_UNAVAILABLE');
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || !line.startsWith('data:')) continue;
            const dataStr = line.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') return;

            try {
              const parsed = JSON.parse(dataStr);
              const chunk = parsed.choices?.[0]?.delta?.content;
              if (chunk) {
                yield { text: chunk };
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      } catch (err: any) {
        const normalized = classifyAiError(err);
        throw normalized;
      } finally {
        clearTimeout(timeout);
        options.abortSignal?.removeEventListener('abort', onAbort);
      }
    };

    return {
      stream: stream(),
      modelUsed: publicModelId
    };
  }
};
