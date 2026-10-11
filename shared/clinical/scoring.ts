/**
 * @fileoverview SINGLE SOURCE OF TRUTH for PHQ-9 / GAD-7 scoring.
 *
 * Pure, dependency-free and deterministic: usable from the browser and the server.
 * Do NOT re-implement thresholds anywhere else (UI, routes, reports, repositories).
 *
 * CLINICAL REVIEW REQUIRED: the numeric bands below are the widely published
 * PHQ-9 / GAD-7 bands (Kroenke, Spitzer & Williams 2001; Spitzer et al. 2006). The
 * Indonesian labels/wording must be approved by a qualified mental-health professional
 * before any real clinical use. See docs/CLINICAL_SCREENING_SCORING.md.
 *
 * A screening score is NOT a diagnosis. Item 9 (PHQ-9) is handled separately from the
 * total score and must never be derived from, or hidden by, a low total/severity.
 */

export const PHQ9_SCORING_VERSION = 'PHQ9_CLASSIC_5_BAND_V1';
export const GAD7_SCORING_VERSION = 'GAD7_CLASSIC_4_BAND_V1';
/** Combined stamp stored with a result so its scoring rules remain identifiable. */
export const SCREENING_SCORING_VERSION = `${PHQ9_SCORING_VERSION}+${GAD7_SCORING_VERSION}`;
/** Marker used for records stored before scoring versions existed. */
export const LEGACY_UNKNOWN_SCORING_VERSION = 'LEGACY_UNKNOWN';

export const PHQ9_ITEM_COUNT = 9;
export const GAD7_ITEM_COUNT = 7;
export const PHQ9_MAX_SCORE = 27;
export const GAD7_MAX_SCORE = 21;
export const ANSWER_MIN = 0;
export const ANSWER_MAX = 3;
/** Zero-based index of PHQ-9 item 9 (thoughts of death / self-harm). */
export const PHQ9_ITEM9_INDEX = 8;

export type PhqSeverity = 'Minimal' | 'Ringan' | 'Sedang' | 'Sedang-Berat' | 'Berat';
export type GadSeverity = 'Minimal' | 'Ringan' | 'Sedang' | 'Berat';

export type ScreeningValidationCode =
  | 'SCORE_NOT_A_NUMBER'
  | 'SCORE_NOT_INTEGER'
  | 'SCORE_OUT_OF_RANGE'
  | 'ANSWERS_NOT_ARRAY'
  | 'ANSWERS_WRONG_LENGTH'
  | 'ANSWER_INVALID'
  | 'ANSWERS_INCOMPLETE'
  | 'SCORE_MISMATCH';

export class ScreeningValidationError extends Error {
  readonly code: ScreeningValidationCode;
  constructor(code: ScreeningValidationCode, message: string) {
    super(message);
    this.name = 'ScreeningValidationError';
    this.code = code;
  }
}

export interface ScreeningScoreResult<S extends string> {
  totalScore: number;
  severity: S;
  scoringVersion: string;
}

function assertValidTotal(score: unknown, max: number, label: string): number {
  // typeof check first: strings, null, undefined and booleans are never coerced.
  if (typeof score !== 'number' || Number.isNaN(score)) {
    throw new ScreeningValidationError('SCORE_NOT_A_NUMBER', `${label} score must be a number.`);
  }
  if (!Number.isFinite(score) || !Number.isInteger(score)) {
    throw new ScreeningValidationError('SCORE_NOT_INTEGER', `${label} score must be a finite integer.`);
  }
  if (score < 0 || score > max) {
    throw new ScreeningValidationError('SCORE_OUT_OF_RANGE', `${label} score must be between 0 and ${max}.`);
  }
  return score;
}

/**
 * PHQ-9 bands: 0-4 Minimal, 5-9 Ringan, 10-14 Sedang, 15-19 Sedang-Berat, 20-27 Berat.
 * Throws ScreeningValidationError for anything that is not an integer in 0..27.
 */
export function calculatePhq9Severity(score: unknown): PhqSeverity {
  const s = assertValidTotal(score, PHQ9_MAX_SCORE, 'PHQ-9');
  if (s <= 4) return 'Minimal';
  if (s <= 9) return 'Ringan';
  if (s <= 14) return 'Sedang';
  if (s <= 19) return 'Sedang-Berat';
  return 'Berat';
}

