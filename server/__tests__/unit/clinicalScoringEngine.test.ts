import { describe, it, expect } from 'vitest';
import {
  calculatePhq9Severity,
  calculateGad7Severity,
  calculatePhq9Total,
  calculateGad7Total,
  assessItem9,
  scorePhq9,
  PHQ9_SCORING_VERSION,
  GAD7_SCORING_VERSION,
  ScreeningValidationError,
} from '../../../shared/clinical/scoring';
import { getPhq9Severity, getGad7Severity } from '../../../src/lib/clinicalScoring';
import { calculatePhq9Severity as utilPhq, calculateGad7Severity as utilGad } from '../../../src/utils/scoring';

const ok = (n: number) => Array(n).fill(0);

describe('PHQ-9 boundaries', () => {
  const cases: Array<[number, string]> = [
    [0, 'Minimal'], [4, 'Minimal'], [5, 'Ringan'], [9, 'Ringan'], [10, 'Sedang'], [14, 'Sedang'],
    [15, 'Sedang-Berat'], [19, 'Sedang-Berat'], [20, 'Berat'], [27, 'Berat'],
  ];
  it.each(cases)('score %i -> %s', (s, label) => expect(calculatePhq9Severity(s)).toBe(label));
});

describe('GAD-7 boundaries', () => {
  const cases: Array<[number, string]> = [
    [0, 'Minimal'], [4, 'Minimal'], [5, 'Ringan'], [9, 'Ringan'], [10, 'Sedang'], [14, 'Sedang'], [15, 'Berat'], [21, 'Berat'],
  ];
  it.each(cases)('score %i -> %s', (s, label) => expect(calculateGad7Severity(s)).toBe(label));
  it('never yields the 5-band PHQ label', () => {
    for (let s = 0; s <= 21; s++) expect(calculateGad7Severity(s)).not.toBe('Sedang-Berat');
  });
});

describe('invalid totals are rejected, never classified', () => {
  const bad: unknown[] = [-1, 28, 1.5, NaN, Infinity, -Infinity, null, undefined, '10', true, {}];
  it.each(bad.map((v) => [String(v), v]))('PHQ-9 rejects %s', (_l, v) => {
    expect(() => calculatePhq9Severity(v)).toThrow(ScreeningValidationError);
  });
  it.each(bad.map((v) => [String(v), v]))('GAD-7 rejects %s', (_l, v) => {
    expect(() => calculateGad7Severity(v)).toThrow(ScreeningValidationError);
  });
  it('GAD-7 rejects 22, PHQ-9 accepts 22', () => {
    expect(() => calculateGad7Severity(22)).toThrow();
    expect(calculatePhq9Severity(22)).toBe('Berat');
  });
  it('-2 and 99 are not valid PHQ-9 scores', () => {
    expect(() => calculatePhq9Severity(-2)).toThrow();
    expect(() => calculatePhq9Severity(99)).toThrow();
  });
});

describe('single source of truth: all entry points agree', () => {
  it('every legacy wrapper matches the shared engine for all valid scores', () => {
    for (let s = 0; s <= 27; s++) {
      expect(getPhq9Severity(s)).toBe(calculatePhq9Severity(s));
      expect(utilPhq(s)).toBe(calculatePhq9Severity(s));
    }
    for (let s = 0; s <= 21; s++) {
      expect(getGad7Severity(s)).toBe(calculateGad7Severity(s));
      expect(utilGad(s)).toBe(calculateGad7Severity(s));
    }
  });
  it('PHQ-9 = 17 is Sedang-Berat everywhere (previously Berat in backend/utils)', () => {
    expect(getPhq9Severity(17)).toBe('Sedang-Berat');
    expect(utilPhq(17)).toBe('Sedang-Berat');
  });
});

describe('questionnaire calculation', () => {
  it('sums valid PHQ-9 / GAD-7 answers deterministically', () => {
    expect(calculatePhq9Total([1, 2, 3, 0, 1, 2, 3, 0, 1])).toBe(13);
    expect(calculatePhq9Total([1, 2, 3, 0, 1, 2, 3, 0, 1])).toBe(13);
    expect(calculateGad7Total([1, 1, 1, 1, 1, 1, 1])).toBe(7);
  });
  it('all zeros and all threes', () => {
    expect(calculatePhq9Total(ok(9))).toBe(0);
    expect(calculatePhq9Total(Array(9).fill(3))).toBe(27);
    expect(calculateGad7Total(Array(7).fill(3))).toBe(21);
  });
  it('rejects missing, extra, negative, >3, decimal and unanswered(-1) answers', () => {
    expect(() => calculatePhq9Total(ok(8))).toThrow(/9 answers/);
    expect(() => calculatePhq9Total(ok(10))).toThrow(ScreeningValidationError);
    expect(() => calculatePhq9Total([...ok(8), -2])).toThrow();
    expect(() => calculatePhq9Total([...ok(8), 4])).toThrow();
    expect(() => calculatePhq9Total([...ok(8), 1.5])).toThrow();
    expect(() => calculatePhq9Total([...ok(8), -1])).toThrow(/unanswered/);
    expect(() => calculatePhq9Total([...ok(8), null])).toThrow();
    expect(() => calculatePhq9Total([...ok(8), '1'])).toThrow();
    expect(() => calculateGad7Total(ok(6))).toThrow();
    expect(() => calculatePhq9Total('123456789')).toThrow();
  });
  it('scorePhq9 carries a scoring version', () => {
    const r = scorePhq9([3, 3, 3, 3, 3, 0, 0, 0, 0]);
    expect(r).toEqual({ totalScore: 15, severity: 'Sedang-Berat', scoringVersion: PHQ9_SCORING_VERSION });
    expect(GAD7_SCORING_VERSION).toBe('GAD7_CLASSIC_4_BAND_V1');
  });
});

describe('item 9 assessment', () => {
  it('positive item 9 with low total remains positive', () => {
    const answers = [1, 0, 0, 0, 0, 0, 0, 0, 1]; // total 2, item 9 = 1
    expect(calculatePhq9Severity(calculatePhq9Total(answers))).toBe('Minimal');
    expect(assessItem9({ phq9Answers: answers })).toEqual({ item9Score: 1, item9Positive: true, provenance: 'answers' });
  });
  it('explicit 0 is negative; missing is unknown (null), not 0', () => {
    expect(assessItem9({ phq9Answers: ok(9) }).item9Positive).toBe(false);
    expect(assessItem9({})).toEqual({ item9Score: null, item9Positive: null, provenance: 'unknown' });
    expect(assessItem9({ item9Score: undefined }).item9Positive).toBeNull();
  });
  it('high total with item 9 = 0 does not set a positive indicator', () => {
    const answers = [3, 3, 3, 3, 3, 3, 3, 3, 0];
    expect(calculatePhq9Severity(calculatePhq9Total(answers))).toBe('Berat');
    expect(assessItem9({ phq9Answers: answers }).item9Positive).toBe(false);
  });
});
