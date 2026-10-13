import { z } from 'zod';

export const WorkspaceMemoryCategorySchema = z.enum([
  'goal',
  'decision',
  'preference',
  'constraint',
  'progress'
]);

export const WorkspaceMemoryStatusSchema = z.enum([
  'active',
  'superseded',
  'obsolete'
]);

export const WorkspaceMemoryItemSchema = z.object({
  id: z.string().min(1).max(100),
  workspaceId: z.string().min(1).max(100),
  userId: z.string().min(1).max(100),
  category: WorkspaceMemoryCategorySchema,
  content: z.string().trim().min(1).max(2000),
  provenance: z.string().trim().max(500).nullable().optional(),
  status: WorkspaceMemoryStatusSchema.default('active'),
  version: z.number().int().positive().default(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  isActive: z.boolean().default(true)
}).strict();

export const CreateWorkspaceMemorySchema = z.object({
  category: WorkspaceMemoryCategorySchema.default('decision'),
  content: z.string().trim().min(1).max(2000),
  provenance: z.string().trim().max(500).optional()
}).strict();

export const UpdateWorkspaceMemorySchema = z.object({
  content: z.string().trim().min(1).max(2000).optional(),
  category: WorkspaceMemoryCategorySchema.optional(),
  status: WorkspaceMemoryStatusSchema.optional(),
  isActive: z.boolean().optional(),
  provenance: z.string().trim().max(500).nullable().optional()
}).strict().refine(val => Object.keys(val).length > 0, 'Harus ada setidaknya satu field untuk diperbarui');

export type WorkspaceMemoryCategory = z.infer<typeof WorkspaceMemoryCategorySchema>;
export type WorkspaceMemoryStatus = z.infer<typeof WorkspaceMemoryStatusSchema>;
export type WorkspaceMemoryItem = z.infer<typeof WorkspaceMemoryItemSchema>;
export type CreateWorkspaceMemoryInput = z.infer<typeof CreateWorkspaceMemorySchema>;
export type UpdateWorkspaceMemoryInput = z.infer<typeof UpdateWorkspaceMemorySchema>;
