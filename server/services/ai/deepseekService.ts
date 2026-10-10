import { AI_CONFIG } from '../../config/aiConfig.js';
import { aiProviderConfig } from '../../config/aiProviderConfig.js';


import { AiRequestOptions } from './aiRequestService.js';
import { getModelDefinition } from './aiModelRegistry.js';
import { AI_RELIABILITY_POLICY } from './aiReliabilityService.js';

export interface DeepSeekChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const deepseekService = {
  getApiKey(): string {
    const envKey = aiProviderConfig.getApiKey('deepseek');
    if (envKey && envKey.startsWith('sk-') && !envKey.includes('n123') && envKey.length >= 30) {
      return envKey;
    }
    return '';
  },

  isAvailable(): boolean {
    return Boolean(this.getApiKey());
  },

  mapModelName(modelId: string): string {
    const model = getModelDefinition(modelId);
    if (!model || model.provider !== 'deepseek') throw new Error('MODEL_NOT_FOUND');
    return model.providerModelId;
  },

  buildMessages(options: AiRequestOptions): DeepSeekChatMessage[] {
    const { prompt, history = [], systemInstruction } = options;
    const messages: DeepSeekChatMessage[] = [];

    if (systemInstruction) {
      messages.push({
        role: 'system',
        content: systemInstruction
      });
    }

    // Convert history
    for (const item of history) {
      const role = item.role === 'model' ? 'assistant' : 'user';
      const text = (item.parts || []).map(p => p.text || '').join('\n').trim();
      if (text) {
        messages.push({
          role,
          content: text
        });
      }
    }

    // Add current sanitized prompt
    messages.push({
      role: 'user',
      content: prompt
    });

    return messages;
  },

  async generateResponse(
    options: AiRequestOptions,
    targetModel: string
  ): Promise<{ text: string; modelUsed: string; isFallback: boolean }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY_MISSING');
    }

    const deepseekModel = this.mapModelName(targetModel);
    const messages = this.buildMessages(options);
    const isAnonymous = !options.userId || options.userId === 'guest';
    const maxTokens = isAnonymous ? 500 : (AI_CONFIG.MAX_OUTPUT_TOKENS || 1000);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_RELIABILITY_POLICY.connectTimeoutMs);

    if (options.abortSignal) {
      options.abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      console.info(`[DEEPSEEK] Requesting non-streaming completion for model "${deepseekModel}"...`);
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: deepseekModel,
          messages,
          temperature: deepseekModel === 'deepseek-reasoner' ? undefined : 0.6, // DeepSeek R1 does not require/recommend custom temp
          max_tokens: maxTokens,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const quota = /quota|billing|resource_exhausted/i.test(errorText);
        const retryAfter = response.headers.get('retry-after');
        const retryAfterMs = retryAfter ? (Number.isFinite(Number(retryAfter)) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now()) : undefined;
        throw Object.assign(new Error(`DEEPSEEK_API_ERROR_${response.status}${quota ? '_QUOTA_EXHAUSTED' : ''}`), { statusCode: response.status, retryAfterMs: retryAfterMs && retryAfterMs > 0 ? retryAfterMs : undefined });
      }

      const data = await response.json();
      const outputText = data.choices?.[0]?.message?.content || '';

      return {
        text: outputText,
        modelUsed: targetModel,
        isFallback: false
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('[DEEPSEEK] Execution error:', err?.message || err);
      throw err;
    }
  },

  async generateStream(
    options: AiRequestOptions,
    targetModel: string
  ): Promise<{ stream: AsyncGenerator<{ text: string }, void, unknown>; modelUsed: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY_MISSING');
    }

    const deepseekModel = this.mapModelName(targetModel);
    const messages = this.buildMessages(options);
    const isAnonymous = !options.userId || options.userId === 'guest';
    const maxTokens = isAnonymous ? 600 : 1500;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_RELIABILITY_POLICY.totalRequestTimeoutMs);

    if (options.abortSignal) {
      options.abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    console.info(`[DEEPSEEK] Initiating streaming request for model "${deepseekModel}"...`);

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: deepseekModel,
        messages,
        temperature: deepseekModel === 'deepseek-reasoner' ? undefined : 0.6,
        max_tokens: maxTokens,
        stream: true
      }),
      signal: controller.signal
    });

    if (!response.ok || !response.body) {
      clearTimeout(timeoutId);
      const errorText = await response.text().catch(() => '');
      const quota = /quota|billing|resource_exhausted/i.test(errorText);
      const retryAfter = response.headers.get('retry-after');
      const retryAfterMs = retryAfter ? (Number.isFinite(Number(retryAfter)) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now()) : undefined;
      throw Object.assign(new Error(`DEEPSEEK_STREAM_ERROR_${response.status}${quota ? '_QUOTA_EXHAUSTED' : ''}`), { statusCode: response.status, retryAfterMs: retryAfterMs && retryAfterMs > 0 ? retryAfterMs : undefined });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    async function* makeGenerator() {
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
            if (!trimmed || trimmed.startsWith(':')) continue;

            if (trimmed === 'data: [DONE]') {
              return;
            }

            if (trimmed.startsWith('data: ')) {
              try {
                const jsonStr = trimmed.slice(6).trim();
                if (!jsonStr) continue;
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta;
                const textContent = delta?.content || '';

                if (textContent) {
                  yield { text: textContent };
                }
              } catch {
                throw new Error('AI_STREAM_CONTENT_ERROR');
              }
            }
          }
        }

        // Process leftover buffer
        if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
          try {
            const jsonStr = buffer.trim().slice(6).trim();
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            const textContent = delta?.content || '';
            if (textContent) {
              yield { text: textContent };
            }
          } catch { throw new Error('AI_STREAM_CONTENT_ERROR'); }
        }
      } finally {
        clearTimeout(timeoutId);
        try {
          reader.releaseLock();
        } catch {}
      }
    }

    return {
      stream: makeGenerator(),
      modelUsed: targetModel
    };
  }
};
