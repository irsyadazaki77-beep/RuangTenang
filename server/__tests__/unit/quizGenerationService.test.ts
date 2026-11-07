import { describe, it, expect } from 'vitest';
import { extractJsonFromAiOutput } from '../../services/quizService.js';

describe('Quiz Service - extractJsonFromAiOutput', () => {
  it('extracts JSON from markdown json code blocks', () => {
    const raw = `Berikut hasil kuisnya:\n\`\`\`json\n{\n  "format": "ruangtenang-quiz-v1",\n  "title": "Kuis Fisika"\n}\n\`\`\`\nSemoga sukses ujiannya!`;
    const result = extractJsonFromAiOutput(raw);
    expect(result).toBe('{\n  "format": "ruangtenang-quiz-v1",\n  "title": "Kuis Fisika"\n}');
  });

  it('extracts raw JSON object without code blocks', () => {
    const raw = `Ini JSON kuis: {"format": "ruangtenang-quiz-v1", "totalQuestions": 5}`;
    const result = extractJsonFromAiOutput(raw);
    expect(result).toBe('{"format": "ruangtenang-quiz-v1", "totalQuestions": 5}');
  });
});
