import { z } from 'zod';

export const WorkspaceTaskStatusSchema = z.enum(['todo', 'running', 'waiting_review', 'done', 'failed', 'cancelled']);
export const WorkspaceTaskSourceSchema = z.enum(['user', 'ai']);
export const WorkspaceTaskTypeSchema = z.enum(['analysis', 'writing', 'research', 'coding', 'review', 'transform']);
export const WorkspacePlanStatusSchema = z.enum(['draft', 'approved', 'running', 'completed', 'cancelled', 'paused']);
export const WorkspacePlanTaskSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(2000).optional(),
  type: WorkspaceTaskTypeSchema.default('analysis'),
  dependsOn: z.array(z.string().min(1).max(100)).max(12).default([]),
  status: WorkspaceTaskStatusSchema.default('todo'),
  executionId: z.string().max(100).optional(),
  snapshot: z.object({ inputPrompt: z.string().max(8000), contextSourceIds: z.array(z.string().max(100)).max(50), artifactContext: z.string().max(20000).optional(), workspaceInstructions: z.string().max(4000).optional(), modelId: z.string().max(100), createdAt: z.string() }).strict().optional(),
  output: z.string().max(20000).optional(),
  outputArtifactId: z.string().max(100).optional(),
  sources: z.array(z.object({ citationId: z.string().max(100).optional(), documentId: z.string().max(100), filename: z.string().max(500), page: z.number().int().positive().optional(), slide: z.number().int().positive().optional(), sheet: z.string().max(240).optional(), section: z.string().max(500).optional(), sourceRef: z.string().max(600), snippet: z.string().max(500).optional() }).strict()).max(50).optional(),
  modelId: z.string().max(100).optional(),
  executionHistory: z.array(z.object({ executionId: z.string().max(100), modelId: z.string().max(100), startedAt: z.string(), completedAt: z.string().optional(), status: z.enum(['running', 'completed', 'failed', 'cancelled']) }).strict()).max(20).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
}).strict();
export const WorkspacePlanSchema = z.object({
  id: z.string().min(1).max(100),
  goal: z.string().trim().min(1).max(1000),
  title: z.string().trim().min(1).max(240),
  status: WorkspacePlanStatusSchema,
  tasks: z.array(WorkspacePlanTaskSchema).min(1).max(12),
  createdAt: z.string(),
  updatedAt: z.string()
}).strict().superRefine((plan, ctx) => {
  const ids = new Set(plan.tasks.map(task => task.id));
  if (ids.size !== plan.tasks.length) ctx.addIssue({ code: 'custom', message: 'ID task harus unik.' });
  const graph = new Map(plan.tasks.map(task => [task.id, task.dependsOn]));
  for (const task of plan.tasks) {
    for (const dependency of task.dependsOn) {
      if (!ids.has(dependency) || dependency === task.id) ctx.addIssue({ code: 'custom', message: 'Dependency task tidak valid.' });
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycle = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of graph.get(id) || []) if (cycle(next)) return true;
    visiting.delete(id); visited.add(id); return false;
  };
  for (const id of ids) if (cycle(id)) { ctx.addIssue({ code: 'custom', message: 'Dependency membentuk siklus.' }); break; }
});
export const WorkspaceTaskExecutionRequestSchema = z.object({
  executionId: z.string().min(1).max(100),
  snapshot: z.object({ inputPrompt: z.string().max(8000), contextSourceIds: z.array(z.string().max(100)).max(50), artifactContext: z.string().max(20000).optional(), workspaceInstructions: z.string().max(4000).optional(), modelId: z.string().max(100), createdAt: z.string() }).strict()
}).strict();

export const CreateWorkspaceSchema = z.object({ name: z.string().trim().min(1).max(100).optional() }).strict();
const WorkspaceSettingsSchema = z.record(z.string(), z.unknown()).refine(settings => {
  try { return JSON.stringify(settings).length <= 8000; } catch { return false; }
}, 'Pengaturan Workspace terlalu besar');

export const UpdateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  instructions: z.string().trim().max(4000).nullable().optional(),
  defaultModel: z.string().trim().max(100).nullable().optional(),
  defaultPreset: z.string().trim().max(100).nullable().optional(),
  settings: WorkspaceSettingsSchema.optional()
}).strict().refine(value => Object.keys(value).length > 0, 'Perubahan workspace kosong');
export const CreateWorkspaceTaskSchema = z.object({ title: z.string().trim().min(1).max(240), source: WorkspaceTaskSourceSchema.default('user') }).strict();
export const UpdateWorkspaceTaskSchema = z.object({ status: WorkspaceTaskStatusSchema }).strict();

export type WorkspaceTaskStatus = z.infer<typeof WorkspaceTaskStatusSchema>;
export type WorkspaceTaskSource = z.infer<typeof WorkspaceTaskSourceSchema>;
export type WorkspacePlanStatus = z.infer<typeof WorkspacePlanStatusSchema>;

export interface WorkspaceTaskContract {
  id: string;
  workspaceId: string;
  title: string;
  status: WorkspaceTaskStatus;
  source: WorkspaceTaskSource;
  createdAt: string;
  updatedAt: string;
}

export type WorkspacePlan = z.infer<typeof WorkspacePlanSchema>;
export interface WorkspacePlanSummary {
  id: string;
  title: string;
  status: WorkspacePlanStatus;
  taskCount: number;
  completedCount: number;
}

export interface WorkspaceContract {
  id: string;
  chatId: string;
  name: string;
  isPinned?: boolean;
  isArchived?: boolean;
  description?: string | null;
  instructions?: string | null;
  defaultModel?: string | null;
  defaultPreset?: string | null;
  settings?: Record<string, unknown>;
  plan?: WorkspacePlan | null;
  planSummary?: WorkspacePlanSummary | null;
  createdAt: string;
  updatedAt: string;
  tasks?: WorkspaceTaskContract[];
}
