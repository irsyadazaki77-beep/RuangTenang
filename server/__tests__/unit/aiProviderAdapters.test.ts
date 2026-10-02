import { afterEach, describe, expect, it, vi } from 'vitest';
import { AI_PROVIDER_ADAPTERS } from '../../services/ai/aiProviderAdapters.js';
import { deepseekService } from '../../services/ai/deepseekService.js';
import { groqService } from '../../services/ai/groqService.js';
import { openrouterService } from '../../services/ai/openrouterService.js';
import { geminiAdapter } from '../../services/ai/geminiAdapter.js';

const options = { requestedModelId: 'public-model', prompt: 'Hello' };

describe('AI provider adapters', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it.each([
    ['deepseek', deepseekService],
    ['groq', groqService],
    ['openrouter', openrouterService]
  ] as const)('%s adapter delegates generate and streaming through its existing service', async (provider, service) => {
    const generate = vi.spyOn(service, 'generateResponse').mockResolvedValue({ text: 'ok', modelUsed: 'public-model', isFallback: false });
    async function* chunks() { yield { text: 'ok' }; }
    const stream = chunks();
    const generateStream = vi.spyOn(service, 'generateStream').mockResolvedValue({ stream, modelUsed: 'public-model' });
    const adapter = AI_PROVIDER_ADAPTERS[provider];

    expect(adapter.provider).toBe(provider);
    expect(await adapter.generate(options, 'public-model')).toMatchObject({ text: 'ok', isFallback: false });
    expect(await adapter.generateStream(options, 'public-model')).toMatchObject({ modelUsed: 'public-model' });
    expect(generate).toHaveBeenCalledWith(options, 'public-model');
    expect(generateStream).toHaveBeenCalledWith(options, 'public-model');
  });

  it('keeps Gemini SDK generation behind the same adapter boundary', async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: 'ok' });
    const generateContentStream = vi.fn().mockResolvedValue({ stream: true });
    const client = { models: { generateContent, generateContentStream } } as never;
    const input = { model: 'gemini-2.5-flash', contents: 'hello' } as never;

    await geminiAdapter.generate(client, input);
    await geminiAdapter.generateStream(client, input);

    expect(geminiAdapter.provider).toBe('gemini');
    expect(generateContent).toHaveBeenCalledWith(input);
    expect(generateContentStream).toHaveBeenCalledWith(input);
  });

  it('resolves external provider model slugs only from canonical IDs', () => {
    expect(deepseekService.mapModelName('deepseek-reasoner')).toBe('deepseek-reasoner');
    expect(groqService.mapModelName('groq-qwen-27b')).toBe('qwen/qwen3.8-27b');
    expect(openrouterService.mapModelName('openrouter-nemotron-550b')).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
    expect(() => groqService.mapModelName('openai/arbitrary-model')).toThrowError('MODEL_NOT_FOUND');
  });

  it('does not mark Groq and OpenRouter available without configured API keys', () => {
    const groqKey = process.env.GROQ_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    try {
      delete process.env.GROQ_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      expect(groqService.isAvailable()).toBe(false);
      expect(openrouterService.isAvailable()).toBe(false);
    } finally {
      if (groqKey === undefined) delete process.env.GROQ_API_KEY;
      else process.env.GROQ_API_KEY = groqKey;
      if (openRouterKey === undefined) delete process.env.OPENROUTER_API_KEY;
      else process.env.OPENROUTER_API_KEY = openRouterKey;
    }
  });

  it('normalizes malformed provider responses without logging prompt or credential data', async () => {
    const previous = process.env.GROQ_API_KEY;
    process.env.GROQ_API_KEY = `gsk_${'x'.repeat(32)}`;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [] }), { status: 200 })));
    try {
      await expect(groqService.generateResponse({ ...options, requestedModelId: 'groq-gpt-20b', prompt: 'RAW_MENTAL_HEALTH_PROMPT' }, 'groq-gpt-20b'))
        .rejects.toMatchObject({ category: 'CONTENT_ERROR', retryable: false });
      expect(warn.mock.calls.flat().join(' ')).not.toContain('RAW_MENTAL_HEALTH_PROMPT');
      expect(warn.mock.calls.flat().join(' ')).not.toContain(process.env.GROQ_API_KEY);
    } finally {
      if (previous === undefined) delete process.env.GROQ_API_KEY;
      else process.env.GROQ_API_KEY = previous;
    }
  });
});
