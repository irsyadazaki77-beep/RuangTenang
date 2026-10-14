import { randomUUID } from 'node:crypto';
import { prisma } from '../../database.js';
import { encryptionService } from '../encryptionService.js';
import { contextRetrievalService } from '../file-intelligence/contextRetrievalService.js';
import { verifyClaimsAgainstEvidence } from '../file-intelligence/claimVerificationService.js';
import { extractAssignmentGuidelineRules } from '../file-intelligence/guidelineExtractionService.js';
import { scanAndSanitizePII } from '../piiService.js';
import { attachmentStorageService } from '../attachmentStorageService.js';
import { searchWeb, webCitationDocumentId } from '../webSearchService.js';
import { createTabularDataset, parseTabularWorkbook, runTabularAnalysis } from '../tabularDatasetService.js';
import type { WorkspacePlan } from '../../../shared/contracts/workspace.js';
import { AGENT_EXECUTION_LIMITS } from './agentExecutionPolicy.js';
import { AgentToolResultSchema, type AgentToolResult } from './agentContracts.js';
import { getAgentToolDefinition } from './agentToolRegistry.js';

export interface AgentToolExecutionContext {
  executionId: string;
  workspaceId: string;
  userId: string;
  task: WorkspacePlan['tasks'][number];
  allowedToolIds: ReadonlySet<string>;
  abortSignal: AbortSignal;
  sourceNamespace: string;
  nextSourceIndex: () => number;
}

function safeString(value: unknown): unknown {
  return typeof value === 'string' ? scanAndSanitizePII(value).sanitizedText : value;
}

function sanitizeStructured(value: unknown): unknown {
  if (typeof value === 'string') return safeString(value);
  if (Array.isArray(value)) return value.map(sanitizeStructured);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, sanitizeStructured(item)]));
  }
  return value;
}

async function readSelectedDataset(attachmentId: string, context: AgentToolExecutionContext) {
  if (!context.task.snapshot?.contextSourceIds.includes(attachmentId)) throw new Error('SOURCE_NOT_ALLOWED');
  let loaded: Awaited<ReturnType<typeof attachmentStorageService.getAttachmentForUser>>;
  try { loaded = await attachmentStorageService.getAttachmentForUser(attachmentId, context.userId, false); }
  catch { throw new Error('SOURCE_NOT_FOUND'); }
  if (!loaded || loaded.attachment.chatId !== context.workspaceId || loaded.attachment.status !== 'ready') {
    loaded?.buffer.fill(0);
    throw new Error('SOURCE_NOT_FOUND');
  }
  if (!['csv', 'tsv', 'xlsx'].includes((loaded.attachment.filename.split('.').pop() || '').toLowerCase())) {
    loaded.buffer.fill(0);
    throw new Error('UNSUPPORTED_DATASET');
  }
  try {
    const workbook = await parseTabularWorkbook(loaded.buffer, loaded.attachment.filename);
    return { ...loaded, workbook };
  } catch {
    loaded.buffer.fill(0);
    throw new Error('DATASET_READ_FAILED');
  }
}

function mapRetrievedEvidence(retrieval: Awaited<ReturnType<typeof contextRetrievalService.retrieveContext>>, context: AgentToolExecutionContext, maxExcerptLength: number) {
  return retrieval.chunksSelected.map((chunk, index) => {
    const source = retrieval.sourceReferences[index];
    return {
      citationId: `${context.sourceNamespace}_SRC_${context.nextSourceIndex()}`,
      documentId: source.documentId,
      ...(source.workspaceId ? { workspaceId: source.workspaceId } : {}),
      ...(source.checksum ? { checksum: source.checksum } : {}),
      ...(source.sourceVersion ? { sourceVersion: source.sourceVersion } : {}),
      ...(source.fileKind ? { fileKind: source.fileKind } : {}),
      filename: scanAndSanitizePII(source.filename).sanitizedText,
      excerpt: scanAndSanitizePII(chunk.text).sanitizedText.slice(0, maxExcerptLength),
      sourceRef: scanAndSanitizePII(source.sourceRef).sanitizedText,
      ...(source.page ? { page: source.page } : {}),
      ...(source.slide ? { slide: source.slide } : {}),
      ...(source.sheet ? { sheet: scanAndSanitizePII(source.sheet).sanitizedText } : {}),
      ...(source.section ? { section: scanAndSanitizePII(source.section).sanitizedText } : {})
    };
  });
}

