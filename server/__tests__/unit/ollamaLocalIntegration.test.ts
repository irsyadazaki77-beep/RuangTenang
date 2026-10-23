import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalInferenceQueue, refreshOllamaInventory } from '../../services/ai/ollamaRuntime.js';
import { ollamaService } from '../../services/ai/ollamaService.js';
import { AI_MODEL_REGISTRY, getPublicModelCatalog } from '../../services/ai/aiModelRegistry.js';
import { smartModelRouter } from '../../services/ai/smartModelRouter.js';
import { aiRequestService, selectReliableModelCandidates } from '../../services/ai/aiRequestService.js';
import { resetAiReliabilityStateForTests } from '../../services/ai/aiReliabilityService.js';
import { performVisualOcr } from '../../services/file-intelligence/visualIntelligenceService.js';

const installed = AI_MODEL_REGISTRY.filter(model => model.provider === 'ollama');
const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });

function mockDaemon(chat: (body: any) => Response | Promise<Response>, names = installed.map(model => model.providerModelId)) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    if (url.endsWith('/api/tags')) return json({ models: names.map(name => ({ name, size: 1_000_000 })) });
    if (url.endsWith('/api/show')) return json({ capabilities: body.model === 'qwen3.5:0.8b' ? ['completion', 'vision', 'thinking'] : ['completion', 'thinking'], model_info: { 'test.context_length': 32768 } });
    if (url.endsWith('/api/chat')) return chat(body);
    throw new Error('Unexpected endpoint');
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('Local Ollama integration', () => {
  beforeEach(() => {
    resetAiReliabilityStateForTests();
    vi.stubEnv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434');
    for (const key of ['GEMINI_API_KEY', 'DEEPSEEK_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'OPENAI_API_KEY']) vi.stubEnv(key, '');
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

  it('registers all eight local models and routes tasks and profiles by suitability', async () => {
    mockDaemon(() => json({ message: { content: 'ok' } }));
    await refreshOllamaInventory(true);
    expect(installed).toHaveLength(8);
    const route = (prompt: string) => smartModelRouter.routeModel({ routingMode: 'auto' }, prompt).selectedModelId;
    expect(route('Halo')).toBe('ollama-qwen3-1.7b');
    expect(route('Debug function TypeScript')).toBe('ollama-qwen3-8b');
    expect(route('Buktikan persamaan matematika')).toBe('ollama-qwen3-8b');
    expect(smartModelRouter.routeModel({ profileId: 'kerja-hard', workspaceMode: true }, 'Halo').selectedModelId).toBe('ollama-qwen3-8b');
    expect(smartModelRouter.routeModel({ profileId: 'kerja-fast', workspaceMode: true }, 'Halo').selectedModelId).toBe('ollama-qwen3-1.7b');
    expect(smartModelRouter.routeModel({ taskCategory: 'coding', attachments: [{ mimeType: 'image/png' }] }).selectedModelId).toBe('ollama-qwen3.5-0.8b');
    for (const model of installed) {
      expect(getPublicModelCatalog('Free').find(item => item.id === model.id)?.selectable).toBe(true);
      expect(smartModelRouter.routeModel({ manualModelId: model.id, userTier: 'Free' }).selectedModelId).toBe(model.id);
    }
  });

  it('excludes uninstalled models in routing, catalog and fallback', async () => {
    mockDaemon(() => json({}), ['gemma3:1b']);
    await refreshOllamaInventory(true);
    expect(smartModelRouter.routeModel({}, 'Debug function').selectedModelId).toBe('ollama-gemma3-1b');
    expect(getPublicModelCatalog().find(model => model.id === 'ollama-qwen3-8b')?.selectable).toBe(false);
    expect(() => smartModelRouter.routeModel({ attachments: [{ mimeType: 'image/png' }] })).toThrow('MODEL_UNAVAILABLE');
    expect(selectReliableModelCandidates({ requestedModelId: 'ollama-gemma3-1b', prompt: 'x', routingDecision: { routingMode: 'auto', selectedModelId: 'ollama-gemma3-1b', provider: 'ollama', routingReason: '', fallbackCandidates: ['ollama-qwen3-8b'] } }, 'ollama-gemma3-1b', { capability: 'chat' })).toEqual(['ollama-gemma3-1b']);
  });

  it('uses native JSON mode, bounded context and unloads weights', async () => {
    const fetchMock = mockDaemon(() => json({ message: { content: '{"ok":true}' } }));
    await refreshOllamaInventory(true);
    await expect(ollamaService.generateResponse({ requestedModelId: 'ollama-qwen3-1.7b', prompt: 'x', responseFormat: 'json', maxOutputTokens: 100 }, 'ollama-qwen3-1.7b')).resolves.toMatchObject({ text: '{"ok":true}' });
    const call = fetchMock.mock.calls.find(([url]) => url.endsWith('/api/chat'))!;
    expect(JSON.parse(String(call[1]?.body))).toMatchObject({ model: 'qwen3:1.7b', keep_alive: 0, think: false, format: 'json', options: { num_ctx: 8192, num_predict: 100 } });
  });

  it('reserves output tokens for DeepSeek R1 after hidden thinking', async () => {
    const fetchMock = mockDaemon(() => json({ message: { content: 'Jawaban.' } }));
    await refreshOllamaInventory(true);
    await ollamaService.generateResponse({ requestedModelId: 'ollama-deepseek-r1-1.5b', prompt: 'x', maxOutputTokens: 256 }, 'ollama-deepseek-r1-1.5b');
    const call = fetchMock.mock.calls.find(([url]) => url.endsWith('/api/chat'))!;
    expect(JSON.parse(String(call[1]?.body)).options.num_predict).toBe(1024);
  });

  it('falls back to another local model after a provider error instead of skipping the shared provider', async () => {
    const fetchMock = mockDaemon(body => body.model === 'qwen3:8b'
      ? new Response('out of memory', { status: 500 }) : json({ message: { content: 'Jawaban alternatif lokal.' } }));
    await refreshOllamaInventory(true);
    const result = await aiRequestService.generateChatResponse({
      requestedModelId: 'ollama-qwen3-8b', prompt: 'Jelaskan fungsi perpustakaan.',
      systemInstruction: '[CONTEXT_BOUNDARIES] Jawab ringkas.',
      routingDecision: { selectedModelId: 'ollama-qwen3-8b', provider: 'ollama', routingMode: 'auto', routingReason: '', fallbackCandidates: ['ollama-phi4-mini', 'ollama-qwen3-1.7b'] }
    });
    expect(result).toMatchObject({ modelUsed: 'ollama-phi4-mini', isFallback: true });
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/api/chat')).length).toBeGreaterThanOrEqual(2);
  });

  it('uses local vision for document ingestion through the same queue and adapter', async () => {
    const fetchMock = mockDaemon(() => json({ message: { content: 'Judul dokumen' } }));
    await refreshOllamaInventory(true);
    expect(await performVisualOcr({ buffer: Buffer.from('image'), mimeType: 'image/png', filename: 'page.png' })).toMatchObject({ modelUsed: 'ollama-qwen3.5-0.8b', text: 'Judul dokumen' });
    const call = fetchMock.mock.calls.find(([url]) => url.endsWith('/api/chat'))!;
    expect(JSON.parse(String(call[1]?.body)).messages.at(-1).images).toEqual([Buffer.from('image').toString('base64')]);
  });

  it('handles fragmented NDJSON, Unicode, final unterminated line and hides thinking', async () => {
    const payload = new TextEncoder().encode('{"message":{"thinking":"private"}}\n{"message":{"content":"Hai 🌿"}}\n{"done":true}');
    mockDaemon(() => new Response(new ReadableStream({ start(controller) { for (const byte of payload) controller.enqueue(new Uint8Array([byte])); controller.close(); } })));
    await refreshOllamaInventory(true);
    const result = await ollamaService.generateStream({ requestedModelId: 'ollama-qwen3-1.7b', prompt: 'x' }, 'ollama-qwen3-1.7b');
    let text = '';
    for await (const chunk of result.stream) text += chunk.text;
    expect(text).toBe('Hai 🌿');
  });

  it('rejects empty responses and broken streams and releases queue on consumer cancellation', async () => {
    mockDaemon(body => body.stream ? new Response('{"message":{"content":"Hi"}}\n') : json({ message: { content: '' } }));
    await refreshOllamaInventory(true);
    const options = { requestedModelId: 'ollama-qwen3-1.7b', prompt: 'x' };
    await expect(ollamaService.generateResponse(options, options.requestedModelId)).rejects.toMatchObject({ category: 'CONTENT_ERROR' });
    const result = await ollamaService.generateStream(options, options.requestedModelId);
    await expect((async () => { for await (const _ of result.stream) { /* drain */ } })()).rejects.toMatchObject({ category: 'NETWORK_ERROR' });
    const cancel = await ollamaService.generateStream(options, options.requestedModelId);
    for await (const _ of cancel.stream) break;
    await expect(ollamaService.generateResponse(options, options.requestedModelId)).rejects.toMatchObject({ category: 'CONTENT_ERROR' });
  });

  it('serializes FIFO, removes aborted waiters, and makes release idempotent', async () => {
    const queue = new LocalInferenceQueue();
    const first = await queue.acquire();
    const abort = new AbortController();
    const second = queue.acquire(abort.signal);
    const third = queue.acquire();
    abort.abort();
    await expect(second).rejects.toMatchObject({ name: 'AbortError' });
    let granted = false;
    const waiting = third.then(release => { granted = true; return release; });
    await Promise.resolve();
    expect(granted).toBe(false);
    first(); first();
    const release = await waiting;
    expect(granted).toBe(true);
    release();
  });

  it('bounds queue waiting time', async () => {
    vi.useFakeTimers();
    const queue = new LocalInferenceQueue();
    const release = await queue.acquire();
    const waiting = expect(queue.acquire()).rejects.toThrow('OLLAMA_QUEUE_TIMEOUT');
    await vi.advanceTimersByTimeAsync(120_000);
    await waiting;
    release();
  });
});
