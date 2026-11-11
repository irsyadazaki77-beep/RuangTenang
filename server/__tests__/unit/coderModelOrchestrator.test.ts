import { describe, it, expect } from 'vitest';
import {
  CoderModelOrchestrator,
  INDONESIAN_COUNCIL_PERSONAS,
  matchOllamaModel
} from '../../services/coder/coderModelOrchestrator.js';

describe('CoderModelOrchestrator (Trio Model Lokal: Si Pinter, Si Tangguh, Si Gacor)', () => {
  const mockTrioModels = [
    'si-pinter:latest',
    'si-tangguh:latest',
    'si-gacor:latest',
    'qwen3:8b'
  ];

  it('matches models tolerantly with matchOllamaModel (tag and base aliases)', () => {
    expect(matchOllamaModel('si-pinter:latest', ['si-pinter'])).toBe('si-pinter');
    expect(matchOllamaModel('si-pinter', ['si-pinter:latest'])).toBe('si-pinter:latest');
    expect(matchOllamaModel('si-pinter:latest', ['qwen3:1.7b'])).toBe('qwen3:1.7b');
    expect(matchOllamaModel('si-tangguh:latest', ['mistral-nemo:12b'])).toBe('mistral-nemo:12b');
    expect(matchOllamaModel('si-gacor:latest', ['bonsai-27b:latest'])).toBe('bonsai-27b:latest');
  });

  it('resolves the exact Trio target model when installed in Ollama', () => {
    const habibie = INDONESIAN_COUNCIL_PERSONAS.habibie;
    expect(CoderModelOrchestrator.resolveModelForPersona(habibie, mockTrioModels)).toBe('si-gacor:latest');

    const kihadjar = INDONESIAN_COUNCIL_PERSONAS.kihadjar;
    expect(CoderModelOrchestrator.resolveModelForPersona(kihadjar, mockTrioModels)).toBe('si-gacor:latest');

    const bambang = INDONESIAN_COUNCIL_PERSONAS.bambang;
    expect(CoderModelOrchestrator.resolveModelForPersona(bambang, mockTrioModels)).toBe('si-tangguh:latest');

    const dewi = INDONESIAN_COUNCIL_PERSONAS.dewi;
    expect(CoderModelOrchestrator.resolveModelForPersona(dewi, mockTrioModels)).toBe('si-tangguh:latest');

    const sutarjo = INDONESIAN_COUNCIL_PERSONAS.sutarjo;
    expect(CoderModelOrchestrator.resolveModelForPersona(sutarjo, mockTrioModels)).toBe('si-pinter:latest');

    const gibran = INDONESIAN_COUNCIL_PERSONAS.gibran;
    expect(CoderModelOrchestrator.resolveModelForPersona(gibran, mockTrioModels)).toBe('si-pinter:latest');

    const kancil = INDONESIAN_COUNCIL_PERSONAS.kancil;
    expect(CoderModelOrchestrator.resolveModelForPersona(kancil, mockTrioModels)).toBe('si-pinter:latest');
  });

  it('falls back gracefully to Si Pinter when user only installs the lightweight model (8GB RAM mode)', () => {
    const onlySiPinter = ['si-pinter:latest'];
    const habibie = INDONESIAN_COUNCIL_PERSONAS.habibie;
    const resolved = CoderModelOrchestrator.resolveModelForPersona(habibie, onlySiPinter);
    expect(resolved).toBe('si-pinter:latest');

    const bambang = INDONESIAN_COUNCIL_PERSONAS.bambang;
    expect(CoderModelOrchestrator.resolveModelForPersona(bambang, onlySiPinter)).toBe('si-pinter:latest');
  });

  it('plans a debugging council sequence utilizing the Trio models', () => {
    const turns = CoderModelOrchestrator.planExecutionCouncil(
      'Kenapa fungsi ini error undefined dan crash?',
      'app.js',
      mockTrioModels,
      6
    );

    expect(turns.length).toBe(6);
    // Step 1 should be Ki Hadjar (deep reasoning / root cause) -> Si Gacor
    expect(turns[0].persona.id).toBe('kihadjar');
    expect(turns[0].modelToUse).toBe('si-gacor:latest');
    expect(turns[0].intent).toBe('reasoning');

    // Step 2 should be Mas Sutarjo (implementor) -> Si Pinter
    expect(turns[1].persona.id).toBe('sutarjo');
    expect(turns[1].modelToUse).toBe('si-pinter:latest');

    // Step 4 should be Pak Bambang (QA & Safety) -> Si Tangguh
    expect(turns[3].persona.id).toBe('bambang');
    expect(turns[3].modelToUse).toBe('si-tangguh:latest');
  });

  it('plans a UI/UX council sequence with Mbak Dewi using Si Tangguh', () => {
    const turns = CoderModelOrchestrator.planExecutionCouncil(
      'Perbaiki tampilan CSS tombol dan buat warna tema lebih responsif',
      'styles.css',
      mockTrioModels,
      6
    );

    expect(turns.length).toBe(6);
    // Step 1 should be Mbak Dewi (UI/UX) -> Si Tangguh
    expect(turns[0].persona.id).toBe('dewi');
    expect(turns[0].modelToUse).toBe('si-tangguh:latest');
    expect(turns[0].intent).toBe('style');

    // Step 2 should be Mas Sutarjo (implementor) -> Si Pinter
    expect(turns[1].persona.id).toBe('sutarjo');
    expect(turns[1].modelToUse).toBe('si-pinter:latest');
  });

  it('plans an architectural council sequence with Pak Habibie using Si Gacor', () => {
    const turns = CoderModelOrchestrator.planExecutionCouncil(
      'Buatkan aplikasi to-do list lengkap dengan filter dan storage',
      undefined,
      mockTrioModels,
      6
    );

    // Step 1 should be Pak Habibie (Architect) -> Si Gacor
    expect(turns[0].persona.id).toBe('habibie');
    expect(turns[0].modelToUse).toBe('si-gacor:latest');
    expect(turns[0].intent).toBe('architect');
  });

  it('locks a single champion model when lockSingleModel option is enabled to prevent VRAM thrashing', () => {
    const turns = CoderModelOrchestrator.planExecutionCouncil(
      'Kenapa fungsi ini error undefined?',
      'app.js',
      mockTrioModels,
      6,
      'creative',
      { lockSingleModel: true }
    );

    expect(turns.length).toBe(6);
    // All turns should share the step 1 resolved model ('si-gacor:latest')
    const modelsUsed = turns.map(t => t.modelToUse);
    expect(new Set(modelsUsed).size).toBe(1);
    expect(modelsUsed[0]).toBe('si-gacor:latest');
    // Personas should still remain distinct
    expect(turns[0].persona.id).toBe('kihadjar');
    expect(turns[1].persona.id).toBe('sutarjo');
    expect(turns[3].persona.id).toBe('bambang');
  });

  it('pins user-specified primary model override across all turns', () => {
    const turns = CoderModelOrchestrator.planExecutionCouncil(
      'Buat file utilitas baru',
      'utils.js',
      mockTrioModels,
      4,
      'creative',
      { primaryModelOverride: 'si-pinter:latest' }
    );

    expect(turns.every(t => t.modelToUse === 'si-pinter:latest')).toBe(true);
  });
});
