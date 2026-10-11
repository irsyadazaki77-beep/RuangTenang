import {
  SCREENING_SCORING_VERSION,
  LEGACY_UNKNOWN_SCORING_VERSION,
  ScreeningValidationError,
  assessItem9,
  assertTotalMatchesAnswers,
  calculateGad7Severity,
  calculatePhq9Severity,
  scoreGad7,
  scorePhq9,
  type GadSeverity,
  type PhqSeverity,
} from '../../shared/clinical/scoring.js';
import type {
  ScreeningResultDTO,
  ScreeningSubmissionInput,
  ScreeningVerification,
} from '../../shared/contracts/screening.js';

export interface AuthoritativeScreening {
  phq9Score: number;
  gad7Score: number;
  phq9Severity: PhqSeverity;
  gad7Severity: GadSeverity;
  /** Stored column. null when item 9 was never answered (unknown is not negative). */
  item9Score: number | null;
  /**
   * Conservative triage flag: true if item 9 is positive OR the client additionally
   * reported a concern. It can only be raised, never lowered, by client input.
   */
  hasSelfHarmRisk: boolean;
  riskIndicators: Record<string, unknown>;
}

/**
 * Builds the server-authoritative screening result. Client-supplied severities and
 * riskCategory are never trusted. Throws ScreeningValidationError on invalid input.
 *
 * Notes on safety semantics:
 * - A positive item 9 is a prompt for support/follow-up, not a diagnosis nor proof of
 *   immediate danger.
 * - Safety-assessment answers (immediateDanger etc.) are stored as UNVERIFIED self-report.
 *   null/missing means "unknown", never "safe".
 */
export function buildAuthoritativeScreening(input: ScreeningSubmissionInput): AuthoritativeScreening {
  let phq9Score = input.phq9Score;
  let gad7Score = input.gad7Score;
  let verification: ScreeningVerification = 'total_only';

  if (input.phq9Answers) {
    const computed = scorePhq9(input.phq9Answers).totalScore;
    assertTotalMatchesAnswers(input.phq9Score, computed, 'PHQ-9');
    phq9Score = computed;
  }
  if (input.gad7Answers) {
    const computed = scoreGad7(input.gad7Answers).totalScore;
    assertTotalMatchesAnswers(input.gad7Score, computed, 'GAD-7');
    gad7Score = computed;
  }
  if (input.phq9Answers && input.gad7Answers) verification = 'answers_verified';
  else if (input.phq9Answers || input.gad7Answers) {
    throw new ScreeningValidationError('ANSWERS_INCOMPLETE', 'Provide both PHQ-9 and GAD-7 answers, or neither.');
  }

  const phq9Severity = calculatePhq9Severity(phq9Score);
  const gad7Severity = calculateGad7Severity(gad7Score);

  const item9 = assessItem9({
    phq9Answers: input.phq9Answers ?? null,
    item9Score: input.item9Score ?? input.riskIndicators?.item9Score ?? null,
  });
  if (
    input.phq9Answers &&
    typeof input.item9Score === 'number' &&
    input.item9Score !== item9.item9Score
  ) {
    throw new ScreeningValidationError('SCORE_MISMATCH', 'item9Score does not match the PHQ-9 answers.');
  }

  const clientReportedConcern = input.hasSelfHarmRisk === true || input.riskIndicators?.hasSelfHarmRisk === true;
  const ri = input.riskIndicators;
  const selfReportedImmediate = ri?.immediateDanger === true || ri?.planOrIntent === true;

  const hasSelfHarmRisk = item9.item9Positive === true || clientReportedConcern;

  // Derived server-side only; the client's riskCategory is discarded.
  const riskCategory = selfReportedImmediate
    ? 'KRISIS_SANGAT_TINGGI'
    : hasSelfHarmRisk
      ? 'RISIKO_MENYAKITI_DIRI'
      : 'STANDAR';

  return {
    phq9Score,
    gad7Score,
    phq9Severity,
    gad7Severity,
    item9Score: item9.item9Score,
    hasSelfHarmRisk,
    riskIndicators: {
      item9Score: item9.item9Score,
      item9Positive: item9.item9Positive,
      item9Provenance: item9.provenance,
      hasSelfHarmRisk,
      clientReportedSelfHarmConcern: clientReportedConcern,
      // Self-reported answers to the optional follow-up questions; null = not answered.
      immediateDanger: ri?.immediateDanger ?? null,
      planOrIntent: ri?.planOrIntent ?? null,
      wantsTrustedContact: ri?.wantsTrustedContact ?? null,
      riskCategory,
      assessmentStatus: 'self_report_unverified',
      professionalReviewStatus: 'not_reviewed',
      scoringVersion: SCREENING_SCORING_VERSION,
      verification,
      flaggedAt: new Date().toISOString(),
    },
  };
}

function toIndicatorObject(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

/**
 * Maps a stored record to the response DTO. Severity is ALWAYS derived from the stored
 * score via the shared engine, so legacy 4-band rows ("Berat" for 17) display consistently.
 * The original stored label is preserved in legacyStored*Severity; nothing is rewritten.
 */
export function mapScreeningToResponse(scr: Record<string, any>): ScreeningResultDTO {
  const indicators = toIndicatorObject(scr.riskIndicators);
  const phq9Severity = calculatePhq9Severity(scr.phq9Score);
  const gad7Severity = calculateGad7Severity(scr.gad7Score);

  const storedVersion = typeof indicators?.scoringVersion === 'string' ? indicators.scoringVersion : null;
  const verification: ScreeningVerification = storedVersion
    ? ((indicators?.verification as ScreeningVerification) ?? 'total_only')
    : 'legacy_unknown';

  const item9Score: number | null = typeof scr.item9Score === 'number' ? scr.item9Score : null;
  const item9Positive =
    item9Score !== null ? item9Score > 0 : typeof indicators?.item9Positive === 'boolean' ? indicators.item9Positive : null;
  const hasSelfHarmRisk = scr.hasSelfHarmRisk === true || item9Positive === true;

  return {
    id: scr.id,
    phq9Score: scr.phq9Score,
    gad7Score: scr.gad7Score,
    phq9Severity,
    gad7Severity,
    ...(scr.phq9Severity && scr.phq9Severity !== phq9Severity ? { legacyStoredPhq9Severity: scr.phq9Severity } : {}),
    ...(scr.gad7Severity && scr.gad7Severity !== gad7Severity ? { legacyStoredGad7Severity: scr.gad7Severity } : {}),
    scoringVersion: storedVersion ?? LEGACY_UNKNOWN_SCORING_VERSION,
    verification,
    safety: {
      item9Score,
      item9Positive,
      assessmentStatus: 'self_report_unverified',
      clientReportedSelfHarmConcern: indicators?.clientReportedSelfHarmConcern === true,
    },
    // Legacy fields (compat): unknown item 9 is omitted rather than reported as 0.
    ...(item9Score !== null ? { item9Score } : {}),
    hasSelfHarmRisk,
    riskLevel: scr.riskLevel || 'Rendah',
    status: scr.status || 'Menunggu Penanganan',
    riskIndicators: indicators,
    timestamp: scr.timestamp,
    userId: scr.userId || '',
  };
}
