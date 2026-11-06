import type { ProviderId } from './aiModelRegistry.js';
import type { AiRequestOptions } from './aiRequestService.js';
import { openrouterService } from './openrouterService.js';

export interface AiProviderAdapter {
  readonly provider: Exclude<ProviderId, 'gemini'>;
  isAvailable(): boolean;
  generate(options: AiRequestOptions, publicModelId: string): Promise<{ text: string; modelUsed: string; isFallback: boolean }>;
  generateStream(options: AiRequestOptions, publicModelId: string): Promise<{
    stream: AsyncGenerator<{ text: string }, void, unknown>;
    modelUsed: string;
  }>;
}

const unavailableAdapter = (provider: Exclude<ProviderId, 'gemini'>): AiProviderAdapter => ({
  provider,
  isAvailable: () => false,
  generate: () => Promise.reject(Object.assign(new Error(`PROVIDER_${provider.toUpperCase()}_DISABLED`), { category: 'PROVIDER_UNAVAILABLE', retryable: false })),
  generateStream: () => Promise.reject(Object.assign(new Error(`PROVIDER_${provider.toUpperCase()}_DISABLED`), { category: 'PROVIDER_UNAVAILABLE', retryable: false }))
});

export const AI_PROVIDER_ADAPTERS: Readonly<Record<Exclude<ProviderId, 'gemini'>, AiProviderAdapter>> = {
  ollama: unavailableAdapter('ollama'),
  deepseek: unavailableAdapter('deepseek'),
  groq: unavailableAdapter('groq'),
  openai: unavailableAdapter('openai'),
  openrouter: {
    provider: 'openrouter',
    isAvailable: () => openrouterService.isAvailable(),
    generate: (options, modelId) => openrouterService.generateResponse(options, modelId),
    generateStream: (options, modelId) => openrouterService.generateStream(options, modelId)
  }
};
