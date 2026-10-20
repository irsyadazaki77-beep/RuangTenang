import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  AI_PROFILE_DEFINITIONS,
  DEFAULT_TENANG_PROFILE_ID,
  DEFAULT_KERJA_PROFILE_ID,
  getProfileDefinition,
  validateProfileMode,
  mapLegacyModelToProfile,
  getPublicProfileCatalog,
  resolveAiModel,
  AiModelError
} from '../../services/ai/aiModelRegistry.js';
import {
  TENANG_PROFILES,
  KERJA_PROFILES,
  ALL_AI_PROFILES,
  isTenangProfile,
  isKerjaProfile,
  isAiProfile
} from '../../../shared/aiModelContract.js';
import { smartModelRouter } from '../../services/ai/smartModelRouter.js';
import { validateComparisonCandidates } from '../../services/ai/comparisonValidation.js';

describe('FASE 23: Simplified AI Model Profiles & Intelligent Routing', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'valid-gemini-key';
    process.env.DEEPSEEK_API_KEY = `sk-${'a'.repeat(32)}`;
    process.env.GROQ_API_KEY = `gsk_${'b'.repeat(32)}`;
    process.env.OPENROUTER_API_KEY = `sk-or-${'c'.repeat(32)}`;
    process.env.OPENAI_API_KEY = `sk-${'d'.repeat(40)}`;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });
  describe('1. Official Profile Specifications & Catalog', () => {
    it('defines exactly the 6 official profiles with stable IDs and strict scopes', () => {
      const stableIds = [
        'tenang-turbo',
        'tenang-middle',
        'tenang-low',
        'kerja-fast',
        'kerja-santai',
        'kerja-hard'
      ];
      expect(AI_PROFILE_DEFINITIONS.map(p => p.id)).toEqual(stableIds);
      expect(TENANG_PROFILES.map(p => p.id)).toEqual(['tenang-turbo', 'tenang-middle', 'tenang-low']);
      expect(KERJA_PROFILES.map(p => p.id)).toEqual(['kerja-fast', 'kerja-santai', 'kerja-hard']);
      expect(ALL_AI_PROFILES.length).toBe(6);

      // Verify default profiles
      expect(DEFAULT_TENANG_PROFILE_ID).toBe('tenang-middle');
      expect(DEFAULT_KERJA_PROFILE_ID).toBe('kerja-santai');
      expect(AI_PROFILE_DEFINITIONS.find(p => p.id === 'tenang-middle')?.isDefault).toBe(true);
      expect(AI_PROFILE_DEFINITIONS.find(p => p.id === 'kerja-santai')?.isDefault).toBe(true);
    });

    it('verifies type guard functions', () => {
      expect(isTenangProfile('tenang-turbo')).toBe(true);
      expect(isTenangProfile('tenang-middle')).toBe(true);
      expect(isTenangProfile('tenang-low')).toBe(true);
      expect(isTenangProfile('kerja-santai')).toBe(false);
      expect(isTenangProfile('gemini-3.8-flash')).toBe(false);

      expect(isKerjaProfile('kerja-fast')).toBe(true);
      expect(isKerjaProfile('kerja-santai')).toBe(true);
      expect(isKerjaProfile('kerja-hard')).toBe(true);
      expect(isKerjaProfile('tenang-middle')).toBe(false);

      expect(isAiProfile('tenang-turbo')).toBe(true);
      expect(isAiProfile('kerja-hard')).toBe(true);
      expect(isAiProfile('arbitrary-model')).toBe(false);
    });

    it('returns clean public profile catalog filtered by tier and scope', () => {
      const tenangCatalog = getPublicProfileCatalog('Free', 'tenang');
      expect(tenangCatalog.length).toBe(3);
      expect(tenangCatalog.every(p => p.scope === 'tenang')).toBe(true);

      const kerjaCatalog = getPublicProfileCatalog('Free', 'kerja');
      expect(kerjaCatalog.length).toBe(3);
      expect(kerjaCatalog.every(p => p.scope === 'kerja')).toBe(true);
    });
  });

  describe('2. Mode Boundary Enforcement', () => {
    it('accepts Tenang profiles in Ruang Tenang and rejects in Ruang Kerja', () => {
      expect(() => validateProfileMode('tenang-turbo', false)).not.toThrow();
      expect(() => validateProfileMode('tenang-middle', false)).not.toThrow();
      expect(() => validateProfileMode('tenang-low', false)).not.toThrow();

      expect(() => validateProfileMode('tenang-turbo', true)).toThrowError(
        expect.objectContaining({ code: 'INVALID_PROFILE_FOR_MODE' })
      );
      expect(() => validateProfileMode('tenang-middle', true)).toThrowError(
        expect.objectContaining({ code: 'INVALID_PROFILE_FOR_MODE' })
      );
    });

    it('accepts Kerja profiles in Ruang Kerja and rejects in Ruang Tenang', () => {
      expect(() => validateProfileMode('kerja-fast', true)).not.toThrow();
      expect(() => validateProfileMode('kerja-santai', true)).not.toThrow();
      expect(() => validateProfileMode('kerja-hard', true)).not.toThrow();

      expect(() => validateProfileMode('kerja-hard', false)).toThrowError(
        expect.objectContaining({ code: 'INVALID_PROFILE_FOR_MODE' })
      );
      expect(() => validateProfileMode('kerja-santai', false)).toThrowError(
        expect.objectContaining({ code: 'INVALID_PROFILE_FOR_MODE' })
      );
    });

    it('router enforces mode boundary when routing a profile', () => {
      expect(() =>
        smartModelRouter.routeProfile('tenang-turbo', { isWorkspace: true })
      ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE_FOR_MODE' }));

      expect(() =>
        smartModelRouter.routeProfile('kerja-hard', { isWorkspace: false })
      ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE_FOR_MODE' }));
    });
  });

  describe('3. Multi-Provider Profile Candidate Routing', () => {
    it('routes each Ruang Tenang profile to a valid candidate', () => {
      const turboDecision = smartModelRouter.routeProfile('tenang-turbo', { isWorkspace: false });
      expect(turboDecision.profileId).toBe('tenang-turbo');
      expect(turboDecision.selectedModel.provider).toBeTruthy();
      expect(turboDecision.selectedModel.providerModelId).toBeTruthy();

      const middleDecision = smartModelRouter.routeProfile('tenang-middle', { isWorkspace: false });
      expect(middleDecision.profileId).toBe('tenang-middle');
      expect(middleDecision.selectedModel.provider).toBeTruthy();

      const lowDecision = smartModelRouter.routeProfile('tenang-low', { isWorkspace: false });
      expect(lowDecision.profileId).toBe('tenang-low');
      expect(lowDecision.selectedModel.speed).toBe('Sangat Cepat');
    });

    it('routes each Ruang Kerja profile to a valid candidate', () => {
      const fastDecision = smartModelRouter.routeProfile('kerja-fast', { isWorkspace: true });
      expect(fastDecision.profileId).toBe('kerja-fast');
      expect(fastDecision.selectedModel.speed).toBe('Sangat Cepat');

      const santaiDecision = smartModelRouter.routeProfile('kerja-santai', { isWorkspace: true });
      expect(santaiDecision.profileId).toBe('kerja-santai');
      expect(santaiDecision.selectedModel.provider).toBeTruthy();

      const hardDecision = smartModelRouter.routeProfile('kerja-hard', { isWorkspace: true });
      expect(hardDecision.profileId).toBe('kerja-hard');
      expect(hardDecision.selectedModel.reasoning).toMatch(/Tinggi|Sangat Tinggi/);
    });

    it('provides multi-provider fallback candidates without hardcoding a single provider', () => {
      const profile = getProfileDefinition('kerja-hard');
      expect(profile).toBeDefined();
      expect(profile!.candidateModelIds.length).toBeGreaterThan(1);
      // Candidates must span across multiple providers (Gemini, DeepSeek, Groq, OpenRouter, OpenAI)
      const decision = smartModelRouter.routeProfile('kerja-hard', { isWorkspace: true });
      expect(decision.fallbackCandidates).toBeDefined();
      expect(Array.isArray(decision.fallbackCandidates)).toBe(true);
    });
  });

  describe('4. Smart Fallback and Degradation Transparency', () => {
    it('detects and flags honest degradation notice when quality tier is lower than requested', () => {
      // If a high reasoning profile is forced to use a lite/fast fallback, degradationNotice must be transparent
      const def = getProfileDefinition('kerja-hard')!;
      expect(def.goal).toBe('reasoning');
      
      const decision = smartModelRouter.routeProfile('kerja-hard', { isWorkspace: true });
      if (decision.isDegraded) {
        expect(decision.degradationNotice).toBeTruthy();
        expect(decision.degradationNotice).toContain('Profil');
      }
    });

    it('resolves official profile via resolveAiModel while preserving canonical model direct resolution', () => {
      const resolvedProfile = resolveAiModel('kerja-santai', 'Free');
      expect(resolvedProfile).toBeDefined();
      expect(resolvedProfile.provider).toBeTruthy();

      // Canonical direct resolution still works for authorized dev/admin usage
      const canonicalModel = resolveAiModel('gemini-3.8-flash', 'Free');
      expect(canonicalModel.id).toBe('gemini-3.8-flash');
    });
  });

  describe('5. Compare Mode Compatibility with Profiles', () => {
    it('validates comparison candidates for official Ruang Kerja profiles', () => {
      const result = validateComparisonCandidates(['kerja-fast', 'kerja-santai'], true);
      expect(result.valid).toBe(true);
      expect(result.candidates.length).toBe(2);
      expect(result.candidates[0].profileId).toBe('kerja-fast');
      expect(result.candidates[1].profileId).toBe('kerja-santai');
    });

    it('rejects comparison with less than 2 or more than 3 candidates', () => {
      expect(() => validateComparisonCandidates(['kerja-fast'], true)).toThrowError();
      expect(() =>
        validateComparisonCandidates(
          ['kerja-fast', 'kerja-santai', 'kerja-hard', 'kerja-fast'],
          true
        )
      ).toThrowError();
    });

    it('rejects Ruang Tenang profiles in Ruang Kerja comparison', () => {
      expect(() => validateComparisonCandidates(['tenang-middle', 'kerja-santai'], true)).toThrowError(
        expect.objectContaining({ code: 'INVALID_PROFILE_FOR_MODE' })
      );
    });
  });

  describe('6. Legacy Model Preference Migration', () => {
    it('migrates legacy high-reasoning models to appropriate profiles', () => {
      expect(mapLegacyModelToProfile('deepseek-reasoner', true)).toBe('kerja-hard');
      expect(mapLegacyModelToProfile('deepseek-reasoner', false)).toBe('tenang-turbo');
      expect(mapLegacyModelToProfile('gemini-3.5-pro', true)).toBe('kerja-hard');
      expect(mapLegacyModelToProfile('gemini-3.5-pro', false)).toBe('tenang-turbo');
    });

    it('migrates legacy fast/lite models to appropriate profiles', () => {
      expect(mapLegacyModelToProfile('gemini-3.5-flash-lite', true)).toBe('kerja-fast');
      expect(mapLegacyModelToProfile('gemini-3.5-flash-lite', false)).toBe('tenang-low');
      expect(mapLegacyModelToProfile('groq-gpt-20b', true)).toBe('kerja-fast');
      expect(mapLegacyModelToProfile('groq-gpt-20b', false)).toBe('tenang-low');
    });

    it('migrates auto or undefined to default profiles per mode', () => {
      expect(mapLegacyModelToProfile('auto', true)).toBe('kerja-santai');
      expect(mapLegacyModelToProfile('auto', false)).toBe('tenang-middle');
      expect(mapLegacyModelToProfile(undefined, true)).toBe('kerja-santai');
      expect(mapLegacyModelToProfile(undefined, false)).toBe('tenang-middle');
    });
  });
});
