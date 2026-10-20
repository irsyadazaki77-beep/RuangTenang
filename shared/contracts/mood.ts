import { z } from 'zod';

export const CreateMoodSchema = z.object({
  mood: z.union([z.string(), z.number()]),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(value => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }, 'Tanggal catatan tidak valid')
    .optional(),
  notes: z.string().max(1000).optional(),
  emotions: z.array(z.string()).max(10).optional(),
  factors: z.array(z.string()).max(10).optional(),
  sleepHours: z.number().min(0).max(24).optional().nullable(),
  sleepQuality: z.enum(['very_poor', 'poor', 'fair', 'good', 'excellent']).optional().nullable()
});

export type CreateMoodInput = z.infer<typeof CreateMoodSchema>;

export const UpdateMoodSchema = CreateMoodSchema.partial();
export type UpdateMoodInput = z.infer<typeof UpdateMoodSchema>;
