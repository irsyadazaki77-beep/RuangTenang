import { aiProviderConfig } from '../../config/aiProviderConfig.js';
import { AI_MODEL_REGISTRY, isModelAllowedForTier, type AiModelDefinition } from './aiModelRegistry.js';
import { AI_PROVIDER_ADAPTERS } from './aiProviderAdapters.js';

export type ComparisonValidationCode = 'INVALID_COUNT' | 'DUPLICATE_MODELS' | 'MODEL_NOT_FOUND' | 'MODEL_NOT_ALLOWED' | 'PROVIDER_NOT_CONFIGURED' | 'MODEL_CAPABILITY_UNSUPPORTED' | 'ATTACHMENT_UNSUPPORTED';

export class ComparisonValidationError extends Error {
  constructor(public readonly code: ComparisonValidationCode) { super(code); this.name = 'ComparisonValidationError'; }
}

export async function reserveComparisonQuota(
  candidateCount: number,
  reserve: () => Promise<{ allowed: boolean; reserved?: boolean }>,
  release: () => Promise<void>
): Promise<{ allowed: boolean; reservations: boolean[] }> {
  const reservations: boolean[] = [];
  for (let index = 0; index < candidateCount; index++) {
    const result = await reserve();
    if (!result.allowed) {
      for (const reserved of reservations) if (reserved) await release().catch(() => undefined);
      return { allowed: false, reservations };
    }
    reservations.push(Boolean(result.reserved));
  }
  return { allowed: true, reservations };
}

export function validateComparisonCandidates(
  selectedModelIds: string[],
  userTier: string,
  hasAttachments = false,
  dependencies: { registry?: readonly AiModelDefinition[]; providerConfigured?: (model: AiModelDefinition) => boolean } = {}
): AiModelDefinition[] {
  if (selectedModelIds.length < 2 || selectedModelIds.length > 3) throw new ComparisonValidationError('INVALID_COUNT');
  if (new Set(selectedModelIds).size !== selectedModelIds.length) throw new ComparisonValidationError('DUPLICATE_MODELS');
  const registry = dependencies.registry || AI_MODEL_REGISTRY;
  const providerConfigured = dependencies.providerConfigured || (model => aiProviderConfig.isConfigured(model.provider) && (model.provider === 'gemini' || AI_PROVIDER_ADAPTERS[model.provider].isAvailable()));
  const models = selectedModelIds.map(id => {
    const model = registry.find(item => item.id === id);
    if (!model) throw new ComparisonValidationError('MODEL_NOT_FOUND');
    if (!isModelAllowedForTier(model.id, userTier)) throw new ComparisonValidationError('MODEL_NOT_ALLOWED');
    if (!model.capabilities.includes('chat') || !model.capabilities.includes('streaming')) throw new ComparisonValidationError('MODEL_CAPABILITY_UNSUPPORTED');
    if (!providerConfigured(model)) throw new ComparisonValidationError('PROVIDER_NOT_CONFIGURED');
    if (hasAttachments) throw new ComparisonValidationError('ATTACHMENT_UNSUPPORTED');
    return model;
  });
  return models;
}
