import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AI_RELIABILITY_POLICY,
  classifyAiError,
  executeWithReliability,
  getProviderCircuitState,
  resetAiReliabilityStateForTests
} from '../../services/ai/aiReliabilityService.js';
import { selectReliableModelCandidates } from '../../services/ai/aiRequestService.js';
import type { AiRequestOptions } from '../../services/ai/aiRequestService.js';

describe('AI reliability policy', () => {
  afterEach(() => {
    vi.useRealTimers();
    resetAiReliabilityStateForTests();
  });

  it('classifies transient and permanent errors distinctly', () => {
    expect(classifyAiError(new Error('fetch failed')).category).toBe('NETWORK_ERROR');
    expect(classifyAiError(Object.assign(new Error('HTTP 429'), { statusCode: 429 })).retryable).toBe(true);
    expect(classifyAiError(Object.assign(new Error('HTTP 401'), { statusCode: 401 })).retryable).toBe(false);
    expect(classifyAiError(new Error('SAFETY_BLOCK')).category).toBe('SAFETY_BLOCK');
  });

  it('bounds retries and returns on a later success', async () => {
    vi.useFakeTimers();
    const operation = vi.fn().mockRejectedValueOnce(new Error('fetch failed')).mockResolvedValue('ok');
    const result = executeWithReliability('deepseek', operation);
    const assertion = expect(result).resolves.toBe('ok');
    await vi.advanceTimersByTimeAsync(AI_RELIABILITY_POLICY.retryMaxDelayMs);
    await assertion;
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry permanent errors', async () => {
    const operation = vi.fn().mockRejectedValue(Object.assign(new Error('invalid key'), { statusCode: 401 }));
    await expect(executeWithReliability('groq', operation)).rejects.toMatchObject({ category: 'AUTH_ERROR', retryable: false });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('opens provider circuit after the rolling failure threshold and permits one half-open probe', async () => {
    vi.useFakeTimers();
    const operation = vi.fn().mockRejectedValue(new Error('fetch failed'));
    for (let i = 0; i < AI_RELIABILITY_POLICY.circuit.failureThreshold; i++) {
      const request = executeWithReliability('openrouter', operation);
      const assertion = expect(request).rejects.toMatchObject({ category: 'NETWORK_ERROR' });
      await vi.advanceTimersByTimeAsync(AI_RELIABILITY_POLICY.retryMaxDelayMs);
      await assertion;
    }
    expect(getProviderCircuitState('openrouter')).toBe('OPEN');
    await expect(executeWithReliability('openrouter', operation)).rejects.toMatchObject({ message: 'AI_CIRCUIT_OPEN' });
    await vi.advanceTimersByTimeAsync(AI_RELIABILITY_POLICY.circuit.cooldownMs);
    expect(getProviderCircuitState('openrouter')).toBe('HALF-OPEN');
    await expect(executeWithReliability('openrouter', vi.fn().mockResolvedValue('recovered'))).resolves.toBe('recovered');
    expect(getProviderCircuitState('openrouter')).toBe('CLOSED');
  });

  it('distinguishes first token and idle stream timeouts while preserving emitted chunks', async () => {
    vi.useFakeTimers();
    async function* partial() { yield { text: 'partial' }; await new Promise(resolve => setTimeout(resolve, AI_RELIABILITY_POLICY.streamIdleTimeoutMs + 1)); }
    const iterator = (await import('../../services/ai/aiReliabilityService.js')).guardAiStream(partial());
    await expect(iterator.next()).resolves.toMatchObject({ value: { text: 'partial' }, done: false });
    const pending = iterator.next();
    const assertion = expect(pending).rejects.toMatchObject({ category: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(AI_RELIABILITY_POLICY.streamIdleTimeoutMs + 1);
    await assertion;
  });

  it('keeps Comparison and manual requests on the selected model, and filters auto fallbacks by tier and capability', () => {
    const base = {
      requestedModelId: 'deepseek-chat', prompt: 'hello', userTier: 'Free',
      fallbackCandidates: ['gemini-3.1-pro-preview', 'groq-qwen-27b', 'gemini-3.8-flash'],
      routingDecision: { selectedModelId: 'deepseek-chat', provider: 'deepseek', routingMode: 'auto', routingReason: '', fallbackCandidates: [] }
    } as AiRequestOptions;
    expect(selectReliableModelCandidates(base, 'deepseek-chat', { capability: 'streaming' })).toEqual(['deepseek-chat', 'groq-qwen-27b', 'gemini-3.8-flash']);
    expect(selectReliableModelCandidates({ ...base, comparisonMode: true }, 'deepseek-chat', { capability: 'streaming' })).toEqual(['deepseek-chat']);
    expect(selectReliableModelCandidates({ ...base, routingDecision: { ...base.routingDecision!, routingMode: 'manual' } }, 'deepseek-chat', { capability: 'streaming' })).toEqual(['deepseek-chat']);
    expect(selectReliableModelCandidates(base, 'deepseek-chat', { capability: 'streaming', hasAttachments: true })).toEqual(['deepseek-chat', 'gemini-3.8-flash']);
  });
});
