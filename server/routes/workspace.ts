import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import {
  CreateWorkspaceSchema,
  CreateWorkspaceTaskSchema,
  UpdateWorkspaceSchema,
  UpdateWorkspaceTaskSchema,
  WorkspacePlanSchema,
  WorkspacePlanTransitionRequestSchema,
  WorkspacePlanReviewRequestSchema,
  WorkspaceTaskModelRequestSchema,
  WorkspaceTaskExecutionRequestSchema,
  WorkspaceAgentExecutionRequestSchema,
  WorkspaceTaskExecutionResultRequestSchema,
  type WorkspacePlan
} from '../../shared/contracts/workspace.js';
import {
  CreateWorkspaceMemorySchema,
  UpdateWorkspaceMemorySchema
} from '../../shared/contracts/workspaceMemory.js';
import { ResearchSourceMetadataSchema } from '../../shared/contracts/files.js';
import { prisma } from '../database.js';
import { requireAuth } from '../middleware/auth.js';
import { encryptionService } from '../services/encryptionService.js';
import { sanitizeInput } from '../security.js';
import { aiChatLimiter } from '../middleware/rateLimiters.js';
import { WorkspaceMemoryService } from '../services/workspaceMemoryService.js';
import {
  backfillLegacyPlan,
  cancelWorkspaceTaskExecution,
  createWorkspacePlan,
  findWorkspacePlan,
  finishWorkspaceTask,
  linkWorkspaceTaskArtifact,
  recoverWorkspaceTask,
  reviewWorkspaceTask,
  startWorkspaceTask,
  setWorkspaceTaskModel,
  transitionWorkspacePlan,
  updateDraftPlan,
  WorkspaceWorkflowError,
  claimWorkspaceTaskAgentExecution,
} from '../services/workspaceWorkflowService.js';
import { runWorkspaceAgent, AgentExecutionError } from '../services/agent/agentOrchestrator.js';
import { AgentExecutionResultSchema } from '../services/agent/agentContracts.js';

const router = Router();
router.use(requireAuth);

function decrypt(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  return encryptionService.decryptSensitive(value) || value;
}

type WorkspaceSettings = Record<string, any>;

