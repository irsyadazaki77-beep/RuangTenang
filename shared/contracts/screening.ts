import { z } from 'zod';
import type { PhqSeverity, GadSeverity } from '../clinical/scoring.js';

export const ScreeningSubmissionSchema = z.object({
  /** Stable per-result key so retrying an uncertain save cannot create duplicate history rows. */
  clientSubmissionId: z.string().regex(/^scr_[a-f0-9-]{36}$/i).optional(),
  phq9Score: z.number().int().min(0).max(27),
  gad7Score: z.number().int().min(0).max(21),
  // DEPRECATED + IGNORED: severity is always recomputed on the server from the shared engine.
  // Accepted (any label) only so legacy clients are not rejected; never stored or trusted.
  phq9Severity: z.string().max(40).optional(),
  gad7Severity: z.string().max(40).optional(),
  // Structured answers (preferred). Entries must be integers 0-3; validated strictly server-side.
  phq9Answers: z.array(z.number()).max(20).optional(),
  gad7Answers: z.array(z.number()).max(20).optional(),
  item9Score: z.number().int().min(0).max(3).optional(),
  hasSelfHarmRisk: z.boolean().optional(),
  riskIndicators: z.object({
    item9Score: z.number().int().min(0).max(3),
    hasSelfHarmRisk: z.boolean(),
    immediateDanger: z.boolean().nullable().optional(),
    planOrIntent: z.boolean().nullable().optional(),
    wantsTrustedContact: z.boolean().nullable().optional(),
    contactedTrustedPerson: z.boolean().nullable().optional(), // Legacy field from earlier clients.
    riskCategory: z.string().optional(),
    flaggedAt: z.string().optional(),
  }).optional(),
  userId: z.string().optional(),
  answers: z.record(z.string(), z.union([z.string(), z.number()])).optional()
}).strict();
export type ScreeningSubmissionInput = z.infer<typeof ScreeningSubmissionSchema>;

export const UpdateScreeningStatusSchema = z.object({
  status: z.enum(['Menunggu Penanganan', 'Sedang Ditangani', 'Selesai'])
}).strict();
export type UpdateScreeningStatusInput = z.infer<typeof UpdateScreeningStatusSchema>;

export type ScreeningPersistenceStatus = 'idle' | 'pending' | 'saved' | 'local-only' | 'failed';

/** How a stored result's numbers can be trusted. */
export type ScreeningVerification = 'answers_verified' | 'total_only' | 'legacy_unknown';

export interface ScreeningResultDTO {
  id: string;
  phq9Score: number;
  gad7Score: number;
  /** Always derived from the score by the shared engine. */
  phq9Severity: PhqSeverity;
  gad7Severity: GadSeverity;
  /** Severity string that was stored before unification, only when it differs (legacy rows). */
  legacyStoredPhq9Severity?: string;
  legacyStoredGad7Severity?: string;
  scoringVersion: string;
  verification: ScreeningVerification;
  safety: {
    /** null = never answered/unknown. It is NOT the same as 0. */
    item9Score: number | null;
    item9Positive: boolean | null;
    /** Always 'self_report_unverified': no professional assessment is implied. */
    assessmentStatus: 'self_report_unverified';
    clientReportedSelfHarmConcern: boolean;
  };
  // Legacy fields kept for existing clients.
  item9Score?: number;
  hasSelfHarmRisk?: boolean;
  riskLevel?: string;
  status?: string;
  riskIndicators?: Record<string, unknown> | null;
  timestamp: string;
  userId: string;
}