async function executeRegisteredTool(toolId: string, input: unknown, context: AgentToolExecutionContext): Promise<unknown> {
  if (toolId === 'search_workspace_documents') {
    const args = input as { query: string; attachmentIds?: string[]; maxResults: number };
    const allowedIds = context.task.snapshot?.contextSourceIds || [];
    const attachmentIds = args.attachmentIds ?? allowedIds;
    if (attachmentIds.some(id => !allowedIds.includes(id))) throw new Error('SOURCE_NOT_ALLOWED');
    const retrieval = await contextRetrievalService.retrieveContext({
      userId: context.userId,
      chatId: context.workspaceId,
      attachmentIds,
      userQuery: args.query,
      maxTokens: Math.min(2_500, AGENT_EXECUTION_LIMITS.maxToolOutputChars / 4),
      maxChunks: args.maxResults
    });
    const results = mapRetrievedEvidence(retrieval, context, 1_200);
    return { snapshotId: retrieval.snapshot.id, results };
  }

  if (toolId === 'compare_workspace_documents') {
    const args = input as { query: string; attachmentIds: string[]; perDocumentLimit: number };
    const allowedIds = context.task.snapshot?.contextSourceIds || [];
    if (args.attachmentIds.length < 2 || args.attachmentIds.some(id => !allowedIds.includes(id))) throw new Error('SOURCE_NOT_ALLOWED');
    const retrieval = await contextRetrievalService.retrieveContext({
      userId: context.userId, chatId: context.workspaceId, attachmentIds: args.attachmentIds,
      userQuery: args.query, maxTokens: 1_600, maxChunks: Math.min(16, args.attachmentIds.length * args.perDocumentLimit)
    });
    const results = mapRetrievedEvidence(retrieval, context, 600);
    const grouped = new Map<string, typeof results>();
    for (const item of results) grouped.set(item.documentId, [...(grouped.get(item.documentId) || []), item]);
    return {
      snapshotId: retrieval.snapshot.id,
      comparisonStatus: 'requires_synthesis',
      documents: [...grouped.entries()].map(([documentId, evidence]) => ({
        documentId, filename: evidence[0].filename, ...(evidence[0].sourceVersion ? { sourceVersion: evidence[0].sourceVersion } : {}),
        evidenceCitationIds: evidence.slice(0, 2).map(item => item.citationId)
      })),
      results
    };
  }

  if (toolId === 'verify_claim_support') {
    const args = input as { claim: string; attachmentIds?: string[] };
    const allowedIds = context.task.snapshot?.contextSourceIds || [];
    const attachmentIds = args.attachmentIds ?? allowedIds;
    if (attachmentIds.some(id => !allowedIds.includes(id))) throw new Error('SOURCE_NOT_ALLOWED');
    const retrieval = await contextRetrievalService.retrieveContext({
      userId: context.userId, chatId: context.workspaceId, attachmentIds,
      userQuery: args.claim, maxTokens: 1_200, maxChunks: 5
    });
    const results = mapRetrievedEvidence(retrieval, context, 1_000);
    const verification = results.length
      ? verifyClaimsAgainstEvidence(`${args.claim} [cite:${results[0].citationId}]`, results.map(item => ({
        citationId: item.citationId, documentId: item.documentId, filename: item.filename, sourceRef: item.sourceRef, snippet: item.excerpt
      })))
      : undefined;
    const verifiedClaim = verification?.claims[0];
    const exactMatch = verifiedClaim?.verificationStatus === 'supported';
    return {
      snapshotId: retrieval.snapshot.id,
      status: exactMatch ? 'supported' : results.length ? 'unverified' : 'insufficient_evidence',
      assessmentMethod: exactMatch ? 'exact_text_match' : results.length ? 'evidence_retrieved_only' : 'no_evidence_found',
      notice: exactMatch
        ? 'Teks klaim ditemukan verbatim dalam excerpt sumber; kecocokan literal tidak memverifikasi kebenaran sumber.'
        : results.length
          ? 'Evidence relevan ditemukan, tetapi kecocokan literal penuh tidak ditemukan. Dukungan semantik belum dinilai.'
          : 'Tidak ada evidence yang dapat diambil dari sumber terpilih untuk klaim ini.',
      results
    };
  }

  if (toolId === 'extract_assignment_guidelines') {
    const args = input as { attachmentIds: string[] };
    const allowedIds = context.task.snapshot?.contextSourceIds || [];
    if (args.attachmentIds.some(id => !allowedIds.includes(id))) throw new Error('SOURCE_NOT_ALLOWED');
    const retrieval = await contextRetrievalService.retrieveContext({
      userId: context.userId, chatId: context.workspaceId, attachmentIds: args.attachmentIds,
      userQuery: 'persyaratan format tugas maksimal halaman margin font ukuran spasi referensi APA IEEE bab abstrak tabel sampul nama file',
      maxTokens: 1_500, maxChunks: 6
    });
    const results = mapRetrievedEvidence(retrieval, context, 500);
    const allRules = extractAssignmentGuidelineRules(results);
    const rules = allRules.slice(0, 12);
    const notice = rules.length
      ? `Ditemukan ${allRules.length} kandidat aturan dari kutipan literal. Tinjau kutipan dan konfirmasi interpretasi sebelum memformat atau menilai kepatuhan.${allRules.length > rules.length ? ' Keluaran dibatasi pada 12 aturan pertama.' : ''}`
      : 'Tidak ada pola aturan eksplisit yang terdeteksi pada excerpt yang diambil. Buka dan tinjau panduan lengkap; ini bukan bukti bahwa panduan tidak memuat aturan.';
    return { snapshotId: retrieval.snapshot.id, requiresUserConfirmation: true, rules, results, notice };
  }

  if (toolId === 'read_workspace_artifact') {
    const args = input as { artifactId: string };
    if (!context.task.snapshot?.artifactId || args.artifactId !== context.task.snapshot.artifactId) throw new Error('ARTIFACT_NOT_ALLOWED');
    const artifact = await prisma.artifacts.findFirst({
      where: { id: args.artifactId, chatId: context.workspaceId, userId: context.userId },
      select: { id: true, title: true, type: true, language: true, version: true, content: true }
    });
    if (!artifact) throw new Error('ARTIFACT_NOT_FOUND');
    let content: string | null;
    try { content = encryptionService.decryptSensitive(artifact.content); }
    catch { throw new Error('ARTIFACT_READ_FAILED'); }
    if (content == null || (encryptionService.isEncrypted(artifact.content) && encryptionService.isEncrypted(content))) throw new Error('ARTIFACT_READ_FAILED');
    return {
      artifactId: artifact.id,
      title: safeString(artifact.title),
      type: artifact.type,
      ...(artifact.language ? { language: artifact.language } : {}),
      version: artifact.version,
      content: scanAndSanitizePII(content.slice(0, 12_000)).sanitizedText
    };
  }

  if (toolId === 'inspect_workspace_dataset') {
    const args = input as { attachmentId: string; sheetName?: string };
    const loaded = await readSelectedDataset(args.attachmentId, context);
    try {
      const dataset = createTabularDataset({
        attachmentId: loaded.attachment.id, workspaceId: context.workspaceId,
        filename: loaded.attachment.filename, checksum: loaded.attachment.checksum || '',
        createdAt: loaded.attachment.createdAt, workbook: loaded.workbook, sheetName: args.sheetName
      });
      return sanitizeStructured({
        sourceFileId: dataset.sourceFileId, filename: dataset.name, version: dataset.version,
        activeSheet: dataset.activeSheet, sheets: dataset.sheets,
        rowCount: dataset.rowCount, columnCount: dataset.columnCount,
        columns: dataset.columns.map(column => ({
          name: column.name, inferredType: column.inferredType, missingCount: column.missingCount,
          uniqueCount: column.uniqueCount, sampleValues: column.sampleValues.slice(0, 5),
          ...(column.min !== undefined ? { min: column.min } : {}),
          ...(column.max !== undefined ? { max: column.max } : {}),
          ...(column.mean !== undefined ? { mean: column.mean } : {}),
          ...(column.median !== undefined ? { median: column.median } : {})
        }))
      });
    } finally { loaded.buffer.fill(0); }
  }

  if (toolId === 'analyze_workspace_dataset') {
    const args = input as { attachmentId: string; plan: Parameters<typeof runTabularAnalysis>[0]['plan'] };
    const loaded = await readSelectedDataset(args.attachmentId, context);
    try {
      const analysis = runTabularAnalysis({
        attachmentId: loaded.attachment.id, filename: loaded.attachment.filename,
        checksum: loaded.attachment.checksum || '', createdAt: loaded.attachment.createdAt,
        workbook: loaded.workbook, plan: { ...args.plan, limit: Math.min(args.plan.limit, 100) }
      });
      return sanitizeStructured(analysis);
    } finally { loaded.buffer.fill(0); }
  }

  if (toolId === 'search_web') {
    const args = input as { query: string; maxResults: number };
    const found = await searchWeb(args.query, { maxResults: args.maxResults, signal: context.abortSignal });
    return {
      provider: 'tavily', retrievedAt: new Date().toISOString(), verificationStatus: 'external_unverified',
      results: found.map(item => ({
        citationId: `${context.sourceNamespace}_SRC_${context.nextSourceIndex()}`,
        documentId: webCitationDocumentId(item.url),
        filename: scanAndSanitizePII(item.title).sanitizedText.slice(0, 300),
        sourceRef: item.url, url: item.url,
        excerpt: scanAndSanitizePII(item.excerpt).sanitizedText.slice(0, 900),
        ...(item.publishedDate ? { publishedDate: item.publishedDate } : {})
      }))
    };
  }

  throw new Error('TOOL_NOT_FOUND');
}