function parseWorkspaceSettings(raw: string | null | undefined): WorkspaceSettings {
  try {
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

/** Agent plans contain prompts, document excerpts, instructions and generated output. Keep
 * the existing JSON column for compatibility, but encrypt this private subdocument at rest.
 * Legacy plaintext plans remain readable and are upgraded the next time they are saved. */
function readAgentWorkflow(settings: WorkspaceSettings): any {
  const stored = settings.agentWorkflow;
  if (stored?.storage === 'encrypted-v1' && typeof stored.payload === 'string') {
    const plaintext = encryptionService.decryptSensitive(stored.payload);
    if (!plaintext || encryptionService.isEncrypted(plaintext)) throw new Error('WORKSPACE_PLAN_DECRYPT_FAILED');
    return JSON.parse(plaintext);
  }
  return stored;
}

function storeAgentWorkflow(settings: WorkspaceSettings, workflow: unknown): void {
  const plaintext = JSON.stringify(workflow);
  if (plaintext.length > 900_000) throw new Error('WORKSPACE_PLAN_TOO_LARGE');
  const payload = encryptionService.encryptRequiredSensitive(plaintext);
  settings.agentWorkflow = { storage: 'encrypted-v1', payload };
}

function workspaceDto(row: any, includePlanDetails = true, authoritativePlan?: WorkspacePlan | null) {
  const settings = parseWorkspaceSettings(row.settings);
  let workflow: any;
  try { workflow = readAgentWorkflow(settings); } catch { workflow = undefined; }
  // Never return the encrypted execution blob or malformed sensitive state to clients.
  if (settings.agentWorkflow?.storage === 'encrypted-v1') {
    if (workflow) settings.agentWorkflow = workflow;
    else delete settings.agentWorkflow;
  }
  if (authoritativePlan !== undefined) delete settings.agentWorkflow;
  const planCandidate = (workflow as { plan?: unknown } | undefined)?.plan;
  const parsedPlan = WorkspacePlanSchema.safeParse(planCandidate);
  const plan = authoritativePlan !== undefined ? authoritativePlan : parsedPlan.success ? parsedPlan.data : null;
  const relationalSummary = row.workflowPlanSummary;
  return {
    id: row.chatId,
    chatId: row.chatId,
    name: decrypt(row.chat?.title) || 'Workspace baru',
    isPinned: Boolean(row.chat?.isPinned),
    isArchived: Boolean(row.chat?.isArchived),
    description: decrypt(row.description),
    instructions: decrypt(row.instructions),
    defaultModel: row.defaultModel || null,
    defaultPreset: row.defaultPreset || null,
    settings,
    plan: includePlanDetails ? plan : null,
    planSummary: relationalSummary || (plan ? { id: plan.id, title: plan.title, status: plan.status, taskCount: plan.tasks.length, completedCount: plan.tasks.filter(task => task.status === 'done').length } : null),
    createdAt: row.createdAt.toISOString(),
    updatedAt: (row.chat?.updatedAt || row.updatedAt).toISOString(),
    tasks: (row.tasks || []).map((task: any) => ({
      id: task.id,
      workspaceId: task.workspaceId,
      title: decrypt(task.title) || '',
      status: task.status,
      source: task.source,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    }))
  };
}

async function ownedWorkspace(chatId: string, userId: string, ensureLegacy = false) {
  const chat = await prisma.chats.findFirst({ where: { id: chatId, userId } });
  if (!chat) return null;
  let workspace = await prisma.workspaces.findUnique({ where: { chatId }, include: { chat: true, tasks: { orderBy: { createdAt: 'asc' } } } });
  if (!workspace && ensureLegacy) {
    await prisma.chats.update({ where: { id: chatId }, data: { workspaceMode: 'RUANG_KERJA' } });
    await prisma.workspaces.create({ data: { chatId } });
    workspace = await prisma.workspaces.findUnique({ where: { chatId }, include: { chat: true, tasks: { orderBy: { createdAt: 'asc' } } } });
  }
  return workspace ? { ...workspace, chat } : null;
}

async function ensureLegacyWorkflowEncrypted(workspace: any, userId: string) {
  let current = workspace;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const settings = parseWorkspaceSettings(current.settings);
    const workflow = readAgentWorkflow(settings);
    if (!workflow || settings.agentWorkflow?.storage === 'encrypted-v1') return { row: current, settings, workflow };
    const encryptedSettings = { ...settings };
    storeAgentWorkflow(encryptedSettings, workflow);
    const encryptedRaw = JSON.stringify(encryptedSettings);
    const saved = await prisma.workspaces.updateMany({ where: { chatId: current.chatId, settings: current.settings }, data: { settings: encryptedRaw } });
    if (saved.count) return { row: { ...current, settings: encryptedRaw }, settings: encryptedSettings, workflow };
    const fresh = await ownedWorkspace(current.chatId, userId, false);
    if (!fresh) throw new WorkspaceWorkflowError('WORKSPACE_NOT_FOUND', 404);
    current = fresh;
  }
  throw new WorkspaceWorkflowError('WORKSPACE_SETTINGS_CONFLICT');
}

async function currentWorkspacePlan(workspace: any, userId: string): Promise<WorkspacePlan | null> {
  const state = await ensureLegacyWorkflowEncrypted(workspace, userId);
  const relational = await findWorkspacePlan(state.row.chatId, userId);
  if (relational) return relational;
  const legacy = state.workflow?.plan;
  return legacy ? backfillLegacyPlan(state.row.chatId, userId, legacy) : null;
}

function sendWorkflowError(res: Response, error: unknown, fallbackCode: string, fallbackMessage: string) {
  if (error instanceof WorkspaceWorkflowError) {
    const messages: Record<string, string> = {
      WORKSPACE_PLAN_ACTIVE: 'Selesaikan atau batalkan plan aktif sebelum membuat plan baru.',
      WORKSPACE_PLAN_CREATE_INVALID: 'Plan baru harus berupa draft dan task-nya harus belum dijalankan.',
      WORKSPACE_PLAN_CONFLICT: 'Plan berubah di sesi lain. Muat ulang sebelum menyimpan.',
      WORKSPACE_PLAN_COMMAND_REQUIRED: 'Gunakan tindakan plan yang tersedia untuk mengubah status.',
      WORKSPACE_PLAN_TRANSITION_INVALID: 'Perubahan status plan tidak diizinkan.',
      WORKSPACE_TASK_DEPENDENCY_BLOCKED: 'Selesaikan dependency sebelum menjalankan task ini.',
      WORKSPACE_TASK_ALREADY_RUNNING: 'Workspace sedang menjalankan task lain.',
      WORKSPACE_TASK_EXECUTION_STALE: 'Eksekusi task sudah tidak aktif. Muat ulang sebelum melanjutkan.',
      WORKSPACE_TASK_EXECUTION_ID_CONFLICT: 'ID eksekusi ini sudah terikat pada permintaan lain.',
      WORKSPACE_TASK_ARTIFACT_CONFLICT: 'Eksekusi ini sudah tertaut ke artifact lain.',
      WORKSPACE_TASK_NOT_RUNNABLE: 'Task ini tidak dapat dijalankan sekarang.',
      WORKSPACE_TASK_NOT_WAITING_REVIEW: 'Task tidak sedang menunggu tinjauan.',
      WORKSPACE_PLAN_INCOMPLETE: 'Semua task harus selesai sebelum plan dikonfirmasi.',
      WORKSPACE_MODEL_NOT_FOUND: 'Model yang dipilih tidak tersedia.',
      WORKSPACE_MODEL_UNAVAILABLE: 'Model yang dipilih sedang tidak tersedia.',
      WORKSPACE_SOURCE_NOT_FOUND: 'Salah satu sumber Workspace tidak tersedia.',
      WORKSPACE_ARTIFACT_NOT_FOUND: 'Artifact Workspace tidak ditemukan.',
      WORKSPACE_EXECUTION_NOT_FOUND: 'Eksekusi tidak ditemukan.'
    };
    return res.status(error.status).json({ success: false, code: error.code, message: messages[error.code] || 'Perubahan workflow tidak dapat dilakukan.' });
  }
  console.error(`[${fallbackCode}]`, error);
  return res.status(500).json({ success: false, code: fallbackCode, message: fallbackMessage });
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await prisma.workspaces.findMany({
      where: { chat: { userId: req.user!.userId, workspaceMode: 'RUANG_KERJA', isArchived: false } },
      include: {
        chat: true,
        tasks: { orderBy: { createdAt: 'asc' } },
        plans: { orderBy: { updatedAt: 'desc' }, take: 1, select: { id: true, titleEncrypted: true, status: true, tasks: { select: { status: true } } } }
      },
      orderBy: { chat: { updatedAt: 'desc' } },
      take: 100
    });
    return res.json({ success: true, data: rows.map(row => {
      const plan = row.plans[0];
      return workspaceDto({ ...row, workflowPlanSummary: plan ? {
        id: plan.id,
        title: decrypt(plan.titleEncrypted) || 'Rencana pekerjaan',
        status: plan.status,
        taskCount: plan.tasks.length,
        completedCount: plan.tasks.filter(task => task.status === 'done').length
      } : undefined }, false);
    }) });
  } catch (error) {
    console.error('[WORKSPACE_LIST_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_LIST_FAILED', message: 'Gagal memuat Workspace.' });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100).toLocaleLowerCase() : '';
  if (query.length < 2) return res.json({ success: true, data: [] });
  try {
    const workspaces = await prisma.workspaces.findMany({
      where: { chat: { userId: req.user!.userId, workspaceMode: 'RUANG_KERJA', isArchived: false } },
      select: { chatId: true, chat: { select: { title: true, updatedAt: true } }, tasks: { select: { id: true, title: true, status: true, updatedAt: true } } },
      orderBy: { chat: { updatedAt: 'desc' } }, take: 100
    });
    const chatIds = workspaces.map(item => item.chatId);
    if (!chatIds.length) return res.json({ success: true, data: [] });
    const [artifacts, attachments, messages] = await Promise.all([
      prisma.artifacts.findMany({ where: { userId: req.user!.userId, chatId: { in: chatIds } }, select: { id: true, chatId: true, title: true, content: true, updatedAt: true }, take: 500 }),
      prisma.attachments.findMany({ where: { userId: req.user!.userId, chatId: { in: chatIds } }, select: { id: true, chatId: true, filename: true, status: true, updatedAt: true }, take: 500 }),
      prisma.chatMessages.findMany({ where: { chatId: { in: chatIds } }, orderBy: { createdAt: 'desc' }, take: 1000, select: { id: true, chatId: true, role: true, content: true, createdAt: true } })
    ]);
    const nameByChat = new Map(workspaces.map(item => [item.chatId, decrypt(item.chat?.title) || 'Workspace']));
    const results: Array<{ kind: string; chatId: string; itemId?: string; title: string; snippet: string; updatedAt: string }> = [];
    const add = (result: typeof results[number]) => { if (results.length < 40) results.push(result); };
    for (const workspace of workspaces) {
      const name = nameByChat.get(workspace.chatId) || 'Workspace';
      if (name.toLocaleLowerCase().includes(query)) add({ kind: 'workspace', chatId: workspace.chatId, title: name, snippet: 'Workspace', updatedAt: workspace.chat.updatedAt.toISOString() });
      for (const task of workspace.tasks) {
        const title = decrypt(task.title) || '';
        if (title.toLocaleLowerCase().includes(query)) add({ kind: 'task', chatId: workspace.chatId, itemId: task.id, title, snippet: `Task · ${task.status}`, updatedAt: task.updatedAt.toISOString() });
      }
    }
    for (const artifact of artifacts) {
      const title = decrypt(artifact.title) || 'Dokumen';
      const content = decrypt(artifact.content) || '';
      const matchingText = `${title}\n${content}`;
      const index = matchingText.toLocaleLowerCase().indexOf(query);
      if (index >= 0 && artifact.chatId) add({ kind: 'artifact', chatId: artifact.chatId, itemId: artifact.id, title, snippet: matchingText.slice(Math.max(0, index - 70), index + 150).replace(/\s+/g, ' '), updatedAt: artifact.updatedAt.toISOString() });
    }
    for (const attachment of attachments) {
      if (attachment.filename.toLocaleLowerCase().includes(query) && attachment.chatId) add({ kind: 'file', chatId: attachment.chatId, itemId: attachment.id, title: attachment.filename, snippet: `File · ${attachment.status}`, updatedAt: attachment.updatedAt.toISOString() });
    }
    for (const message of messages) {
      const content = decrypt(message.content) || '';
      const index = content.toLocaleLowerCase().indexOf(query);
      if (index >= 0) add({ kind: 'message', chatId: message.chatId, itemId: message.id, title: nameByChat.get(message.chatId) || 'Workspace', snippet: content.slice(Math.max(0, index - 70), index + 150).replace(/\s+/g, ' '), updatedAt: message.createdAt.toISOString() });
    }
    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('[WORKSPACE_SEARCH_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_SEARCH_FAILED', message: 'Pencarian Workspace gagal.' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateWorkspaceSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ success: false, code: 'WORKSPACE_INVALID', message: 'Nama Workspace tidak valid.' });
  const userId = req.user!.userId;
  const chatId = `chat_${randomUUID()}`;
  const name = sanitizeInput(parsed.data.name || 'Workspace baru', 100);
  const encryptedName = encryptionService.encryptSensitive(name) || name;
  try {
    const row = await prisma.$transaction(async tx => {
      await tx.chats.create({ data: { id: chatId, userId, title: encryptedName, workspaceMode: 'RUANG_KERJA', workspace: { create: {} } } });
      return tx.workspaces.findUniqueOrThrow({ where: { chatId }, include: { chat: true, tasks: true } });
    });
    return res.status(201).json({ success: true, data: workspaceDto(row) });
  } catch (error) {
    console.error('[WORKSPACE_CREATE_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_CREATE_FAILED', message: 'Gagal membuat Workspace.' });
  }
});

