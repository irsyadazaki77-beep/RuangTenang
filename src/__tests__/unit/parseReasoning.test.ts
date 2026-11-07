import { describe, it, expect } from 'vitest';
import { parseReasoning } from '../../features/chat/utils/parseReasoning';

describe('parseReasoning', () => {
  it('returns plain text untouched', () => {
    expect(parseReasoning('halo')).toEqual({ thinking: '', answer: 'halo', isThinking: false });
  });
  it('splits a complete think block', () => {
    const r = parseReasoning('<think>mikir</think>Jawaban');
    expect(r).toEqual({ thinking: 'mikir', answer: 'Jawaban', isThinking: false });
  });
  it('flags an unclosed think block as streaming', () => {
    const r = parseReasoning('<think>masih mikir');
    expect(r.isThinking).toBe(true);
    expect(r.answer).toBe('');
  });
});
