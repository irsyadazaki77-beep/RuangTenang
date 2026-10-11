# Clinical Screening Scoring (PHQ-9 / GAD-7)

> **STATUS: NOT CLINICALLY VALIDATED.** Software tests prove the code implements the rules
> below; they do not prove the rules, translations or follow-up wording are clinically
> appropriate. A qualified mental-health professional must approve the items marked
> **[CLINICAL REVIEW REQUIRED]** before use in any real clinical setting.

## Instruments
- **PHQ-9**: 9 items, each 0-3, total 0-27. Item 9 concerns thoughts of death or self-harm.
- **GAD-7**: 7 items, each 0-3, total 0-21.

Published sources for the instruments and bands (verify against the originals):
- Kroenke K, Spitzer RL, Williams JBW. The PHQ-9: validity of a brief depression severity
  measure. *J Gen Intern Med.* 2001;16(9):606-613.
- Spitzer RL, Kroenke K, Williams JBW, Löwe B. A brief measure for assessing generalized
  anxiety disorder: the GAD-7. *Arch Intern Med.* 2006;166(10):1092-1097.

The Indonesian translation/wording used in the app has **not** been verified here against an
officially validated Indonesian version. **[CLINICAL REVIEW REQUIRED]**

## Single source of truth
All thresholds live in `shared/clinical/scoring.ts`. Frontend (`src/lib/clinicalScoring.ts`,
`src/utils/scoring.ts`), backend routes, report generator and counselor analytics call it.
Do not re-implement thresholds elsewhere; `server/__tests__/unit/clinicalScoringEngine.test.ts`
asserts every entry point agrees for every valid score.

## Bands and algorithm versions
| Score | PHQ-9 (`PHQ9_CLASSIC_5_BAND_V1`) | GAD-7 (`GAD7_CLASSIC_4_BAND_V1`) |
|---|---|---|
| 0-4 | Minimal | Minimal |
| 5-9 | Ringan | Ringan |
| 10-14 | Sedang | Sedang |
| 15-19 | Sedang-Berat | Berat (15-21) |
| 20-27 | Berat | — |

Indonesian labels map to the published *minimal / mild / moderate / moderately severe / severe*
(PHQ-9) and *minimal / mild / moderate / severe* (GAD-7). **[CLINICAL REVIEW REQUIRED]**

Each new result stores `scoringVersion` (`PHQ9_CLASSIC_5_BAND_V1+GAD7_CLASSIC_4_BAND_V1`) and
`verification` inside the encrypted `riskIndicators` JSON (no schema migration needed).

## Validation
Totals must be integers in range (PHQ-9 0-27, GAD-7 0-21). Strings, `null`, `NaN`,
`Infinity`, decimals and out-of-range values are rejected with `ScreeningValidationError`,
never classified. Answers must be exactly 9 / 7 integers 0-3; unanswered items reject the
whole questionnaire (no partial final score). If answers are supplied the server computes
the total itself and returns `400 SCORE_MISMATCH` when the claimed total disagrees.

## Server authority
The server ignores client `phq9Severity`/`gad7Severity` and client `riskCategory`, and always
uses the authenticated user as owner. Results submitted with only totals (legacy clients) are
accepted and marked `verification: total_only` — individual answers are never invented.

## Item 9 and safety
- Item 9 is evaluated separately from totals: PHQ-9 = 5 with item 9 = 1 stays *Ringan* but
  item 9 is flagged; a high total with item 9 = 0 is not given a "danger" conclusion.
- A client `hasSelfHarmRisk: false` can never lower a positive item 9. The stored flag is
  conservative and only ever raised (item 9 > 0 or an additional client-reported concern).
- A positive item 9 means *follow-up and support are warranted*. It is **not** a diagnosis
  and **not** proof of immediate danger.
- Missing item 9 is `unknown` (`null`), never `0`/negative.
- Safety-check answers (`immediateDanger`, `planOrIntent`, `wantsTrustedContact`) are stored
  as unverified self-report. `null` means not answered, never "safe". Status fields:
  `assessmentStatus: self_report_unverified`, `professionalReviewStatus: not_reviewed`.
- Help resources remain visible regardless of totals. **[CLINICAL REVIEW REQUIRED]** for the
  follow-up pathway wording.
- The system does **not** contact anyone automatically and does **not** claim live counselor
  monitoring.

## Historical data
Rows created before this change have no `scoringVersion` and were classified by a 4-band rule
in the backend (e.g. PHQ-9 = 17 stored as "Berat"). Handling:
1. Original scores and stored labels are **never modified or deleted**.
2. API responses report `scoringVersion: LEGACY_UNKNOWN`, `verification: legacy_unknown`, and
   derive `phq9Severity` from the score with the shared engine, exposing the original label as
   `legacyStoredPhq9Severity` when it differs.
3. `npm run audit:screening-severity` prints aggregate counts of affected rows (read-only).
4. Any persistent backfill needs a separate, reviewed and approved migration. Counselor notes
   are never touched. Records are not claimed to have been "calculated with the new version".

## Emergency resources
`src/lib/emergencyResources.ts` lists Healing119 (Kemenkes) with a source URL and review dates.
This phase did **not** independently re-verify numbers or 24-hour availability; a human must
re-check them against the official source before release and on each `reviewDueAt`.
Demo/unverified contacts must not be shown as production help. Never invent hotline numbers.

## Privacy
Screening data is health data. Access requires ownership, or counselor consent + assignment;
admins do not get clinical access by role. Do not log answers or scores per user. Do not send
results to Ruang Kerja or any AI provider without consent.

## Limits of automation
The software performs deterministic arithmetic and flags. It cannot diagnose, assess immediate
risk, or replace professional evaluation.