router.get('/:chatId', async (req: Request, res: Response) => {
  try {
    let row = await ownedWorkspace(req.params.chatId, req.user!.userId, true);
    if (!row) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    // GET is read-only with respect to workflow lifecycle. A second tab loading this Workspace
    // is not evidence that a client-bound provider request has stopped.
    const legacyState = await ensureLegacyWorkflowEncrypted(row, req.user!.userId);
    row = legacyState.row;
    const workflow = legacyState.workflow;
    let plan = await findWorkspacePlan(req.params.chatId, req.user!.userId);
    if (!plan && workflow?.plan) plan = await backfillLegacyPlan(req.params.chatId, req.user!.userId, workflow.plan);
    return res.json({ success: true, data: workspaceDto(row, true, plan) });
  } catch (error) {
    console.error('[WORKSPACE_GET_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_GET_FAILED', message: 'Gagal memuat Workspace.' });
  }
});

router.put('/:chatId', async (req: Request, res: Response) => {
  const parsed = UpdateWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: 'WORKSPACE_INVALID', message: 'Perubahan Workspace tidak valid.' });
  try {
    let current = await ownedWorkspace(req.params.chatId, req.user!.userId, true);
    if (!current) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    current = (await ensureLegacyWorkflowEncrypted(current, req.user!.userId)).row;
    const update = parsed.data;
    const result = await prisma.$transaction(async tx => {
      const data = {
          ...(update.description !== undefined ? { description: update.description ? encryptionService.encryptSensitive(sanitizeInput(update.description, 1000)) : null } : {}),
          ...(update.instructions !== undefined ? { instructions: update.instructions ? encryptionService.encryptSensitive(sanitizeInput(update.instructions, 4000)) : null } : {}),
          ...(update.defaultModel !== undefined ? { defaultModel: update.defaultModel || null } : {}),
          ...(update.defaultPreset !== undefined ? { defaultPreset: update.defaultPreset || null } : {}),
          ...(update.settings ? { settings: JSON.stringify({
            ...update.settings,
            // General workspace preferences must not replace the independently managed plan.
            ...(parseWorkspaceSettings(current.settings).agentWorkflow !== undefined
              ? { agentWorkflow: parseWorkspaceSettings(current.settings).agentWorkflow }
              : {})
          }) } : {})
      };
      if (update.settings) {
        const safeSettings = { ...update.settings };
        delete safeSettings.agentWorkflow; // Plans are written only through the encrypted plan API.
        const currentAgentWorkflow = parseWorkspaceSettings(current.settings).agentWorkflow;
        if (currentAgentWorkflow !== undefined) safeSettings.agentWorkflow = currentAgentWorkflow;
        data.settings = JSON.stringify(safeSettings);
        // CAS prevents a preferences save from erasing a plan written after this read.
        const saved = await tx.workspaces.updateMany({ where: { chatId: req.params.chatId, settings: current.settings }, data });
        if (!saved.count) throw new Error('WORKSPACE_SETTINGS_CONFLICT');
      } else {
        await tx.workspaces.update({ where: { chatId: req.params.chatId }, data });
      }
      if (update.name !== undefined) {
        const name = sanitizeInput(update.name, 100);
        await tx.chats.update({ where: { id: req.params.chatId }, data: { title: encryptionService.encryptSensitive(name) || name, workspaceMode: 'RUANG_KERJA' } });
      }
      return tx.workspaces.findUniqueOrThrow({ where: { chatId: req.params.chatId }, include: { chat: true, tasks: { orderBy: { createdAt: 'asc' } } } });
    });
    return res.json({ success: true, data: workspaceDto(result) });
  } catch (error) {
    if (error instanceof Error && error.message === 'WORKSPACE_SETTINGS_CONFLICT') return res.status(409).json({ success: false, code: 'WORKSPACE_SETTINGS_CONFLICT', message: 'Workspace berubah di sesi lain. Muat ulang sebelum menyimpan.' });
    console.error('[WORKSPACE_UPDATE_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_UPDATE_FAILED', message: 'Gagal menyimpan perubahan Workspace.' });
  }
});

