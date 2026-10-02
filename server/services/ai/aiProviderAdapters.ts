import type { ProviderId } from './aiModelRegistry.js';
import type { AiRequestOptions } from './aiRequestService.js';
import { deepseekService } from './deepseekService.js';
import { groqService } from './groqService.js';
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

export const AI_PROVIDER_ADAPTERS: Readonly<Record<Exclude<ProviderId, 'gemini'>, AiProviderAdapter>> = {
  deepseek: {
    provider: 'deepseek',
    isAvailable: () => deepseekService.isAvailable(),
    generate: (options, modelId) => deepseekService.generateResponse(options, modelId),
    generateStream: (options, modelId) => deepseekService.generateStream(options, modelId)
  },
  groq: {
    provider: 'groq',
    isAvailable: () => groqService.isAvailable(),
    generate: (options, modelId) => groqService.generateResponse(options, modelId),
    generateStream: (options, modelId) => groqService.generateStream(options, modelId)
  },
  openrouter: {
    provider: 'openrouter',
    isAvailable: () => openrouterService.isAvailable(),
    generate: (options, modelId) => openrouterService.generateResponse(options, modelId),
    generateStream: (options, modelId) => openrouterService.generateStream(options, modelId)
  }
};
