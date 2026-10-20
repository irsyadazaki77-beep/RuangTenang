import { createHash } from 'node:crypto';
import { AgentArtifactProposalSchema, AgentExecutionResultSchema, type AgentExecutionEvent, type AgentExecutionResult, type AgentToolResult } from './agentContracts.js';
import { buildAgentTurnContext } from './agentContextBuilder.js';
import { AGENT_EXECUTION_LIMITS, estimateTokens } from './agentExecutionPolicy.js';
import type { WorkspacePlan } from '../../../shared/contracts/workspace.js';
import { getAllowedAgentToolIds } from './agentToolRegistry.js';
import { AgentModelError, estimateAgentDecisionInputTokens, requestAgentDecision } from './agentModelAdapter.js';
import { executeAuthorizedAgentTool } from './agentToolExecutor.js';
import { DEFAULT_KERJA_PROFILE_ID, isAiProfile, isKerjaProfile } from '../../../shared/aiModelContract.js';
import { mapLegacyModelToProfile } from '../ai/aiModelRegistry.js';

export interface AgentExecutionStats {
  modelId: string;
  steps: number;
  toolCalls: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}

export class AgentExecutionError extends Error {
  stats?: AgentExecutionStats;
  sources: AgentExecutionResult['sources'] = [];
  events: AgentExecutionEvent[] = [];
  constructor(public readonly code: string, message: string, public readonly partialOutput = '') {
    super(message); this.name = 'AgentExecutionError';
  }
}

export interface WorkspaceAgentRunInput {
  executionId: string;
  workspaceId: string;
  userId: string;
  userTier: string;
  plan: WorkspacePlan;
  taskId: string;
  abortSignal: AbortSignal;
}

function uniqueSources(results: AgentToolResult[]) {
  const byId = new Map<string, AgentExecutionResult['sources'][number]>();
  for (const result of results) {
    if (result.status !== 'completed' || !['search_workspace_documents', 'compare_workspace_documents', 'verify_claim_support', 'extract_assignment_guidelines', 'search_web'].includes(result.toolId)) continue;
    const data = result.data as { snapshotId?: string; results?: Array<Record<string, unknown>> };
    for (const item of data.results || []) {
      const citationId = typeof item.citationId === 'string' ? item.citationId : '';
      if (!citationId || byId.has(citationId)) continue;
      byId.set(citationId, {
        citationId,
        ...(typeof data.snapshotId === 'string' ? { retrievalSnapshotId: data.snapshotId } : {}),
        documentId: String(item.documentId || ''),
        ...(typeof item.workspaceId === 'string' ? { workspaceId: item.workspaceId } : {}),
        ...(typeof item.checksum === 'string' ? { checksum: item.checksum } : {}),
        ...(typeof item.sourceVersion === 'string' ? { sourceVersion: item.sourceVersion } : {}),
        ...(typeof item.fileKind === 'string' ? { fileKind: item.fileKind as AgentExecutionResult['sources'][number]['fileKind'] } : {}),
        filename: String(item.filename || 'Dokumen'),
        ...(typeof item.url === 'string' ? { url: item.url } : {}),
        ...(typeof item.page === 'number' ? { page: item.page } : {}),
        ...(typeof item.slide === 'number' ? { slide: item.slide } : {}),
        ...(typeof item.sheet === 'string' ? { sheet: item.sheet } : {}),
        ...(typeof item.section === 'string' ? { section: item.section } : {}),
        sourceRef: String(item.sourceRef || item.filename || 'Dokumen'),
        ...(typeof item.excerpt === 'string' ? { snippet: item.excerpt.slice(0, 500) } : {})
      });
    }
  }
  return [...byId.values()].slice(0, 50);
}

function sanitizeCitationMarkers(content: string, sources: AgentExecutionResult['sources']): string {
  const known = new Set(sources.map(source => source.citationId).filter((id): id is string => Boolean(id)));
  return content.replace(/\[cite:([^\]\r\n]{1,100})\]/g, (marker, citationId: string) =>
    known.has(citationId) ? marker : '[citation tidak tersedia]'
  );
}