router.get('/:chatId/tasks', async (req: Request, res: Response) => {
  try {
    const row = await ownedWorkspace(req.params.chatId, req.user!.userId, true);
    if (!row) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    return res.json({ success: true, data: workspaceDto(row).tasks });
  } catch (error) {
    console.error('[WORKSPACE_TASKS_GET_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_TASKS_GET_FAILED', message: 'Gagal memuat task.' });
  }
});

router.get('/:chatId/sources', async (req: Request, res: Response) => {
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    const attachments = await prisma.attachments.findMany({ where: { chatId: req.params.chatId, userId: req.user!.userId, status: 'ready' }, orderBy: { createdAt: 'asc' }, select: { id: true, filename: true, fileKind: true, metadata: true, createdAt: true } });
    const data = attachments.map((source: any) => {
      let metadata: any = {}; try { metadata = JSON.parse(source.metadata || '{}'); } catch { /* unknown metadata */ }
      const userMetadata = metadata.researchMetadata || {};
      return { id: source.id, workspaceId: req.params.chatId, type: 'uploaded_file', title: userMetadata.title || source.filename, fileName: source.filename, pageCount: metadata.pageCount, author: userMetadata.author, year: userMetadata.year, doi: userMetadata.doi, url: userMetadata.url, metadataConfidence: userMetadata.title || userMetadata.author || userMetadata.year || userMetadata.doi || userMetadata.url ? 'user_provided' : 'unknown', provenance: 'uploaded file', createdAt: source.createdAt.toISOString() };
    });
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[WORKSPACE_SOURCES_GET_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_SOURCES_GET_FAILED', message: 'Sumber gagal dimuat.' });
  }
});

