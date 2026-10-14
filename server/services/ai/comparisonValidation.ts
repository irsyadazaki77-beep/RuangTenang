import { aiProviderConfig } from '../../config/aiProviderConfig.js';
import { 
  AI_MODEL_REGISTRY, 
  isModelAllowedForTier, 
  getProfileDefinition, 
  type AiModelDefinition 
} from './aiModelRegistry.js';
import { 
  isAiProfile, 
  isTenangProfile 
} from '../../../shared/aiModelContract.js';
import { AI_PROVIDER_ADAPTERS } from './aiProviderAdapters.js';
import { getProviderHealth } from './aiReliabilityService.js';

export type ComparisonValidationCode = 
  | 'INVALID_COUNT' 
  | 'DUPLICATE_MODELS' 
  | 'MODEL_NOT_FOUND' 
  | 'MODEL_NOT_ALLOWED' 
  | 'PROVIDER_NOT_CONFIGURED' 
  | 'MODEL_CAPABILITY_UNSUPPORTED' 
  | 'ATTACHMENT_UNSUPPORTED'
  | 'INVALID_PROFILE_FOR_MODE';

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
  userTierOrIsWorkspace: string | boolean = 'Free',
  _hasAttachments = false,
  dependencies: { registry?: readonly AiModelDefinition[]; providerConfigured?: (model: AiModelDefinition) => boolean; allowSingleCandidate?: boolean } = {}
): AiModelDefinition[] & { valid?: boolean; candidates?: (AiModelDefinition & { profileId?: string })[] } {
  const minCount = dependencies.allowSingleCandidate ? 1 : 2;
  if (selectedModelIds.length < minCount || selectedModelIds.length > 3) throw new ComparisonValidationError('INVALID_COUNT');
  if (new Set(selectedModelIds).size !== selectedModelIds.length) throw new ComparisonValidationError('DUPLICATE_MODELS');
  
  const userTier = typeof userTierOrIsWorkspace === 'boolean' ? 'Free' : (userTierOrIsWorkspace || 'Free');
  const registry = dependencies.registry || AI_MODEL_REGISTRY;
  const providerConfigured = dependencies.providerConfigured || (model => aiProviderConfig.isConfigured(model.provider) && getProviderHealth(model.provider) !== 'unavailable' && (model.provider === 'gemini' || AI_PROVIDER_ADAPTERS[model.provider].isAvailable()));

  const usedModelIds = new Set<string>();

  const models = selectedModelIds.map(id => {
    // 1. Official AI Profile Resolution
    if (isAiProfile(id)) {
      if (isTenangProfile(id)) throw new ComparisonValidationError('INVALID_PROFILE_FOR_MODE');
      const profile = getProfileDefinition(id);
      if (!profile) throw new ComparisonValidationError('MODEL_NOT_FOUND');
      const normalizedTier = userTier === 'Developer' ? 'Pro' : userTier;
      if (!profile.allowedTiers.includes(normalizedTier as any)) {
        throw new ComparisonValidationError('MODEL_NOT_ALLOWED');
      }

      // Try to find a viable candidate not yet used by another candidate in this comparison
      let candidateModel: AiModelDefinition | undefined;
      for (const candidateId of profile.candidateModelIds) {
        const item = registry.find(m => m.id === candidateId);
        if (!item) continue;
        if (!isModelAllowedForTier(item.id, userTier)) continue;
        if (!item.capabilities.includes('chat') || !item.capabilities.includes('streaming')) continue;
        if (!providerConfigured(item)) continue;

        if (!usedModelIds.has(item.id)) {
          candidateModel = item;
          break;
        }
      }

      // If no distinct model available, fallback to the first viable candidate
      if (!candidateModel) {
        for (const candidateId of profile.candidateModelIds) {
          const item = registry.find(m => m.id === candidateId);
          if (!item) continue;
          if (!isModelAllowedForTier(item.id, userTier)) continue;
          if (!item.capabilities.includes('chat') || !item.capabilities.includes('streaming')) continue;
          if (!providerConfigured(item)) continue;
          candidateModel = item;
          break;
        }
      }

      if (!candidateModel) throw new ComparisonValidationError('PROVIDER_NOT_CONFIGURED');
      usedModelIds.add(candidateModel.id);
      return { ...candidateModel, profileId: id };
    }

    // 2. Canonical Model ID Resolution (developer/admin or test mock)
    const model = registry.find(item => item.id === id);
    if (!model) throw new ComparisonValidationError('MODEL_NOT_FOUND');
    if (!isModelAllowedForTier(model.id, userTier)) throw new ComparisonValidationError('MODEL_NOT_ALLOWED');
    if (!model.capabilities.includes('chat') || !model.capabilities.includes('streaming')) throw new ComparisonValidationError('MODEL_CAPABILITY_UNSUPPORTED');
    if (!providerConfigured(model)) throw new ComparisonValidationError('PROVIDER_NOT_CONFIGURED');
    usedModelIds.add(model.id);
    return model;
  });

  (models as any).valid = true;
  (models as any).candidates = models;
  return models;
}

