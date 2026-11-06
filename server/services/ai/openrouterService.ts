import { aiProviderConfig } from '../../config/aiProviderConfig.js';
import { AiRequestOptions } from './aiRequestService.js';
import { getModelDefinition } from './aiModelRegistry.js';
import { AI_RELIABILITY_POLICY, classifyAiError } from './aiReliabilityService.js';

export type OpenRouterMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

export interface OpenRouterChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: OpenRouterMessageContent;
}

/**
 * HARD GUARD: Guarantees 100% zero paid credit usage on OpenRouter.
 * Every model sent to OpenRouter MUST either be `openrouter/free` or explicitly end with `:free`.
 */
export function assertStrictFreeOpenRouterModel(providerModelId: string): string {
  const normalized = (providerModelId || '').trim();
  if (normalized === 'openrouter/free' || normalized.endsWith(':free')) {
    return normalized;
  }
  throw Object.assign(
    new Error(`OPENROUTER_PAID_MODEL_BLOCKED: Model "${normalized}" ditolak karena bukan model gratis (:free).`),
    { category: 'INVALID_REQUEST', retryable: false, statusCode: 400 }
  );
}

export const openrouterService = {
  getApiKey(): string {
    const envKey = aiProviderConfig.getApiKey('openrouter');
    if (envKey && envKey.startsWith('sk-or-') && envKey.length >= 30) {
      return envKey;
    }
    return '';
  },

  isAvailable(): boolean {
    return Boolean(this.getApiKey());
  },

  mapModelName(modelId: string): string {
    const model = getModelDefinition(modelId);
    if (!model || model.provider !== 'openrouter') {
      throw new Error('MODEL_NOT_FOUND');
    }
    return assertStrictFreeOpenRouterModel(model.providerModelId);
  },

  buildMessages(options: AiRequestOptions): OpenRouterChatMessage[] {
    const { prompt, history = [], systemInstruction, attachments = [] } = options;
    const messages: OpenRouterChatMessage[] = [];

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

    // Add current user prompt (with optional multimodal vision attachments for VL free models)
    const imageAttachments = (attachments || []).filter(
      att => att && typeof att.base64 === 'string' && (!att.mimeType || att.mimeType.startsWith('image/'))
    );

    if (imageAttachments.length > 0) {
      const contentParts: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      > = [{ type: 'text', text: prompt }];

      for (const att of imageAttachments) {
        const mimeType = att.mimeType || 'image/png';
        const dataUrl = att.base64.startsWith('data:')
          ? att.base64
          : `data:${mimeType};base64,${att.base64}`;
        contentParts.push({
          type: 'image_url',
          image_url: { url: dataUrl }
        });
      }

      messages.push({
        role: 'user',
        content: contentParts
      });
    } else {
      messages.push({
        role: 'user',
        content: prompt
      });
    }

    return messages;
  },

  async generateResponse(
    options: AiRequestOptions,
    targetModel: string
  ): Promise<{ text: string; modelUsed: string; isFallback: boolean }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY_MISSING');
    }

    const primaryOpenRouterModel = this.mapModelName(targetModel);
    const messages = this.buildMessages(options);
    const isAnonymous = !options.userId || options.userId === 'guest';
    const defaultMax = isAnonymous ? 4096 : 8192;
    const maxTokens = Math.max(Math.min(options.maxOutputTokens || defaultMax, isAnonymous ? 6144 : 8192), 512);

    // Try the requested `:free` model first; if upstream free provider is busy (429/502/503/404)
    // and not in strict comparisonMode, automatically fall back to `openrouter/free` (100% Free Router).
    const modelsToAttempt =
      !options.comparisonMode && primaryOpenRouterModel !== 'openrouter/free'
        ? [primaryOpenRouterModel, 'openrouter/free']
        : [primaryOpenRouterModel];

    let lastErr: unknown;

    for (const [attemptIdx, rawModelId] of modelsToAttempt.entries()) {
      const openrouterModel = assertStrictFreeOpenRouterModel(rawModelId);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AI_RELIABILITY_POLICY.connectTimeoutMs);

      if (options.abortSignal) {
        options.abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      try {
        console.info(`[OPENROUTER] Requesting non-streaming completion for free model "${openrouterModel}"...`);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://ruangtenang.ac.id',
            'X-Title': 'RuangTenang Kampus'
          },
          body: JSON.stringify({
            model: openrouterModel,
            messages,
            temperature: options.responseFormat === 'json' ? 0.2 : 0.6,
            max_tokens: maxTokens,
            stream: false
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          const quota = /quota|billing|resource_exhausted|credits/i.test(errorText);
          const retryAfter = response.headers.get('retry-after');
          const retryAfterMs = retryAfter
            ? Number.isFinite(Number(retryAfter))
              ? Number(retryAfter) * 1000
              : Date.parse(retryAfter) - Date.now()
            : undefined;
          throw Object.assign(
            new Error(`OPENROUTER_API_ERROR_${response.status}${quota ? '_QUOTA_EXHAUSTED' : ''}`),
            {
              statusCode: response.status,
              retryAfterMs: retryAfterMs && retryAfterMs > 0 ? retryAfterMs : undefined
            }
          );
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const content = typeof choice?.message?.content === 'string' ? choice.message.content.trim() : '';
        const outputText = content;
        if (!outputText) {
          throw Object.assign(new Error('AI_PROVIDER_CONTENT_ERROR_INVALID_RESPONSE'), {
            category: 'CONTENT_ERROR',
            retryable: true
          });
        }
        clearTimeout(timeoutId);

        return {
          text: outputText,
          modelUsed: attemptIdx > 0 ? 'openrouter-free-auto' : targetModel,
          isFallback: attemptIdx > 0
        };
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        lastErr = classifyAiError(err);
        console.warn(`[OPENROUTER] Free model "${openrouterModel}" attempt ${attemptIdx + 1} failed category=${(lastErr as any)?.category}`);
        if (options.abortSignal?.aborted || attemptIdx + 1 >= modelsToAttempt.length) {
          throw lastErr;
        }
      }
    }

    throw classifyAiError(lastErr);
  },

  async generateStream(
    options: AiRequestOptions,
    targetModel: string
  ): Promise<{ stream: AsyncGenerator<{ text: string }, void, unknown>; modelUsed: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY_MISSING');
    }

    const primaryOpenRouterModel = this.mapModelName(targetModel);
    const messages = this.buildMessages(options);
    const isAnonymous = !options.userId || options.userId === 'guest';
    const defaultMax = isAnonymous ? 4096 : 8192;
    const maxTokens = Math.max(Math.min(options.maxOutputTokens || defaultMax, isAnonymous ? 6144 : 8192), 512);

    const modelsToAttempt =
      !options.comparisonMode && primaryOpenRouterModel !== 'openrouter/free'
        ? [primaryOpenRouterModel, 'openrouter/free']
        : [primaryOpenRouterModel];

    let response: Response | null = null;
    let activeModelUsed = targetModel;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let controller = new AbortController();
    let lastError: unknown;

    for (const [attemptIdx, rawModelId] of modelsToAttempt.entries()) {
      const openrouterModel = assertStrictFreeOpenRouterModel(rawModelId);
      controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), AI_RELIABILITY_POLICY.totalRequestTimeoutMs);

      if (options.abortSignal) {
        options.abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      console.info(`[OPENROUTER] Initiating streaming request for free model "${openrouterModel}"...`);

      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://ruangtenang.ac.id',
            'X-Title': 'RuangTenang Kampus'
          },
          body: JSON.stringify({
            model: openrouterModel,
            messages,
            temperature: 0.6,
            max_tokens: maxTokens,
            stream: true
          }),
          signal: controller.signal
        });

        if (!res.ok || !res.body) {
          clearTimeout(timeoutId);
          const errorText = await res.text().catch(() => '');
          const quota = /quota|billing|resource_exhausted|credits/i.test(errorText);
          const retryAfter = res.headers.get('retry-after');
          const retryAfterMs = retryAfter
            ? Number.isFinite(Number(retryAfter))
              ? Number(retryAfter) * 1000
              : Date.parse(retryAfter) - Date.now()
            : undefined;
          throw Object.assign(
            new Error(`OPENROUTER_STREAM_ERROR_${res.status}${quota ? '_QUOTA_EXHAUSTED' : ''}`),
            {
              statusCode: res.status,
              retryAfterMs: retryAfterMs && retryAfterMs > 0 ? retryAfterMs : undefined
            }
          );
        }

        response = res;
        activeModelUsed = attemptIdx > 0 ? 'openrouter-free-auto' : targetModel;
        break;
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        lastError = err;
        if (options.abortSignal?.aborted || attemptIdx + 1 >= modelsToAttempt.length) {
          throw err;
        }
        console.warn(`[OPENROUTER] Stream init failed on "${openrouterModel}", falling back to "openrouter/free"...`);
      }
    }

    if (!response || !response.body) {
      throw lastError || new Error('OPENROUTER_STREAM_UNAVAILABLE');
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
                // Never forward private reasoning tokens to the client.
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
          } catch {
            throw new Error('AI_STREAM_CONTENT_ERROR');
          }
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        try {
          reader.releaseLock();
        } catch {}
      }
    }

    return {
      stream: makeGenerator(),
      modelUsed: activeModelUsed
    };
  }
};
