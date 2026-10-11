import { describe, it, expect } from 'vitest';
import { buildAuthoritativeScreening, mapScreeningToResponse } from '../../services/screeningSafetyService';
import { ScreeningSubmissionSchema } from '../../../shared/contracts/screening';
import { ScreeningValidationError } from '../../../shared/clinical/scoring';

const parse = (b: unknown) => ScreeningSubmissionSchema.parse(b);
const gad = [0, 0, 0, 0, 0, 0, 0];

describe('screening safety logic (server-authoritative)', () => {
  it('A: PHQ-9 = 5 with item 9 = 1 keeps Ringan but flags item 9', () => {
    const answers = [1, 1, 1, 1, 0, 0, 0, 0, 1];
    const r = buildAuthoritativeScreening(parse({ phq9Score: 5, gad7Score: 0, phq9Answers: answers, gad7Answers: gad }));
    expect(r.phq9Severity).toBe('Ringan');
    expect(r.item9Score).toBe(1);
    expect(r.hasSelfHarmRisk).toBe(true);
    expect(r.riskIndicators.item9Positive).toBe(true);
  });

  it('B: client hasSelfHarmRisk=false cannot cancel a positive item 9 (answers and total-only)', () => {
    const answers = [0, 0, 0, 0, 0, 0, 0, 0, 2];
    const fromAnswers = buildAuthoritativeScreening(
      parse({ phq9Score: 2, gad7Score: 0, phq9Answers: answers, gad7Answers: gad, hasSelfHarmRisk: false, riskIndicators: { item9Score: 0, hasSelfHarmRisk: false } }),
    );
    expect(fromAnswers.hasSelfHarmRisk).toBe(true);
    const totalOnly = buildAuthoritativeScreening(parse({ phq9Score: 2, gad7Score: 0, item9Score: 2, hasSelfHarmRisk: false }));
    expect(totalOnly.hasSelfHarmRisk).toBe(true);
    expect(totalOnly.riskIndicators.item9Positive).toBe(true);
  });

  it('B2: item9Score contradicting answers is rejected', () => {
    expect(() =>
      buildAuthoritativeScreening(parse({ phq9Score: 0, gad7Score: 0, phq9Answers: Array(9).fill(0), gad7Answers: gad, item9Score: 3 })),
    ).toThrow(ScreeningValidationError);
  });

  it('C: item 9 = 0 with client concern is kept as an additional, labelled statement', () => {
    const r = buildAuthoritativeScreening(
      parse({ phq9Score: 0, gad7Score: 0, phq9Answers: Array(9).fill(0), gad7Answers: gad, hasSelfHarmRisk: true }),
    );
    expect(r.riskIndicators.item9Positive).toBe(false);
    expect(r.riskIndicators.clientReportedSelfHarmConcern).toBe(true);
    expect(r.hasSelfHarmRisk).toBe(true); // conservative: only ever raised
    expect(r.riskIndicators.immediateDanger).toBeNull(); // no whole-risk conclusion invented
    expect(r.riskIndicators.riskCategory).toBe('RISIKO_MENYAKITI_DIRI');
  });

  it('D: missing item 9 is unknown, not negative', () => {
    const r = buildAuthoritativeScreening(parse({ phq9Score: 3, gad7Score: 3 }));
    expect(r.item9Score).toBeNull();
    expect(r.riskIndicators.item9Positive).toBeNull();
    expect(r.riskIndicators.item9Provenance).toBe('unknown');
    expect(r.riskIndicators.verification).toBe('total_only');
  });

  it('E: incomplete safety assessment is stored as unknown/unverified, never "safe"', () => {
    const r = buildAuthoritativeScreening(
      parse({ phq9Score: 6, gad7Score: 0, item9Score: 1, riskIndicators: { item9Score: 1, hasSelfHarmRisk: true, immediateDanger: null, planOrIntent: null } }),
    );
    expect(r.riskIndicators.immediateDanger).toBeNull();
    expect(r.riskIndicators.planOrIntent).toBeNull();
    expect(r.riskIndicators.assessmentStatus).toBe('self_report_unverified');
    expect(r.riskIndicators.professionalReviewStatus).toBe('not_reviewed');
  });

  it('F: high total with item 9 = 0 gets correct severity without a danger conclusion', () => {
    const r = buildAuthoritativeScreening(
      parse({ phq9Score: 24, gad7Score: 0, phq9Answers: [3, 3, 3, 3, 3, 3, 3, 3, 0], gad7Answers: gad }),
    );
    expect(r.phq9Severity).toBe('Berat');
    expect(r.hasSelfHarmRisk).toBe(false);
    expect(r.riskIndicators.riskCategory).toBe('STANDAR');
  });

  it('client riskCategory and severities are never trusted', () => {
    const r = buildAuthoritativeScreening(
      parse({ phq9Score: 17, gad7Score: 3, phq9Severity: 'Minimal', gad7Severity: 'Berat', riskIndicators: { item9Score: 0, hasSelfHarmRisk: false, riskCategory: 'STANDAR' } }),
    );
    expect(r.phq9Severity).toBe('Sedang-Berat');
    expect(r.gad7Severity).toBe('Minimal');
  });

  it('rejects total mismatching the answers and partial structured data', () => {
    expect(() => buildAuthoritativeScreening(parse({ phq9Score: 9, gad7Score: 0, phq9Answers: Array(9).fill(0), gad7Answers: gad }))).toThrow(/does not match/);
    expect(() => buildAuthoritativeScreening(parse({ phq9Score: 0, gad7Score: 0, phq9Answers: Array(9).fill(0) }))).toThrow();
    expect(() => buildAuthoritativeScreening(parse({ phq9Score: 0, gad7Score: 0, phq9Answers: Array(8).fill(0), gad7Answers: gad }))).toThrow();
  });

  it('G: positive item 9 with low total still carries help-relevant flag in the DTO', () => {
    const dto = mapScreeningToResponse({ id: 'x', phq9Score: 2, gad7Score: 0, phq9Severity: 'Minimal', gad7Severity: 'Minimal', item9Score: 1, hasSelfHarmRisk: false, timestamp: 't', userId: 'u' });
    expect(dto.phq9Severity).toBe('Minimal');
    expect(dto.hasSelfHarmRisk).toBe(true); // a stored false cannot hide a positive item 9
    expect(dto.safety.item9Positive).toBe(true);
  });
});

describe('legacy compatibility in response DTO', () => {
  it('re-derives severity but preserves the originally stored label and marks version unknown', () => {
    const dto = mapScreeningToResponse({ id: 'old', phq9Score: 17, gad7Score: 12, phq9Severity: 'Berat', gad7Severity: 'Sedang', timestamp: 't', userId: 'u' });
    expect(dto.phq9Severity).toBe('Sedang-Berat');
    expect(dto.legacyStoredPhq9Severity).toBe('Berat');
    expect(dto.legacyStoredGad7Severity).toBeUndefined();
    expect(dto.scoringVersion).toBe('LEGACY_UNKNOWN');
    expect(dto.verification).toBe('legacy_unknown');
    expect(dto.safety.item9Score).toBeNull();
    expect(dto.safety.item9Positive).toBeNull();
    expect(dto.item9Score).toBeUndefined();
  });
});