router.put('/:chatId/sources/:sourceId', async (req: Request, res: Response) => {
  const parsed = ResearchSourceMetadataSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: 'WORKSPACE_SOURCE_METADATA_INVALID', message: parsed.error.issues[0]?.message || 'Metadata sumber tidak valid.' });
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    const source = await prisma.attachments.findFirst({ where: { id: req.params.sourceId, chatId: req.params.chatId, userId: req.user!.userId, status: 'ready' } });
    if (!source) return res.status(404).json({ success: false, code: 'WORKSPACE_SOURCE_NOT_FOUND', message: 'Sumber tidak ditemukan.' });
    let metadata: any = {}; try { metadata = JSON.parse(source.metadata || '{}'); } catch { /* reset malformed optional metadata */ }
    metadata.researchMetadata = parsed.data;
    await prisma.attachments.update({ where: { id: source.id }, data: { metadata: JSON.stringify(metadata) } });
    return res.json({ success: true, data: { id: source.id, workspaceId: req.params.chatId, type: 'uploaded_file', ...parsed.data, fileName: source.filename, pageCount: metadata.pageCount, metadataConfidence: 'user_provided', provenance: 'metadata provided by user', createdAt: source.createdAt.toISOString() } });
  } catch (error) {
    console.error('[WORKSPACE_SOURCE_UPDATE_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_SOURCE_UPDATE_FAILED', message: 'Metadata sumber gagal disimpan.' });
  }
});

// Agent plans/tasks/executions use normalized persistence. Manual checklist tasks remain separate.
router.post('/:chatId/plans', async (req: Request, res: Response) => {
  const parsed = WorkspacePlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: 'WORKSPACE_PLAN_INVALID', message: parsed.error.issues[0]?.message || 'Plan tidak valid.' });
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, true);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    await currentWorkspacePlan(workspace, req.user!.userId);
    const saved = await createWorkspacePlan(req.params.chatId, req.user!.userId, parsed.data);
    await prisma.chats.update({ where: { id: req.params.chatId }, data: { updatedAt: new Date() } });
    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    return sendWorkflowError(res, error, 'WORKSPACE_PLAN_CREATE_FAILED', 'Plan gagal disimpan.');
  }
});

router.put('/:chatId/plans/:planId', async (req: Request, res: Response) => {
  const parsed = WorkspacePlanSchema.safeParse(req.body);
  if (!parsed.success || parsed.data?.id !== req.params.planId) return res.status(400).json({ success: false, code: 'WORKSPACE_PLAN_INVALID', message: parsed.success ? 'ID plan tidak cocok.' : parsed.error.issues[0]?.message || 'Plan tidak valid.' });
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    await currentWorkspacePlan(workspace, req.user!.userId);
    const saved = await updateDraftPlan(req.params.chatId, req.user!.userId, parsed.data);
    await prisma.chats.update({ where: { id: req.params.chatId }, data: { updatedAt: new Date() } });
    return res.json({ success: true, data: saved });
  } catch (error) {
    return sendWorkflowError(res, error, 'WORKSPACE_PLAN_UPDATE_FAILED', 'Plan gagal diperbarui.');
  }
});

router.post('/:chatId/plans/:planId/tasks/:taskId/run', async (req: Request, res: Response) => {
  const parsed = WorkspaceTaskExecutionRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: 'WORKSPACE_TASK_EXECUTION_INVALID', message: 'Snapshot task tidak valid.' });
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    await currentWorkspacePlan(workspace, req.user!.userId);
    const allowInternalModel = req.user!.role === 'admin' || (req.user as any).tier === 'Developer';
    const args = [req.params.chatId, req.user!.userId, req.params.planId, req.params.taskId, parsed.data.executionId, parsed.data.snapshot, (req.user as any).tier || 'Free'] as const;
    const result = allowInternalModel ? await startWorkspaceTask(...args, true) : await startWorkspaceTask(...args);
    return res.status(result.claimed ? 202 : 200).json({ success: true, data: result });
  } catch (error) {
    return sendWorkflowError(res, error, 'WORKSPACE_TASK_RUN_FAILED', 'Task gagal dimulai.');
  }
});

