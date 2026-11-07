import { describe, it, expect } from 'vitest';
import {
  CoderModelOrchestrator,
  GEMINI_CODING_MODELS,
  INDONESIAN_COUNCIL_PERSONAS
} from '../../services/coder/coderModelOrchestrator.js';

describe('Coder Hybrid AI Orchestrator (Ollama + Gemini)', () => {
  it('falls back to Gemini coding models when Ollama inventory is empty', () => {
    const emptyOllamaModels: string[] = [];
    const habibie = INDONESIAN_COUNCIL_PERSONAS.habibie;

    const resolved = CoderModelOrchestrator.resolveModelForPersona(habibie, emptyOllamaModels);
    expect(resolved).toBe(GEMINI_CODING_MODELS[0]);
  });

  it('selects Gemini model when provider is explicitly set to gemini', () => {
    const turns = CoderModelOrchestrator.planExecutionCouncil(
      'Tolong buatkan kalkulator dengan React dan CSS',
      'App.tsx',
      [],
      6,
      'creative',
      { provider: 'gemini' }
    );

    expect(turns.length).toBe(6);
    expect(turns[0].modelToUse).toBe(GEMINI_CODING_MODELS[0]);
    expect(turns[1].modelToUse).toBe(GEMINI_CODING_MODELS[0]);
  });

  it('preserves Indonesian council personas even under Gemini cloud engine', () => {
    const turns = CoderModelOrchestrator.planExecutionCouncil(
      'Kenapa fungsi ini error TypeError undefined?',
      'utils.js',
      [],
      4,
      'creative',
      { provider: 'gemini' }
    );

    expect(turns[0].persona.id).toBe('kihadjar');
    expect(turns[0].persona.name).toBe('Ki Hadjar');
    expect(turns[1].persona.id).toBe('sutarjo');
    expect(turns[1].persona.name).toBe('Mas Sutarjo');
  });
});
