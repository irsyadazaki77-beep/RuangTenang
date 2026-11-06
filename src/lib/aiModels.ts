export {
  DEFAULT_AI_MODEL_ID,
  AUTO_ROUTING_MODEL_ID,
  DEFAULT_TENANG_PROFILE_ID,
  DEFAULT_KERJA_PROFILE_ID,
  TENANG_PROFILES,
  KERJA_PROFILES,
  ALL_AI_PROFILES,
  TENANG_PROFILE_IDS,
  KERJA_PROFILE_IDS,
  ALL_AI_PROFILE_IDS,
  isTenangProfile,
  isKerjaProfile,
  isAiProfile
} from '../../shared/aiModelContract';
export type {
  AiModelCatalogResponse,
  AiModelOption,
  TenangProfileId,
  KerjaProfileId,
  AiProfileId,
  AiProfileOption,
  TenangProfileOption,
  KerjaProfileOption,
  ModelAvailability,
  ModelCapability,
  ModelTier,
  ProviderId,
  RoutingMode,
  TaskCategory,
  LatencyPreference,
  QualityPreference,
  RoutingDecision,
  AiRoutingContext
} from '../../shared/aiModelContract';

import {
  DEFAULT_TENANG_PROFILE_ID,
  DEFAULT_KERJA_PROFILE_ID,
  isTenangProfile,
  isKerjaProfile,
  type TenangProfileId,
  type KerjaProfileId
} from '../../shared/aiModelContract';

export function migrateLegacyTenangModelToProfile(savedModel?: string | null): TenangProfileId {
  if (!savedModel) return DEFAULT_TENANG_PROFILE_ID;
  if (isTenangProfile(savedModel)) return savedModel;

  const lower = savedModel.toLowerCase();
  if (/reasoner|pro|opus|120b|550b|o1|o3|sonnet|r1|turbo|mendalam/i.test(lower)) {
    return 'tenang-turbo';
  }
  if (/flash|mini|haiku|fast|8b|nano|low|hemat/i.test(lower)) {
    return 'tenang-low';
  }
  return DEFAULT_TENANG_PROFILE_ID;
}

export function migrateLegacyKerjaModelToProfile(savedModel?: string | null): KerjaProfileId {
  if (!savedModel) return DEFAULT_KERJA_PROFILE_ID;
  if (isKerjaProfile(savedModel)) return savedModel;

  const lower = savedModel.toLowerCase();
  if (/reasoner|pro|opus|120b|550b|o1|o3|sonnet|r1|hard|kompleks/i.test(lower)) {
    return 'kerja-hard';
  }
  if (/flash|mini|haiku|fast|8b|nano|cepat|ringan/i.test(lower)) {
    return 'kerja-fast';
  }
  return DEFAULT_KERJA_PROFILE_ID;
}