function safeToolError(error: unknown): { code: string; message: string } {
  const code = error instanceof Error ? error.message : 'TOOL_EXECUTION_FAILED';
  const safeMessages: Record<string, string> = {
    SOURCE_NOT_ALLOWED: 'Sumber tersebut tidak termasuk dalam file yang disetujui untuk task ini.',
    SOURCE_NOT_FOUND: 'Dokumen yang diminta tidak tersedia untuk task ini.',
    UNSUPPORTED_DATASET: 'Jenis berkas tidak didukung oleh analisis tabular.',
    DATASET_READ_FAILED: 'Dataset tidak dapat dibaca.',
    ARTIFACT_NOT_ALLOWED: 'Artifact tersebut tidak termasuk dalam konteks task ini.',
    ARTIFACT_NOT_FOUND: 'Artifact tidak tersedia untuk task ini.',
    ARTIFACT_READ_FAILED: 'Isi artifact tidak dapat dibaca.',
    TOOL_NOT_FOUND: 'Tool tidak tersedia.',
    TOOL_OUTPUT_INVALID: 'Hasil tool tidak lolos validasi.',
    TOOL_OUTPUT_TOO_LARGE: 'Hasil tool melebihi batas ukuran.',
    TOOL_TIMEOUT: 'Batas waktu eksekusi tool tercapai.',
    WEB_SEARCH_NOT_CONFIGURED: 'Pencarian web belum dikonfigurasi.',
    WEB_SEARCH_FAILED: 'Pencarian web gagal; tidak ada sumber eksternal yang digunakan.',
    WEB_SEARCH_TIMEOUT: 'Pencarian web melebihi batas waktu; tidak ada sumber eksternal yang digunakan.'
  };
  return { code: safeMessages[code] ? code : 'TOOL_EXECUTION_FAILED', message: safeMessages[code] || 'Tool gagal dijalankan.' };
}