/** GAD-7 bands: 0-4 Minimal, 5-9 Ringan, 10-14 Sedang, 15-21 Berat. */
export function calculateGad7Severity(score: unknown): GadSeverity {
  const s = assertValidTotal(score, GAD7_MAX_SCORE, 'GAD-7');
  if (s <= 4) return 'Minimal';
  if (s <= 9) return 'Ringan';
  if (s <= 14) return 'Sedang';
  return 'Berat';
}

/** Returns validated answers, or throws. Unanswered items (null, -1, undefined) are rejected. */
export function validateAnswers(answers: unknown, expectedLength: number, label: string): number[] {
  if (!Array.isArray(answers)) {
    throw new ScreeningValidationError('ANSWERS_NOT_ARRAY', `${label} answers must be an array.`);
  }
  if (answers.length !== expectedLength) {
    throw new ScreeningValidationError(
      answers.length < expectedLength ? 'ANSWERS_INCOMPLETE' : 'ANSWERS_WRONG_LENGTH',
      `${label} requires exactly ${expectedLength} answers.`,
    );
  }
  for (const a of answers) {
    if (a === null || a === undefined || a === -1) {
      throw new ScreeningValidationError('ANSWERS_INCOMPLETE', `${label} has unanswered items.`);
    }
    if (typeof a !== 'number' || !Number.isInteger(a) || a < ANSWER_MIN || a > ANSWER_MAX) {
      throw new ScreeningValidationError('ANSWER_INVALID', `${label} answers must be integers 0-3.`);
    }
  }
  return answers as number[];
}

export function calculatePhq9Total(answers: unknown): number {
  return validateAnswers(answers, PHQ9_ITEM_COUNT, 'PHQ-9').reduce((a, b) => a + b, 0);
}

export function calculateGad7Total(answers: unknown): number {
  return validateAnswers(answers, GAD7_ITEM_COUNT, 'GAD-7').reduce((a, b) => a + b, 0);
}

export function scorePhq9(answers: unknown): ScreeningScoreResult<PhqSeverity> {
  const totalScore = calculatePhq9Total(answers);
  return { totalScore, severity: calculatePhq9Severity(totalScore), scoringVersion: PHQ9_SCORING_VERSION };
}

export function scoreGad7(answers: unknown): ScreeningScoreResult<GadSeverity> {
  const totalScore = calculateGad7Total(answers);
  return { totalScore, severity: calculateGad7Severity(totalScore), scoringVersion: GAD7_SCORING_VERSION };
}

/** Throws SCORE_MISMATCH when a claimed total disagrees with the individual answers. */
export function assertTotalMatchesAnswers(claimedTotal: unknown, computedTotal: number, label: string): void {
  if (claimedTotal !== computedTotal) {
    throw new ScreeningValidationError('SCORE_MISMATCH', `${label} total does not match the individual answers.`);
  }
}

export type Item9Provenance = 'answers' | 'client_reported_item' | 'unknown';

export interface Item9Assessment {
  /** 0-3, or null when the item was never answered (NOT treated as zero). */
  item9Score: number | null;
  /** true when item 9 > 0, false when explicitly answered 0, null when unknown. */
  item9Positive: boolean | null;
  provenance: Item9Provenance;
}

/**
 * Derives the item-9 indicator. Verified answers win; a client boolean can never lower it.
 * A positive item 9 is a prompt for follow-up and support, NOT a diagnosis or proof of
 * immediate danger.
 */
export function assessItem9(input: { phq9Answers?: number[] | null; item9Score?: number | null }): Item9Assessment {
  if (input.phq9Answers) {
    const v = input.phq9Answers[PHQ9_ITEM9_INDEX];
    return { item9Score: v, item9Positive: v > 0, provenance: 'answers' };
  }
  const v = input.item9Score;
  if (typeof v === 'number' && Number.isInteger(v) && v >= ANSWER_MIN && v <= ANSWER_MAX) {
    return { item9Score: v, item9Positive: v > 0, provenance: 'client_reported_item' };
  }
  return { item9Score: null, item9Positive: null, provenance: 'unknown' };
}

/** Compatibility wrapper: summary for UI copy. Severity comes only from the shared engine. */
export function classifyScreening(phqScore: number, gadScore: number) {
  return {
    phqScore,
    gadScore,
    phqSeverity: calculatePhq9Severity(phqScore),
    gadSeverity: calculateGad7Severity(gadScore),
    scoringVersion: SCREENING_SCORING_VERSION,
  };
}