/** Run the approved task as a bounded server-side Agent loop. */
router.post('/:chatId/plans/:planId/tasks/:taskId/agent', aiChatLimiter, async (req: Request, res: Response) => {
  const parsed = WorkspaceAgentExecutionRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: 'WORKSPACE_AGENT_EXECUTION_INVALID', message: 'Identitas eksekusi Agent tidak valid.' });
  const { executionId } = parsed.data;
  const workspaceId = req.params.chatId;
  const userId = req.user!.userId;
  const planId = req.params.planId;
  const taskId = req.params.taskId;
  const abortController = new AbortController();
  const onResponseClose = () => { if (!res.writableEnded) abortController.abort(); };
  res.once('close', onResponseClose);

  try {
    const workspace = await ownedWorkspace(workspaceId, userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    await currentWorkspacePlan(workspace, userId);
    const claimed = await claimWorkspaceTaskAgentExecution(workspaceId, userId, planId, taskId, executionId);
    if (!claimed) return res.status(409).json({ success: false, code: 'WORKSPACE_AGENT_ALREADY_RUNNING', message: 'Agent untuk task ini sudah berjalan atau sudah selesai.' });

    const plan = await findWorkspacePlan(workspaceId, userId, planId);
    if (!plan) return res.status(404).json({ success: false, code: 'WORKSPACE_PLAN_NOT_FOUND', message: 'Plan tidak ditemukan.' });
    const result = await runWorkspaceAgent({
      executionId, workspaceId, userId, userTier: (req.user as any).tier || 'Free',
      plan, taskId, abortSignal: abortController.signal
    });
    if (abortController.signal.aborted) throw new AgentExecutionError('AGENT_CANCELLED', 'Eksekusi dihentikan.');
    const savedPlan = await finishWorkspaceTask(workspaceId, userId, planId, taskId, executionId, {
      output: result.output,
      sources: result.sources,
      executionEvents: result.events,
      ...(result.artifactProposal ? { artifactProposal: result.artifactProposal } : {})
    });
    return res.json({ success: true, data: { execution: result, plan: savedPlan } });
  } catch (error) {
    if (abortController.signal.aborted || (error instanceof AgentExecutionError && error.code === 'AGENT_CANCELLED')) {
      try { await cancelWorkspaceTaskExecution(workspaceId, userId, planId, taskId, executionId); }
      catch { /* The explicit client cancel route may already have marked the execution. */ }
      if (!res.headersSent && !res.destroyed) return res.status(499).json({ success: false, code: 'AGENT_CANCELLED', message: 'Eksekusi Agent dihentikan.' });
      return;
    }

    const agentError = error instanceof AgentExecutionError
      ? error
      : new AgentExecutionError('AGENT_EXECUTION_FAILED', 'Agent tidak dapat menyelesaikan task ini.');
    try {
      const savedPlan = await finishWorkspaceTask(workspaceId, userId, planId, taskId, executionId, {
        output: agentError.partialOutput || undefined,
        sources: agentError.sources,
        executionEvents: agentError.events,
        errorCode: agentError.code
      });
      const plan = await findWorkspacePlan(workspaceId, userId, planId);
      const stats = agentError.stats;
      const failedResult = AgentExecutionResultSchema.parse({
        executionId, status: 'failed', output: agentError.partialOutput || '', sources: agentError.sources,
        modelId: stats?.modelId || plan?.tasks.find(task => task.id === taskId)?.modelId || 'unknown',
        steps: stats?.steps || 0, toolCalls: stats?.toolCalls || 0, events: agentError.events,
        estimatedInputTokens: stats?.estimatedInputTokens || 0, estimatedOutputTokens: stats?.estimatedOutputTokens || 0,
        error: { code: agentError.code, message: agentError.message }
      });
      return res.json({ success: true, data: { execution: failedResult, plan: plan || savedPlan } });
    } catch (persistError) {
      if (persistError instanceof WorkspaceWorkflowError) return sendWorkflowError(res, persistError, 'WORKSPACE_AGENT_EXECUTION_FAILED', 'Status eksekusi Agent tidak dapat disimpan.');
      console.warn('[WORKSPACE_AGENT_EXECUTION_PERSIST_FAILED]', JSON.stringify({ executionId, code: agentError.code }));
      return res.status(500).json({ success: false, code: 'WORKSPACE_AGENT_EXECUTION_FAILED', message: 'Hasil eksekusi Agent tidak dapat disimpan.' });
    }
  } finally {
    res.removeListener('close', onResponseClose);
  }
});

router.post('/:chatId/plans/:planId/tasks/:taskId/model', async (req: Request, res: Response) => {
  const parsed = WorkspaceTaskModelRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: 'WORKSPACE_MODEL_INVALID', message: 'Pilihan model tidak valid.' });
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    await currentWorkspacePlan(workspace, req.user!.userId);
    const allowInternalModel = req.user!.role === 'admin' || (req.user as any).tier === 'Developer';
    const args = [req.params.chatId, req.user!.userId, req.params.planId, req.params.taskId, parsed.data.modelId, (req.user as any).tier || 'Free'] as const;
    const plan = allowInternalModel ? await setWorkspaceTaskModel(...args, true) : await setWorkspaceTaskModel(...args);
    return res.json({ success: true, data: plan });
  } catch (error) {
    return sendWorkflowError(res, error, 'WORKSPACE_MODEL_UPDATE_FAILED', 'Model task gagal diperbarui.');
  }
});

