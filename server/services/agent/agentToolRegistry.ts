import { z, type ZodTypeAny } from 'zod';
import { TabularAnalysisRequestSchema } from '../../../shared/contracts/tabular.js';
import { isWebSearchConfigured } from '../webSearchService.js';

export type AgentTaskType = 'analysis' | 'writing' | 'research' | 'coding' | 'review' | 'transform';
export type AgentToolPermission = 'read' | 'propose';

export interface AgentToolDefinition {
  id: string;
  version: string;
  description: string;
  inputSchema: ZodTypeAny;
  outputSchema: ZodTypeAny;
  executionLocation: 'server';
  permission: AgentToolPermission;
  requiresApproval: boolean;
  timeoutMs: number;
  isIdempotent: boolean;
  allowedTaskTypes: readonly AgentTaskType[];
}

const nonEmptyId = z.string().trim().min(1).max(100);
const evidenceResultSchema = z.object({
  citationId: z.string().min(1).max(100), documentId: z.string().min(1).max(100),
  workspaceId: z.string().max(100).optional(), checksum: z.string().max(128).optional(), sourceVersion: z.string().max(128).optional(),
  fileKind: z.string().max(40).optional(), filename: z.string().max(500), excerpt: z.string().max(1_200),
  sourceRef: z.string().max(600), page: z.number().int().positive().optional(), slide: z.number().int().positive().optional(),
  sheet: z.string().max(240).optional(), section: z.string().max(500).optional()
}).strict();

