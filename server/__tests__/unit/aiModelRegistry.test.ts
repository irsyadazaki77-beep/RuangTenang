import { describe, expect, it } from 'vitest';
import {
  AI_MODEL_REGISTRY,
  DEFAULT_AI_MODEL_ID,
  getConfiguredDefaultAiModelId,
  getPublicModelCatalog,
  LEGACY_AI_MODEL_ALIASES,
  resolveAiModel,
  AiModelError
} from '../../services/ai/aiModelRegistry.js';

describe('AI model registry', () => {
  it('defines unique public IDs with explicit provider mappings', () => {
    const ids = AI_MODEL_REGISTRY.map(model => model.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(AI_MODEL_REGISTRY.every(model => model.provider && model.providerModelId)).toBe(true);
    expect(AI_MODEL_REGISTRY.find(model => model.id === DEFAULT_AI_MODEL_ID)?.isDefault).toBe(true);
  });

  it('resolves only registered models allowed for the requested tier', () => {
    expect(resolveAiModel('deepseek-chat', 'Free').providerModelId).toBe('deepseek-chat');
    expect(() => resolveAiModel('gemini-3.1-pro-preview', 'Free')).toThrowError(
      expect.objectContaining({ code: 'MODEL_NOT_ALLOWED' })
    );
    expect(() => resolveAiModel('made-up-model', 'Free')).toThrowError(AiModelError);
  });

  it('normalizes only explicitly registered legacy aliases', () => {
    expect(resolveAiModel('deepseek-r1', 'Free').id).toBe('deepseek-reasoner');
    expect(resolveAiModel('openai/gpt-oss-120b', 'Free').provider).toBe('groq');
    expect(() => resolveAiModel('nvidia/arbitrary-model', 'Free')).toThrowError('MODEL_NOT_FOUND');
    expect(Object.keys(LEGACY_AI_MODEL_ALIASES).length).toBeGreaterThan(0);
  });

  it('chooses a configured tier-valid default when the canonical default provider is missing', () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    const originalDeepSeek = process.env.DEEPSEEK_API_KEY;
    try {
      delete process.env.GEMINI_API_KEY;
      process.env.DEEPSEEK_API_KEY = `sk-${'x'.repeat(32)}`;
      expect(getConfiguredDefaultAiModelId('Free')).toBe('deepseek-reasoner');
    } finally {
      if (originalGemini === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
      if (originalDeepSeek === undefined) delete process.env.DEEPSEEK_API_KEY;
      else process.env.DEEPSEEK_API_KEY = originalDeepSeek;
    }
  });

  it('returns a public catalog without provider credentials or provider model slugs', () => {
    const catalog = getPublicModelCatalog();
    expect(catalog.length).toBe(AI_MODEL_REGISTRY.length);
    expect(catalog.every(model => !('providerModelId' in model))).toBe(true);
    expect(catalog.every(model => !('apiKey' in model))).toBe(true);
  });
});
