import { z } from 'zod';
import type { SupportedFileKind } from './files.js';

export const AgentArtifactProposalSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(['DOCUMENT', 'OUTLINE', 'CODE', 'CITATION', 'TABLE']),
  language: z.string().trim().max(80).optional(),
  content: z.string().min(1).max(20_000)
}).strict();

export type AgentArtifactProposal = z.infer<typeof AgentArtifactProposalSchema>;

export const AgentExecutionEventSchema = z.object({
  step: z.number().int().positive(),
  kind: z.enum(['model_decision', 'tool']),
  toolCallId: z.string().max(100).optional(),
  toolId: z.string().max(100).optional(),
  status: z.enum(['completed', 'failed', 'cancelled']),
  durationMs: z.number().int().nonnegative(),
  errorCode: z.string().max(100).optional()
}).strict();
export type AgentExecutionEvent = z.infer<typeof AgentExecutionEventSchema>;

export const AgentExecutionResultSchema = z.object({
  executionId: z.string().min(1).max(100),
  status: z.enum(['completed', 'failed', 'cancelled']),
  output: z.string().max(20_000),
  sources: z.array(z.object({
    citationId: z.string().max(100).optional(),
    retrievalSnapshotId: z.string().max(100).optional(),
    documentId: z.string().max(100),
    workspaceId: z.string().max(100).optional(),
    checksum: z.string().max(128).optional(),
    sourceVersion: z.string().max(128).optional(),
    fileKind: z.enum(['text', 'markdown', 'csv', 'json', 'pdf', 'docx', 'pptx', 'xlsx', 'image', 'code']).optional() satisfies z.ZodType<SupportedFileKind | undefined>,
    filename: z.string().max(500),
    url: z.string().url().max(600).optional(),
    page: z.number().int().positive().optional(),
    slide: z.number().int().positive().optional(),
    sheet: z.string().max(240).optional(),
    section: z.string().max(500).optional(),
    sourceRef: z.string().max(600),
    snippet: z.string().max(500).optional()
  }).strict()).max(50),
  artifactProposal: AgentArtifactProposalSchema.optional(),
  artifactId: z.string().max(100).optional(),
  modelId: z.string().max(100),
  steps: z.number().int().nonnegative(),
  toolCalls: z.number().int().nonnegative(),
  events: z.array(AgentExecutionEventSchema).max(24),
  estimatedInputTokens: z.number().int().nonnegative(),
  estimatedOutputTokens: z.number().int().nonnegative(),
  error: z.object({ code: z.string().max(100), message: z.string().max(500) }).strict().optional()
}).strict();

export type AgentExecutionResult = z.infer<typeof AgentExecutionResultSchema>;