export const AGENT_TOOL_REGISTRY: readonly AgentToolDefinition[] = Object.freeze([
  {
    id: 'search_workspace_documents',
    version: '1.0.0',
    description: 'Search relevant excerpts in ready documents selected for this approved Workspace task.',
    inputSchema: z.object({
      query: z.string().trim().min(2).max(500),
      attachmentIds: z.array(nonEmptyId).max(8).optional(),
      maxResults: z.number().int().min(1).max(5).default(5)
    }).strict(),
    outputSchema: z.object({
      snapshotId: z.string().min(1).max(100),
      results: z.array(z.object({
        ...evidenceResultSchema.shape
      }).strict()).max(5)
    }).strict(),
    executionLocation: 'server', permission: 'read', requiresApproval: false,
    timeoutMs: 15_000, isIdempotent: true,
    allowedTaskTypes: ['research', 'analysis', 'review', 'writing']
  },
  {
    id: 'compare_workspace_documents',
    version: '1.0.0',
    description: 'Gather separately attributed evidence from at least two approved Workspace documents for cross-document comparison. The model must assess agreement, differences, and conflicts from these excerpts.',
    inputSchema: z.object({
      query: z.string().trim().min(2).max(500),
      attachmentIds: z.array(nonEmptyId).min(2).max(8),
      perDocumentLimit: z.number().int().min(1).max(2).default(1)
    }).strict(),
    outputSchema: z.object({
      snapshotId: z.string().min(1).max(100),
      comparisonStatus: z.literal('requires_synthesis'),
      documents: z.array(z.object({ documentId: z.string().max(100), filename: z.string().max(500), sourceVersion: z.string().max(128).optional(), evidenceCitationIds: z.array(z.string().max(100)).max(2) }).strict()).max(8),
      results: z.array(evidenceResultSchema).max(16)
    }).strict(),
    executionLocation: 'server', permission: 'read', requiresApproval: false,
    timeoutMs: 20_000, isIdempotent: true,
    allowedTaskTypes: ['research', 'analysis', 'review', 'writing']
  },
  {
    id: 'verify_claim_support',
    version: '1.0.0',
    description: 'Retrieve approved source excerpts for a claim and report only exact-text support or an explicitly unverified result. This is not semantic proof.',
    inputSchema: z.object({ claim: z.string().trim().min(10).max(1_000), attachmentIds: z.array(nonEmptyId).max(8).optional() }).strict(),
    outputSchema: z.object({
      snapshotId: z.string().min(1).max(100),
      status: z.enum(['supported', 'unverified', 'insufficient_evidence']),
      assessmentMethod: z.enum(['exact_text_match', 'evidence_retrieved_only', 'no_evidence_found']),
      notice: z.string().max(300), results: z.array(evidenceResultSchema).max(5)
    }).strict(),
    executionLocation: 'server', permission: 'read', requiresApproval: false,
    timeoutMs: 15_000, isIdempotent: true,
    allowedTaskTypes: ['research', 'analysis', 'review', 'writing']
  },
  {
    id: 'extract_assignment_guidelines',
    version: '1.0.0',
    description: 'Find literal assignment-format requirements in approved Workspace documents and return each with its source excerpt and location. Interpretations require user confirmation; this tool does not certify compliance.',
    inputSchema: z.object({ attachmentIds: z.array(nonEmptyId).min(1).max(8) }).strict(),
    outputSchema: z.object({
      snapshotId: z.string().min(1).max(100), requiresUserConfirmation: z.literal(true),
      rules: z.array(z.object({
        id: z.string().max(160), type: z.enum(['maximum_pages', 'font_family', 'font_size', 'margin', 'line_spacing', 'minimum_references', 'citation_style', 'required_section', 'required_table', 'cover_page', 'filename']),
        value: z.string().max(120), status: z.enum(['literal_match', 'ambiguous']), citationId: z.string().max(100),
        documentId: z.string().max(100), filename: z.string().max(500), sourceRef: z.string().max(600), excerpt: z.string().max(1_200)
      }).strict()).max(100),
      results: z.array(evidenceResultSchema).max(8),
      notice: z.string().max(400)
    }).strict(),
    executionLocation: 'server', permission: 'read', requiresApproval: false,
    timeoutMs: 20_000, isIdempotent: true,
    allowedTaskTypes: ['research', 'analysis', 'review', 'writing']
  },
  {
    id: 'read_workspace_artifact',
    version: '1.0.0',
    description: 'Read the saved artifact explicitly attached to this approved task.',
    inputSchema: z.object({ artifactId: nonEmptyId }).strict(),
    outputSchema: z.object({
      artifactId: z.string().max(100), title: z.string().max(200), type: z.string().max(40),
      language: z.string().max(80).optional(), version: z.number().int().positive(), content: z.string().max(12_000)
    }).strict(),
    executionLocation: 'server', permission: 'read', requiresApproval: false,
    timeoutMs: 10_000, isIdempotent: true,
    allowedTaskTypes: ['analysis', 'writing', 'coding', 'review', 'transform']
  },
  {
    id: 'inspect_workspace_dataset',
    version: '1.0.0',
    description: 'Inspect schema, row counts, and deterministic column profiles for a selected CSV, TSV, or XLSX attachment.',
    inputSchema: z.object({ attachmentId: nonEmptyId, sheetName: z.string().max(255).optional() }).strict(),
    outputSchema: z.object({
      sourceFileId: z.string().max(100), filename: z.string().max(500), version: z.string().max(128),
      activeSheet: z.string().max(255), sheets: z.array(z.object({ name: z.string().max(255), rowCount: z.number().int().nonnegative(), columnCount: z.number().int().nonnegative(), empty: z.boolean() }).strict()).max(20),
      rowCount: z.number().int().nonnegative(), columnCount: z.number().int().nonnegative(),
      columns: z.array(z.object({ name: z.string().max(255), inferredType: z.string().max(32), missingCount: z.number().int().nonnegative(), uniqueCount: z.number().int().nonnegative(), sampleValues: z.array(z.unknown()).max(5), min: z.union([z.number(), z.string()]).optional(), max: z.union([z.number(), z.string()]).optional(), mean: z.number().optional(), median: z.number().optional() }).strict()).max(60)
    }).strict(),
    executionLocation: 'server', permission: 'read', requiresApproval: false,
    timeoutMs: 20_000, isIdempotent: true,
    allowedTaskTypes: ['analysis', 'transform', 'review']
  },
  {
    id: 'analyze_workspace_dataset',
    version: '1.0.0',
    description: 'Run a deterministic allowlisted aggregation on a selected dataset. This tool never transforms or persists source data.',
    inputSchema: z.object({ attachmentId: nonEmptyId, plan: TabularAnalysisRequestSchema }).strict(),
    outputSchema: z.object({
      datasetId: z.string().max(200), datasetVersion: z.string().max(128), sheetName: z.string().max(255),
      operations: TabularAnalysisRequestSchema, columns: z.array(z.string().max(255)).max(60),
      rows: z.array(z.record(z.string(), z.unknown())).max(100), matchedRowCount: z.number().int().nonnegative(), truncated: z.boolean(),
      provenance: z.object({ sourceFileId: z.string().max(100), filename: z.string().max(500), checksum: z.string().max(128), sheetName: z.string().max(255), computedAt: z.string().max(64) }).strict()
    }).strict(),
    executionLocation: 'server', permission: 'read', requiresApproval: false,
    timeoutMs: 25_000, isIdempotent: true,
    allowedTaskTypes: ['analysis', 'transform']
  },
  {
    id: 'search_web',
    version: '1.0.0',
    description: 'Search the public web for external sources. Returns real titles, URLs and provider snippets only; every result is unverified external material and must be cited with its exact [cite:...] id and its URL. Use only for research tasks that need sources beyond the uploaded files.',
    inputSchema: z.object({
      query: z.string().trim().min(3).max(400),
      maxResults: z.number().int().min(1).max(5).default(5)
    }).strict(),
    outputSchema: z.object({
      provider: z.literal('tavily'),
      retrievedAt: z.string().max(40),
      verificationStatus: z.literal('external_unverified'),
      results: z.array(z.object({
        citationId: z.string().min(1).max(100), documentId: z.string().max(100), filename: z.string().max(300),
        sourceRef: z.string().max(600), url: z.string().max(600), excerpt: z.string().max(900),
        publishedDate: z.string().max(40).optional()
      }).strict()).max(5)
    }).strict(),
    executionLocation: 'server', permission: 'read', requiresApproval: false,
    timeoutMs: 15_000, isIdempotent: true,
    allowedTaskTypes: ['research']
  }
]);

export function getAgentToolDefinition(toolId: string): AgentToolDefinition | undefined {
  return AGENT_TOOL_REGISTRY.find(tool => tool.id === toolId);
}

export function getAllowedAgentToolIds(taskType: AgentTaskType, context: { attachmentIds: string[]; artifactId?: string }): Set<string> {
  const ids = new Set<string>();
  for (const tool of AGENT_TOOL_REGISTRY) {
    if (!tool.allowedTaskTypes.includes(taskType)) continue;
    if (tool.id === 'search_workspace_documents' && context.attachmentIds.length === 0) continue;
    if (tool.id === 'compare_workspace_documents' && context.attachmentIds.length < 2) continue;
    if (tool.id === 'extract_assignment_guidelines' && context.attachmentIds.length === 0) continue;
    if ((tool.id === 'inspect_workspace_dataset' || tool.id === 'analyze_workspace_dataset') && context.attachmentIds.length === 0) continue;
    if (tool.id === 'read_workspace_artifact' && !context.artifactId) continue;
    if (tool.id === 'search_web' && !isWebSearchConfigured()) continue;
    ids.add(tool.id);
  }
  return ids;
}
