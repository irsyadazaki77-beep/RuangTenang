import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { AI_MODEL_REGISTRY } from '../server/services/ai/aiModelRegistry.js';
import { ollamaService } from '../server/services/ai/ollamaService.js';
import { refreshOllamaInventory, isLocalModelAvailable } from '../server/services/ai/ollamaRuntime.js';
import { smartModelRouter } from '../server/services/ai/smartModelRouter.js';

await mkdir('output', { recursive: true });
await refreshOllamaInventory(true);
const models = AI_MODEL_REGISTRY.filter(model => model.provider === 'ollama');
const results: unknown[] = [];
for (const model of models) {
  const started = Date.now();
  try {
    if (!isLocalModelAvailable(model.providerModelId)) throw new Error('Not installed or Ollama unreachable');
    const options = { requestedModelId: model.id, prompt: 'Balas satu kalimat singkat dalam Bahasa Indonesia: apa fungsi perpustakaan?', maxOutputTokens: 256, abortSignal: AbortSignal.timeout(120_000) };
    const response = await ollamaService.generateResponse(options, model.id);
    const streamed = await ollamaService.generateStream({ ...options, abortSignal: AbortSignal.timeout(120_000) }, model.id);
    let text = '';
    for await (const chunk of streamed.stream) text += chunk.text;
    if (!text.trim()) throw new Error('Empty stream');
    const result = { model: model.providerModelId, status: 'passed', response: response.text, stream: text, durationMs: Date.now() - started };
    results.push(result);
    console.log(JSON.stringify(result));
  } catch (error) {
    const result = { model: model.providerModelId, status: 'failed', error: (error as Error).message, durationMs: Date.now() - started };
    results.push(result);
    console.log(JSON.stringify(result));
    process.exitCode = 1;
  }
}
const routing = ['Halo, apa kabar?', 'Debug function TypeScript ini', 'Buktikan persamaan matematika', 'Rangkum teks berikut'].map(prompt => ({
  prompt, decision: smartModelRouter.routeModel({ routingMode: 'auto', userTier: 'Free' }, prompt)
}));
await writeFile('output/local-ai-check.json', JSON.stringify({ checkedAt: new Date().toISOString(), results, routing }, null, 2));
console.log('Report: output/local-ai-check.json');