function isRetryableToolError(error: unknown): boolean {
  // Retry only transient failures from idempotent external research. Missing
  // sources, invalid input, timeouts, and deterministic parser failures fail closed.
  return error instanceof Error && error.message === 'WEB_SEARCH_FAILED';
}

function waitForRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error('ABORTED'));
    const timeoutId = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, delayMs);
    const onAbort = () => { clearTimeout(timeoutId); signal.removeEventListener('abort', onAbort); reject(new Error('ABORTED')); };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export async function executeAuthorizedAgentTool(
  toolId: string,
  rawArguments: unknown,
  context: AgentToolExecutionContext
): Promise<AgentToolResult> {
  const toolCallId = randomUUID();
  const startedAt = Date.now();
  const definition = getAgentToolDefinition(toolId);
  if (!definition || !context.allowedToolIds.has(toolId) || definition.permission !== 'read' || definition.requiresApproval) {
    const result = AgentToolResultSchema.parse({ executionId: context.executionId, toolCallId, toolId, status: 'failed', error: { code: 'TOOL_NOT_ALLOWED', message: 'Tool tidak diizinkan untuk task ini.' }, durationMs: 0 });
    console.info('[WORKSPACE_AGENT_TOOL]', JSON.stringify({ executionId: context.executionId, toolCallId, toolId, status: 'failed', durationMs: 0, errorCode: 'TOOL_NOT_ALLOWED' }));
    return result;
  }

  const parsed = definition.inputSchema.safeParse(rawArguments);
  if (!parsed.success) {
    const result = AgentToolResultSchema.parse({ executionId: context.executionId, toolCallId, toolId, status: 'failed', error: { code: 'INVALID_TOOL_INPUT', message: 'Argumen tool tidak sesuai schema.' }, durationMs: Date.now() - startedAt });
    console.info('[WORKSPACE_AGENT_TOOL]', JSON.stringify({ executionId: context.executionId, toolCallId, toolId, status: 'failed', durationMs: result.durationMs, errorCode: 'INVALID_TOOL_INPUT' }));
    return result;
  }
  if (context.abortSignal.aborted) {
    return AgentToolResultSchema.parse({ executionId: context.executionId, toolCallId, toolId, status: 'cancelled', error: { code: 'ABORTED', message: 'Eksekusi dihentikan.' }, durationMs: Date.now() - startedAt });
  }

  // Create scoped abort controller linked to parent abortSignal and tool timeout
  const toolAbortController = new AbortController();
  const onParentAbort = () => toolAbortController.abort();
  if (context.abortSignal.aborted) {
    toolAbortController.abort();
  } else {
    context.abortSignal.addEventListener('abort', onParentAbort, { once: true });
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const scopedContext: AgentToolExecutionContext = {
    ...context,
    abortSignal: toolAbortController.signal
  };

  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        toolAbortController.abort();
        reject(new Error('TOOL_TIMEOUT'));
      }, definition.timeoutMs);
    });

    const executeWithRetry = async () => {
      for (let attempt = 0; ; attempt += 1) {
        try { return await executeRegisteredTool(toolId, parsed.data, scopedContext); }
        catch (error) {
          if (!definition.isIdempotent || attempt >= AGENT_EXECUTION_LIMITS.maxToolRetries || !isRetryableToolError(error)) throw error;
          await waitForRetry(AGENT_EXECUTION_LIMITS.toolRetryBaseDelayMs * (2 ** attempt), toolAbortController.signal);
        }
      }
    };
    const data = await Promise.race([executeWithRetry(), timeout]);
    const outputValidation = definition.outputSchema.safeParse(data);
    if (!outputValidation.success) throw new Error('TOOL_OUTPUT_INVALID');
    const serialized = JSON.stringify(outputValidation.data);
    if (serialized.length > AGENT_EXECUTION_LIMITS.maxToolOutputChars) throw new Error('TOOL_OUTPUT_TOO_LARGE');
    if (context.abortSignal.aborted || toolAbortController.signal.aborted) {
      return AgentToolResultSchema.parse({ executionId: context.executionId, toolCallId, toolId, status: 'cancelled', error: { code: 'ABORTED', message: 'Eksekusi dihentikan.' }, durationMs: Date.now() - startedAt });
    }
    const result = AgentToolResultSchema.parse({ executionId: context.executionId, toolCallId, toolId, status: 'completed', data: outputValidation.data, durationMs: Date.now() - startedAt });
    console.info('[WORKSPACE_AGENT_TOOL]', JSON.stringify({ executionId: context.executionId, toolCallId, toolId, status: 'completed', durationMs: result.durationMs }));
    return result;
  } catch (error) {
    const isCancelled = context.abortSignal.aborted || (error instanceof Error && error.message === 'ABORTED');
    const safe = safeToolError(error);
    const result = AgentToolResultSchema.parse({ executionId: context.executionId, toolCallId, toolId, status: isCancelled ? 'cancelled' : 'failed', error: isCancelled ? { code: 'ABORTED', message: 'Eksekusi dihentikan.' } : safe, durationMs: Date.now() - startedAt });
    console.info('[WORKSPACE_AGENT_TOOL]', JSON.stringify({ executionId: context.executionId, toolCallId, toolId, status: result.status, durationMs: result.durationMs, errorCode: result.status === 'failed' ? result.error.code : 'ABORTED' }));
    return result;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    context.abortSignal.removeEventListener('abort', onParentAbort);
  }
}
