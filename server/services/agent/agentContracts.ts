import { z } from 'zod';
import { AgentArtifactProposalSchema, AgentExecutionEventSchema, AgentExecutionResultSchema } from '../../../shared/contracts/agent.js';

export { AgentArtifactProposalSchema, AgentExecutionEventSchema, AgentExecutionResultSchema };
export type { AgentArtifactProposal, AgentExecutionEvent, AgentExecutionResult } from '../../../shared/contracts/agent.js';

export const AgentDecisionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('tool'),
    toolId: z.string().min(1).max(100),
    arguments: z.record(z.string(), z.unknown())
  }).strict(),
  z.object({
    type: z.literal('final'),
    content: z.string().trim().min(1).max(20_000),
    artifactProposal: AgentArtifactProposalSchema.optional()
  }).strict()
]);

export type AgentDecision = z.infer<typeof AgentDecisionSchema>;

export const AgentToolResultSchema = z.discriminatedUnion('status', [
  z.object({
    executionId: z.string().min(1).max(100),
    toolCallId: z.string().min(1).max(100),
    toolId: z.string().min(1).max(100),
    status: z.literal('completed'),
    data: z.unknown(),
    durationMs: z.number().int().nonnegative()
  }).strict(),
  z.object({
    executionId: z.string().min(1).max(100),
    toolCallId: z.string().min(1).max(100),
    toolId: z.string().min(1).max(100),
    status: z.enum(['failed', 'cancelled']),
    error: z.object({ code: z.string().max(100), message: z.string().max(500) }).strict(),
    durationMs: z.number().int().nonnegative()
  }).strict()
]);

export type AgentToolResult = z.infer<typeof AgentToolResultSchema>;