router.post('/:chatId/plans/:planId/tasks/:taskId/executions/:executionId/result', async (req: Request, res: Response) => {
  const parsed = WorkspaceTaskExecutionResultRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: 'WORKSPACE_TASK_RESULT_INVALID', message: parsed.error.issues[0]?.message || 'Hasil task tidak valid.' });
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    await currentWorkspacePlan(workspace, req.user!.userId);
    const plan = await finishWorkspaceTask(req.params.chatId, req.user!.userId, req.params.planId, req.params.taskId, req.params.executionId, parsed.data);
    return res.json({ success: true, data: plan });
  } catch (error) {
    return sendWorkflowError(res, error, 'WORKSPACE_TASK_RESULT_SAVE_FAILED', 'Hasil task gagal disimpan.');
  }
});

router.post('/:chatId/plans/:planId/tasks/:taskId/review', async (req: Request, res: Response) => {
  const parsed = WorkspacePlanReviewRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: 'WORKSPACE_TASK_REVIEW_INVALID', message: 'Keputusan tinjauan tidak valid.' });
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    await currentWorkspacePlan(workspace, req.user!.userId);
    const plan = await reviewWorkspaceTask(req.params.chatId, req.user!.userId, req.params.planId, req.params.taskId, parsed.data.decision);
    return res.json({ success: true, data: plan });
  } catch (error) {
    return sendWorkflowError(res, error, 'WORKSPACE_TASK_REVIEW_FAILED', 'Keputusan tinjauan gagal disimpan.');
  }
});

router.post('/:chatId/plans/:planId/tasks/:taskId/executions/:executionId/artifact', async (req: Request, res: Response) => {
  const artifactId = typeof req.body?.artifactId === 'string' ? req.body.artifactId : '';
  if (!artifactId || artifactId.length > 100) return res.status(400).json({ success: false, code: 'WORKSPACE_TASK_ARTIFACT_INVALID', message: 'Artifact task tidak valid.' });
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    await currentWorkspacePlan(workspace, req.user!.userId);
    const plan = await linkWorkspaceTaskArtifact(req.params.chatId, req.user!.userId, req.params.planId, req.params.taskId, req.params.executionId, artifactId);
    return res.json({ success: true, data: plan });
  } catch (error) {
    return sendWorkflowError(res, error, 'WORKSPACE_TASK_ARTIFACT_SAVE_FAILED', 'Artifact task gagal ditautkan.');
  }
});

router.post('/:chatId/plans/:planId/transition', async (req: Request, res: Response) => {
  const parsed = WorkspacePlanTransitionRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: 'WORKSPACE_PLAN_TRANSITION_INVALID', message: 'Tindakan plan tidak valid.' });
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    await currentWorkspacePlan(workspace, req.user!.userId);
    const plan = await transitionWorkspacePlan(req.params.chatId, req.user!.userId, req.params.planId, parsed.data.action);
    return res.json({ success: true, data: plan });
  } catch (error) {
    return sendWorkflowError(res, error, 'WORKSPACE_PLAN_TRANSITION_FAILED', 'Perubahan status plan gagal disimpan.');
  }
});

router.post('/:chatId/plans/:planId/tasks/:taskId/executions/:executionId/recover', async (req: Request, res: Response) => {
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    await currentWorkspacePlan(workspace, req.user!.userId);
    const plan = await recoverWorkspaceTask(req.params.chatId, req.user!.userId, req.params.planId, req.params.taskId, req.params.executionId);
    return res.json({ success: true, data: plan });
  } catch (error) {
    return sendWorkflowError(res, error, 'WORKSPACE_EXECUTION_RECOVERY_FAILED', 'Eksekusi belum dapat dipulihkan.');
  }
});

router.post('/:chatId/plans/:planId/tasks/:taskId/executions/:executionId/cancel', async (req: Request, res: Response) => {
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    await currentWorkspacePlan(workspace, req.user!.userId);
    const plan = await cancelWorkspaceTaskExecution(req.params.chatId, req.user!.userId, req.params.planId, req.params.taskId, req.params.executionId);
    return res.json({ success: true, data: plan });
  } catch (error) {
    return sendWorkflowError(res, error, 'WORKSPACE_EXECUTION_CANCEL_FAILED', 'Task belum dapat dihentikan.');
  }
});

router.post('/:chatId/tasks', async (req: Request, res: Response) => {
  const parsed = CreateWorkspaceTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: 'WORKSPACE_TASK_INVALID', message: 'Task tidak valid.' });
  try {
    const row = await ownedWorkspace(req.params.chatId, req.user!.userId, true);
    if (!row) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    const title = sanitizeInput(parsed.data.title, 240);
    const task = await prisma.workspaceTasks.create({ data: {
      id: `wt_${randomUUID()}`,
      workspaceId: req.params.chatId,
      title: encryptionService.encryptSensitive(title) || title,
      source: parsed.data.source
    } });
    await prisma.chats.update({ where: { id: req.params.chatId }, data: { updatedAt: new Date() } });
    return res.status(201).json({ success: true, data: { ...task, title: decrypt(task.title) } });
  } catch (error) {
    console.error('[WORKSPACE_TASK_CREATE_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_TASK_CREATE_FAILED', message: 'Gagal membuat task.' });
  }
});

