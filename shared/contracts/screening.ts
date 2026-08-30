import { z } from 'zod';

export const ScreeningSubmissionSchema = z.object({
  phq9Score: z.number().int().min(0).max(27),
  gad7Score: z.number().int().min(0).max(21),
  phq9Severity: z.enum(['Minimal', 'Ringan', 'Sedang', 'Berat']).optional(),
  gad7Severity: z.enum(['Minimal', 'Ringan', 'Sedang', 'Berat']).optional(),
  item9Score: z.number().int().min(0).max(3).optional(),
  hasSelfHarmRisk: z.boolean().optional(),
  riskIndicators: z.object({
    item9Score: z.number().int().min(0).max(3),
    hasSelfHarmRisk: z.boolean(),
    immediateDanger: z.boolean().optional(),
    planOrIntent: z.boolean().optional(),
    contactedTrustedPerson: z.boolean().optional(),
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

