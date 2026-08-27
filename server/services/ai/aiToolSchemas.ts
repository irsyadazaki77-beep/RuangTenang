import { z } from 'zod';

/**
 * Strict tool schemas for RuangTenang plugin system.
 * Rejects unknown fields and prevents injection of arbitrary URLs, SQL, routes, or instructions.
 */

export const validToolNames = [
  'screening',
  'mood',
  'counselors',
  'emergency',
  'articles',
  'ai_memory'
] as const;

export type ValidToolName = (typeof validToolNames)[number];

export const screeningToolSchema = z.object({
  reason: z.string().max(200).optional(),
  assessmentType: z.enum(['phq9', 'gad7', 'general']).optional()
}).strict();

export const moodToolSchema = z.object({
  reason: z.string().max(200).optional(),
  targetMood: z.number().int().min(1).max(5).optional()
}).strict();

export const counselorsToolSchema = z.object({
  reason: z.string().max(200).optional(),
  specialty: z.string().max(100).optional()
}).strict();

export const emergencyToolSchema = z.object({
  reason: z.string().max(200).optional(),
  immediateDanger: z.boolean().optional()
}).strict();

export const articlesToolSchema = z.object({
  reason: z.string().max(200).optional(),
  topic: z.enum(['anxiety', 'stress', 'sleep', 'academic', 'burnout', 'general']).optional()
}).strict();

export const aiMemoryToolSchema = z.object({
  reason: z.string().max(200).optional(),
  action: z.enum(['retrieve', 'summarize']).optional()
}).strict();

export const toolSchemasMap = {
  screening: screeningToolSchema,
  mood: moodToolSchema,
  counselors: counselorsToolSchema,
  emergency: emergencyToolSchema,
  articles: articlesToolSchema,
  ai_memory: aiMemoryToolSchema
};

export const pluginCallSchema = z.object({
  tool_call: z.enum(validToolNames),
  parameters: z.record(z.string(), z.unknown()).optional()
}).strict();

export function validateAndSanitizeToolCall(raw: unknown): {
  isValid: boolean;
  toolCall?: ValidToolName;
  parameters?: Record<string, any>;
  error?: string;
} {
  if (!raw || typeof raw !== 'object') {
    return { isValid: false, error: 'Tool call payload must be an object' };
  }

  const baseParse = pluginCallSchema.safeParse(raw);
  if (!baseParse.success) {
    return { isValid: false, error: `Invalid tool call envelope: ${baseParse.error.message}` };
  }

  const { tool_call, parameters = {} } = baseParse.data;
  const specificSchema = toolSchemasMap[tool_call];
  if (!specificSchema) {
    return { isValid: false, error: `Unrecognized tool name: ${tool_call}` };
  }

  const paramParse = specificSchema.safeParse(parameters);
  if (!paramParse.success) {
    return {
      isValid: false,
      error: `Invalid parameters for tool "${tool_call}": ${paramParse.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`
    };
  }

  return {
    isValid: true,
    toolCall: tool_call,
    parameters: paramParse.data
  };
}