router.put('/:chatId/tasks/:taskId', async (req: Request, res: Response) => {
  const parsed = UpdateWorkspaceTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: 'WORKSPACE_TASK_INVALID', message: 'Status task tidak valid.' });
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    const task = await prisma.workspaceTasks.findFirst({ where: { id: req.params.taskId, workspaceId: req.params.chatId } });
    if (!task) return res.status(404).json({ success: false, code: 'WORKSPACE_TASK_NOT_FOUND', message: 'Task tidak ditemukan.' });
    const allowed: Record<string, string[]> = { todo: ['running', 'done'], running: ['done', 'failed', 'todo'], failed: ['running', 'todo', 'done'], done: ['todo'] };
    if (task.status !== parsed.data.status && !allowed[task.status]?.includes(parsed.data.status)) {
      return res.status(409).json({ success: false, code: 'WORKSPACE_TASK_TRANSITION_INVALID', message: 'Perubahan status task tidak diizinkan.' });
    }
    const updated = await prisma.workspaceTasks.update({ where: { id: task.id }, data: { status: parsed.data.status } });
    await prisma.chats.update({ where: { id: req.params.chatId }, data: { updatedAt: new Date() } });
    return res.json({ success: true, data: { ...updated, title: decrypt(updated.title) } });
  } catch (error) {
    console.error('[WORKSPACE_TASK_UPDATE_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_TASK_UPDATE_FAILED', message: 'Gagal memperbarui task.' });
  }
});

router.delete('/:chatId/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    const result = await prisma.workspaceTasks.deleteMany({ where: { id: req.params.taskId, workspaceId: req.params.chatId } });
    if (!result.count) return res.status(404).json({ success: false, code: 'WORKSPACE_TASK_NOT_FOUND', message: 'Task tidak ditemukan.' });
    await prisma.chats.update({ where: { id: req.params.chatId }, data: { updatedAt: new Date() } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[WORKSPACE_TASK_DELETE_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_TASK_DELETE_FAILED', message: 'Gagal menghapus task.' });
  }
});

// ==========================================
// WORKSPACE MEMORY ENDPOINTS (FASE 14)
// ==========================================

router.get('/:chatId/memories', async (req: Request, res: Response) => {
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });

    const memories = await WorkspaceMemoryService.listMemories(req.user!.userId, req.params.chatId);
    return res.json({ success: true, data: memories });
  } catch (error: any) {
    console.error('[WORKSPACE_MEMORY_LIST_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_MEMORY_LIST_FAILED', message: 'Gagal memuat memori workspace.' });
  }
});

router.post('/:chatId/memories', async (req: Request, res: Response) => {
  const parsed = CreateWorkspaceMemorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, code: 'INVALID_PAYLOAD', message: 'Format memori tidak valid.', errors: parsed.error.issues });
  }

  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });

    const created = await WorkspaceMemoryService.addMemory({
      userId: req.user!.userId,
      workspaceId: req.params.chatId,
      category: parsed.data.category,
      content: parsed.data.content,
      provenance: parsed.data.provenance || 'Input Pengguna'
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    if (error.message?.includes('MEMORY_CONSENT_REQUIRED')) {
      return res.status(403).json({ success: false, code: 'MEMORY_CONSENT_REQUIRED', message: error.message });
    }
    if (error.message?.includes('PROMPT_INJECTION_DETECTED')) {
      return res.status(400).json({ success: false, code: 'PROMPT_INJECTION_DETECTED', message: error.message });
    }
    console.error('[WORKSPACE_MEMORY_CREATE_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_MEMORY_CREATE_FAILED', message: 'Gagal menyimpan memori.' });
  }
});

router.put('/:chatId/memories/:memoryId', async (req: Request, res: Response) => {
  const parsed = UpdateWorkspaceMemorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, code: 'INVALID_PAYLOAD', message: 'Format pembaruan memori tidak valid.', errors: parsed.error.issues });
  }

  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });

    const updated = await WorkspaceMemoryService.updateMemory({
      userId: req.user!.userId,
      workspaceId: req.params.chatId,
      memoryId: req.params.memoryId,
      ...parsed.data
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.message?.includes('MEMORY_NOT_FOUND')) {
      return res.status(404).json({ success: false, code: 'MEMORY_NOT_FOUND', message: error.message });
    }
    if (error.message?.includes('PROMPT_INJECTION_DETECTED')) {
      return res.status(400).json({ success: false, code: 'PROMPT_INJECTION_DETECTED', message: error.message });
    }
    console.error('[WORKSPACE_MEMORY_UPDATE_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_MEMORY_UPDATE_FAILED', message: 'Gagal memperbarui memori.' });
  }
});

router.delete('/:chatId/memories/:memoryId', async (req: Request, res: Response) => {
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });

    const deleted = await WorkspaceMemoryService.deleteMemory(req.user!.userId, req.params.chatId, req.params.memoryId);
    if (!deleted) {
      return res.status(404).json({ success: false, code: 'MEMORY_NOT_FOUND', message: 'Memori tidak ditemukan.' });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[WORKSPACE_MEMORY_DELETE_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_MEMORY_DELETE_FAILED', message: 'Gagal menghapus memori.' });
  }
});

export default router;
