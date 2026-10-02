import { describe, expect, it } from 'vitest';
import { AI_MODEL_REGISTRY } from '../../services/ai/aiModelRegistry.js';
import { ComparisonValidationError, reserveComparisonQuota, validateComparisonCandidates } from '../../services/ai/comparisonValidation.js';

const available = () => true;

describe('workspace comparison model validation', () => {
  it('accepts two or three unique canonical catalog models', () => {
    expect(validateComparisonCandidates(['gemini-3.8-flash', 'deepseek-chat'], 'Free', false, { providerConfigured: available })).toHaveLength(2);
    expect(validateComparisonCandidates(['gemini-3.8-flash', 'deepseek-chat', 'groq-gpt-120b'], 'Free', false, { providerConfigured: available })).toHaveLength(3);
  });

  it('rejects a fourth, duplicate, or non-canonical provider model ID', () => {
    expect(() => validateComparisonCandidates(['gemini-3.8-flash', 'deepseek-chat', 'groq-gpt-120b', 'groq-qwen-27b'], 'Free', false, { providerConfigured: available })).toThrowError(expect.objectContaining({ code: 'INVALID_COUNT' }));
    expect(() => validateComparisonCandidates(['gemini-3.8-flash', 'gemini-3.8-flash'], 'Free', false, { providerConfigured: available })).toThrowError(expect.objectContaining({ code: 'DUPLICATE_MODELS' }));
    expect(() => validateComparisonCandidates(['gemini-3.8-flash', 'openai/gpt-oss-120b'], 'Free', false, { providerConfigured: available })).toThrowError(expect.objectContaining({ code: 'MODEL_NOT_FOUND' }));
  });

  it('rejects restricted tier and unsupported required capabilities', () => {
    expect(() => validateComparisonCandidates(['gemini-3.8-flash', 'gemini-3.1-pro-preview'], 'Free', false, { providerConfigured: available })).toThrowError(expect.objectContaining({ code: 'MODEL_NOT_ALLOWED' }));
    const registry = AI_MODEL_REGISTRY.map(model => model.id === 'deepseek-chat' ? { ...model, capabilities: ['chat'] as const } : model);
    expect(() => validateComparisonCandidates(['gemini-3.8-flash', 'deepseek-chat'], 'Free', false, { registry, providerConfigured: available })).toThrowError(expect.objectContaining({ code: 'MODEL_CAPABILITY_UNSUPPORTED' }));
  });

  it('rejects models whose provider is unavailable and attachments without provider capability support', () => {
    expect(() => validateComparisonCandidates(['gemini-3.8-flash', 'deepseek-chat'], 'Free', false, { providerConfigured: model => model.provider === 'gemini' })).toThrowError(ComparisonValidationError);
    expect(() => validateComparisonCandidates(['gemini-3.8-flash', 'deepseek-chat'], 'Free', true, { providerConfigured: available })).toThrowError(expect.objectContaining({ code: 'ATTACHMENT_UNSUPPORTED' }));
  });

  it('reserves quota for each candidate and releases earlier reservations when quota is exhausted', async () => {
    let reserved = 0;
    let released = 0;
    const result = await reserveComparisonQuota(3, async () => {
      reserved++;
      return { allowed: reserved < 3, reserved: true };
    }, async () => { released++; });
    expect(result.allowed).toBe(false);
    expect(reserved).toBe(3);
    expect(released).toBe(2);
  });
});