function discloseToolFailures(content: string, results: AgentToolResult[]): string {
  const failures = [...new Set(results.flatMap(result => result.status === 'failed' ? [result.error.message] : []))];
  if (!failures.length) return content;
  const disclosure = `\n\nBatasan eksekusi: ${failures.join(' ')}`;
  return `${content.slice(0, Math.max(0, 20_000 - disclosure.length))}${disclosure}`;
}

function budgetFailure(results: AgentToolResult[], modelId: string, steps: number, inputTokens: number, outputTokens: number, code: string, message: string): AgentExecutionError {
  const successfulCalls = results.filter(result => result.status === 'completed').length;
  const partial = successfulCalls ? `Eksekusi dihentikan karena ${message.toLocaleLowerCase()}. Hasil tool yang berhasil: ${successfulCalls}. Tinjau bukti yang tersedia sebelum melanjutkan.` : `Eksekusi dihentikan karena ${message.toLocaleLowerCase()}.`;
  const error = new AgentExecutionError(code, message, partial.slice(0, 20_000));
  error.sources = uniqueSources(results);
  error.stats = { modelId, steps, toolCalls: results.length, estimatedInputTokens: inputTokens, estimatedOutputTokens: outputTokens };
  return error;
}

export async function runWorkspaceAgent(input: WorkspaceAgentRunInput): Promise<AgentExecutionResult> {
  const task = input.plan.tasks.find(candidate => candidate.id === input.taskId);
  if (!task || task.status !== 'running' || task.executionId !== input.executionId || !task.snapshot) {
    throw new AgentExecutionError('AGENT_EXECUTION_STALE', 'Task tidak lagi berada dalam eksekusi aktif.');
  }
  const dependencyArtifactIds = new Set(
    input.plan.tasks
      .filter(item => task.dependsOn.includes(item.id) && Boolean(item.outputArtifactId))
      .map(item => item.outputArtifactId as string)
  );
  if (task.snapshot.artifactId) dependencyArtifactIds.add(task.snapshot.artifactId);

  const allowedToolIds = getAllowedAgentToolIds(task.type, {
    attachmentIds: task.snapshot.contextSourceIds,
    artifactId: task.snapshot.artifactId,
    hasDependencyArtifacts: dependencyArtifactIds.size > 0,
    allowExternalSearch: task.snapshot.allowExternalSearch === true
  });
  const sourceNamespace = `AGENT_${input.executionId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) || 'RUN'}`;
  let sourceIndex = 0;
  const results: AgentToolResult[] = [];
  const events: AgentExecutionEvent[] = [];
  const seenCalls = new Set<string>();
  const startedAt = Date.now();
  const requestedModelId = task.snapshot.modelId === 'auto'
    ? DEFAULT_KERJA_PROFILE_ID
    : task.snapshot.modelId;
  const profileId = isAiProfile(requestedModelId)
    ? (isKerjaProfile(requestedModelId) ? requestedModelId : undefined)
    : mapLegacyModelToProfile(requestedModelId, true);
  if (isAiProfile(requestedModelId) && !profileId) {
    throw new AgentExecutionError('AGENT_MODEL_UNAVAILABLE', 'Profil AI tidak sesuai dengan Ruang Kerja.');
  }
  let modelId = profileId || requestedModelId;
  if (!modelId || modelId === 'auto') throw new AgentExecutionError('AGENT_MODEL_UNAVAILABLE', 'Belum ada provider AI yang dikonfigurasi untuk Agent.');
  let steps = 0;
  let toolCalls = 0;
  let estimatedInputTokens = 0;
  let estimatedOutputTokens = 0;

  let workspaceMemories: Array<{ category: string; content: string; provenance?: string | null }> = [];
  try {
    const { WorkspaceMemoryService } = await import('../workspaceMemoryService.js');
    const memoryRes = await WorkspaceMemoryService.getRelevantMemories({
      userId: input.userId,
      workspaceId: input.workspaceId,
      currentMessage: task.snapshot.inputPrompt,
      maxTokens: 400,
      maxItems: 4
    });
    workspaceMemories = memoryRes.memories.map(m => ({
      category: m.category,
      content: m.content,
      provenance: m.provenance
    }));
  } catch (err) {
    // Non-blocking fallback if memory retrieval fails
  }

  try {
  for (let step = 0; step < AGENT_EXECUTION_LIMITS.maxSteps; step += 1) {
    if (input.abortSignal.aborted) throw new AgentExecutionError('AGENT_CANCELLED', 'Eksekusi dihentikan.');
    if (Date.now() - startedAt >= AGENT_EXECUTION_LIMITS.maxDurationMs) {
      throw budgetFailure(results, modelId, steps, estimatedInputTokens, estimatedOutputTokens, 'AGENT_BUDGET_EXHAUSTED', 'batas durasi Agent tercapai');
    }
    const context = buildAgentTurnContext({ plan: input.plan, task, workspaceId: input.workspaceId, userId: input.userId, recentResults: results, workspaceMemories });
    const prompt = JSON.stringify({
      step: step + 1,
      maxSteps: AGENT_EXECUTION_LIMITS.maxSteps,
      remainingToolCalls: AGENT_EXECUTION_LIMITS.maxToolCalls - toolCalls,
      context
    });
    const turnTokens = estimateAgentDecisionInputTokens(prompt, allowedToolIds);
    if (turnTokens > AGENT_EXECUTION_LIMITS.maxInputTokens || estimatedInputTokens + estimatedOutputTokens + turnTokens + AGENT_EXECUTION_LIMITS.maxOutputTokens > AGENT_EXECUTION_LIMITS.maxTotalTokens) {
      throw budgetFailure(results, modelId, steps, estimatedInputTokens, estimatedOutputTokens, 'AGENT_BUDGET_EXHAUSTED', 'batas token Agent tercapai');
    }

    const decisionController = new AbortController();
    const abortParent = () => decisionController.abort();
    input.abortSignal.addEventListener('abort', abortParent, { once: true });
    const timeoutId = setTimeout(() => decisionController.abort(), Math.min(AGENT_EXECUTION_LIMITS.modelCallTimeoutMs, AGENT_EXECUTION_LIMITS.maxDurationMs - (Date.now() - startedAt)));
    let modelDecision;
    const modelCallStartedAt = Date.now();
    steps += 1;
    estimatedInputTokens += turnTokens;
    try {
      modelDecision = await requestAgentDecision({
        userId: input.userId, userTier: input.userTier, requestedModelId: profileId || modelId,
        prompt, allowedToolIds, abortSignal: decisionController.signal
      });
    } catch (error) {
      events.push({ step: steps, kind: 'model_decision', status: input.abortSignal.aborted ? 'cancelled' : 'failed', durationMs: Date.now() - modelCallStartedAt, errorCode: error instanceof AgentModelError ? error.code : decisionController.signal.aborted ? 'AGENT_MODEL_TIMEOUT' : 'AGENT_MODEL_FAILED' });
      if (input.abortSignal.aborted) throw new AgentExecutionError('AGENT_CANCELLED', 'Eksekusi dihentikan.');
      if (decisionController.signal.aborted) throw new AgentExecutionError('AGENT_MODEL_TIMEOUT', 'Model melebihi batas waktu Agent.');
      if (error instanceof AgentModelError) throw new AgentExecutionError(error.code, error.message);
      throw new AgentExecutionError('AGENT_MODEL_FAILED', 'Model tidak dapat menyelesaikan keputusan Agent.');
    } finally {
      clearTimeout(timeoutId);
      input.abortSignal.removeEventListener('abort', abortParent);
    }
    events.push({ step: steps, kind: 'model_decision', status: 'completed', durationMs: Date.now() - modelCallStartedAt });
    modelId = modelDecision.modelId;
    const decisionOutputTokens = estimateTokens(modelDecision.rawOutput);
    estimatedOutputTokens += decisionOutputTokens;
    if (decisionOutputTokens > AGENT_EXECUTION_LIMITS.maxOutputTokens || estimatedInputTokens + estimatedOutputTokens > AGENT_EXECUTION_LIMITS.maxTotalTokens) {
      throw budgetFailure(results, modelId, steps, estimatedInputTokens, estimatedOutputTokens, 'AGENT_BUDGET_EXHAUSTED', 'batas token Agent tercapai');
    }

    const decision = modelDecision.decision;
    if (decision.type === 'final') {
      const sources = uniqueSources(results);
      const artifactProposal = decision.artifactProposal
        ? AgentArtifactProposalSchema.parse({ ...decision.artifactProposal, content: sanitizeCitationMarkers(decision.artifactProposal.content, sources) })
        : undefined;
      const output = sanitizeCitationMarkers(discloseToolFailures(decision.content, results), sources).slice(0, 20_000);
      return AgentExecutionResultSchema.parse({
        executionId: input.executionId, status: 'completed', output, sources,
        ...(artifactProposal ? { artifactProposal } : {}), modelId, steps, toolCalls, events,
        estimatedInputTokens, estimatedOutputTokens
      });
    }

    if (!allowedToolIds.has(decision.toolId)) {
      throw new AgentExecutionError('AGENT_TOOL_NOT_ALLOWED', 'Model meminta tool yang tidak diizinkan untuk task ini.');
    }
    if (toolCalls >= AGENT_EXECUTION_LIMITS.maxToolCalls) {
      throw budgetFailure(results, modelId, steps, estimatedInputTokens, estimatedOutputTokens, 'AGENT_BUDGET_EXHAUSTED', 'batas jumlah tool call Agent tercapai');
    }
    const fingerprint = createHash('sha256').update(JSON.stringify([decision.toolId, decision.arguments])).digest('hex');
    if (seenCalls.has(fingerprint)) throw new AgentExecutionError('AGENT_LOOP_DETECTED', 'Model mengulang tool call dengan argumen yang sama.');
    seenCalls.add(fingerprint);
    if (input.abortSignal.aborted) throw new AgentExecutionError('AGENT_CANCELLED', 'Eksekusi dihentikan.');
    toolCalls += 1;
    const result = await executeAuthorizedAgentTool(decision.toolId, decision.arguments, {
      executionId: input.executionId, workspaceId: input.workspaceId, userId: input.userId, task,
      allowedToolIds, allowedArtifactIds: dependencyArtifactIds, abortSignal: input.abortSignal, sourceNamespace,
      nextSourceIndex: () => ++sourceIndex
    });
    results.push(result);
    events.push({ step: steps, kind: 'tool', toolCallId: result.toolCallId, toolId: result.toolId, status: result.status, durationMs: result.durationMs, ...(result.status !== 'completed' ? { errorCode: result.error.code } : {}) });
    if (result.status === 'cancelled' || input.abortSignal.aborted) throw new AgentExecutionError('AGENT_CANCELLED', 'Eksekusi dihentikan.');
    if (result.status === 'failed' && result.error.code === 'TOOL_NOT_ALLOWED') {
      throw new AgentExecutionError('AGENT_TOOL_NOT_ALLOWED', result.error.message);
    }
  }

  throw budgetFailure(results, modelId, steps, estimatedInputTokens, estimatedOutputTokens, 'AGENT_BUDGET_EXHAUSTED', 'batas langkah Agent tercapai');
  } catch (error) {
    if (error instanceof AgentExecutionError) {
      error.stats ||= { modelId, steps, toolCalls, estimatedInputTokens, estimatedOutputTokens };
      error.sources = uniqueSources(results);
      error.events = events;
      throw error;
    }
    const wrapped = new AgentExecutionError('AGENT_EXECUTION_FAILED', 'Agent tidak dapat menyelesaikan task ini.');
    wrapped.stats = { modelId, steps, toolCalls, estimatedInputTokens, estimatedOutputTokens };
    wrapped.sources = uniqueSources(results);
    wrapped.events = events;
    throw wrapped;
  }
}
