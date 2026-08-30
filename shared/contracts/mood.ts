import { z } from 'zod';

export const CreateMoodSchema = z.object({
  mood: z.union([z.string(), z.number()]),
  notes: z.string().max(1000).optional(),
  intensity: z.number().min(0).max(24).optional(),
  factors: z.array(z.string()).optional()
});
export type CreateMoodInput = z.infer<typeof CreateMoodSchema>;

export const UpdateMoodSchema = CreateMoodSchema.partial();
export type UpdateMoodInput = z.infer<typeof UpdateMoodSchema>;
