import { describe, it, expect } from 'vitest';
import {
  CoderModelOrchestrator,
  INDONESIAN_COUNCIL_PERSONAS
} from '../../services/coder/coderModelOrchestrator.js';

describe('CoderModelOrchestrator (Dewan Ahli AI)', () => {
  const mockInstalledModels = [
    'qwen3:8b',
    'deepseek-r1:1.5b',
    'phi4-mini:latest',
    'qwen3:1.7b',
    'bonsai-27b:latest',
    'gemma3:1b',
    'qwen3.5:0.8b',
    'gemma3:270m'
  ];

  it('resolves the exact target model when installed in Ollama', () => {
    const habibie = INDONESIAN_COUNCIL_PERSONAS.habibie;
    const model = CoderModelOrchestrator.resolveModelForPersona(habibie, mockInstalledModels);
    expect(model).toBe('qwen3:1.7b');

    const kihadjar = INDONESIAN_COUNCIL_PERSONAS.kihadjar;
    const kihadjarModel = CoderModelOrchestrator.resolveModelForPersona(kihadjar, mockInstalledModels);
    expect(kihadjarModel).toBe('deepseek-r1:1.5b');
  });

  it('prioritizes proprietary SLM champions Si Gacor & Si Pinter when installed in Ollama', () => {
    const slmModels = ['si-gacor:latest', 'si-pinter:latest', ...mockInstalledModels];
    const habibie = INDONESIAN_COUNCIL_PERSONAS.habibie;
    expect(CoderModelOrchestrator.resolveModelForPersona(habibie, slmModels)).toBe('si-gacor:latest');

    const kihadjar = INDONESIAN_COUNCIL_PERSONAS.kihadjar;
    expect(CoderModelOrchestrator.resolveModelForPersona(kihadjar, slmModels)).toBe('si-gacor:latest');

    const sutarjo = INDONESIAN_COUNCIL_PERSONAS.sutarjo;
    expect(CoderModelOrchestrator.resolveModelForPersona(sutarjo, slmModels)).toBe('si-pinter:latest');
  });

  it('falls back gracefully when target model is missing', () => {
    const limitedModels = ['qwen3:1.7b', 'gemma3:1b'];
    const habibie = INDONESIAN_COUNCIL_PERSONAS.habibie;
    const resolved = CoderModelOrchestrator.resolveModelForPersona(habibie, limitedModels);
    expect(resolved).toBe('qwen3:1.7b');
  });

  it('plans a debugging council sequence when prompt contains error/bug indicators', () => {
    const turns = CoderModelOrchestrator.planExecutionCouncil(
      'Kenapa fungsi ini error undefined dan crash?',
      'app.js',
      mockInstalledModels,
      6
    );

    expect(turns.length).toBe(6);
    // Step 1 should be Ki Hadjar (deep reasoning / root cause)
    expect(turns[0].persona.id).toBe('kihadjar');
    expect(turns[0].modelToUse).toBe('deepseek-r1:1.5b');
    expect(turns[0].intent).toBe('reasoning');

    // Step 2 should be Mas Sutarjo (implementor)
    expect(turns[1].persona.id).toBe('sutarjo');
    expect(turns[1].modelToUse).toBe('qwen3:1.7b');

    // Step 4 should be Pak Bambang (QA & Safety)
    expect(turns[3].persona.id).toBe('bambang');
    expect(turns[3].modelToUse).toBe('phi4-mini:latest');
  });

  it('plans a UI/UX council sequence when prompt is styling or UI heavy', () => {
    const turns = CoderModelOrchestrator.planExecutionCouncil(
      'Perbaiki tampilan CSS tombol dan buat warna tema lebih responsif',
      'styles.css',
      mockInstalledModels,
      6
    );

    expect(turns.length).toBe(6);
    // Step 1 should be Mbak Dewi (UI/UX)
    expect(turns[0].persona.id).toBe('dewi');
    expect(turns[0].modelToUse).toBe('gemma3:1b');
    expect(turns[0].intent).toBe('style');

    // Step 2 should be Mas Sutarjo (implementor)
    expect(turns[1].persona.id).toBe('sutarjo');
  });

  it('plans an architectural council sequence for full app creations', () => {
    const turns = CoderModelOrchestrator.planExecutionCouncil(
      'Buatkan aplikasi to-do list lengkap dengan filter dan storage',
      undefined,
      mockInstalledModels,
      6
    );

    // Step 1 should be Pak Habibie (Architect)
    expect(turns[0].persona.id).toBe('habibie');
    expect(turns[0].modelToUse).toBe('qwen3:1.7b');
    expect(turns[0].intent).toBe('architect');
  });

  it('locks a single champion model when lockSingleModel option is enabled to prevent VRAM thrashing', () => {
    const turns = CoderModelOrchestrator.planExecutionCouncil(
      'Kenapa fungsi ini error undefined?',
      'app.js',
      mockInstalledModels,
      6,
      'creative',
      { lockSingleModel: true }
    );

    expect(turns.length).toBe(6);
    // All turns should share the step 1 resolved model ('deepseek-r1:1.5b')
    const modelsUsed = turns.map(t => t.modelToUse);
    expect(new Set(modelsUsed).size).toBe(1);
    expect(modelsUsed[0]).toBe('deepseek-r1:1.5b');
    // Personas should still remain distinct
    expect(turns[0].persona.id).toBe('kihadjar');
    expect(turns[1].persona.id).toBe('sutarjo');
    expect(turns[3].persona.id).toBe('bambang');
  });

  it('pins user-specified primary model override across all turns', () => {
    const turns = CoderModelOrchestrator.planExecutionCouncil(
      'Buat file utilitas baru',
      'utils.js',
      mockInstalledModels,
      4,
      'creative',
      { primaryModelOverride: 'qwen3:1.7b' }
    );

    expect(turns.every(t => t.modelToUse === 'qwen3:1.7b')).toBe(true);
  });
});
