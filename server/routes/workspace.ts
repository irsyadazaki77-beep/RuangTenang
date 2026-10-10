import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import {
  CreateWorkspaceSchema,
  CreateWorkspaceTaskSchema,
  UpdateWorkspaceSchema,
  UpdateWorkspaceTaskSchema,
  WorkspacePlanSchema,
  WorkspaceTaskExecutionRequestSchema
} from '../../shared/contracts/workspace.js';
import { ResearchSourceMetadataSchema } from '../../shared/contracts/files.js';
import { prisma } from '../database.js';
import { requireAuth } from '../middleware/auth.js';
import { encryptionService } from '../services/encryptionService.js';
import { sanitizeInput } from '../security.js';

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

function workspaceDto(row: any, includePlanDetails = true) {
  const settings = parseWorkspaceSettings(row.settings);
  let workflow: any;
  try { workflow = readAgentWorkflow(settings); } catch { workflow = undefined; }
  // Never return the encrypted execution blob or malformed sensitive state to clients.
  if (settings.agentWorkflow?.storage === 'encrypted-v1') {
    if (workflow) settings.agentWorkflow = workflow;
    else delete settings.agentWorkflow;
  }
  const planCandidate = (workflow as { plan?: unknown } | undefined)?.plan;
  const parsedPlan = WorkspacePlanSchema.safeParse(planCandidate);
  const plan = parsedPlan.success ? parsedPlan.data : null;
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
    planSummary: plan ? { id: plan.id, title: plan.title, status: plan.status, taskCount: plan.tasks.length, completedCount: plan.tasks.filter(task => task.status === 'done').length } : null,
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

router.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await prisma.workspaces.findMany({
      where: { chat: { userId: req.user!.userId, workspaceMode: 'RUANG_KERJA', isArchived: false } },
      include: { chat: true, tasks: { orderBy: { createdAt: 'asc' } } },
      orderBy: { chat: { updatedAt: 'desc' } },
      take: 100
    });
    return res.json({ success: true, data: rows.map(row => workspaceDto(row, false)) });
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
    // Workflow execution is request-scoped. A persisted "running" marker after a page reload
    // cannot represent live background work, so expose it as resumable without claiming progress.
    const settings = parseWorkspaceSettings(row.settings);
    const workflow = readAgentWorkflow(settings);
    const plan = workflow?.plan;
    if (plan?.status === 'running' && Array.isArray(plan.tasks)) {
      const recoveredAt = new Date().toISOString();
      const recovered = { ...plan, status: 'approved', updatedAt: recoveredAt, tasks: plan.tasks.map((task: any) => task.status === 'running' ? { ...task, status: 'todo', executionHistory: (task.executionHistory || []).map((attempt: any) => attempt.status === 'running' ? { ...attempt, status: 'cancelled', completedAt: recoveredAt } : attempt), updatedAt: recoveredAt } : task) };
      const recoveredSettings = { ...settings };
      storeAgentWorkflow(recoveredSettings, { version: 1, plan: recovered });
      const nextSettings = JSON.stringify(recoveredSettings);
      const result = await prisma.workspaces.updateMany({ where: { chatId: req.params.chatId, settings: row.settings }, data: { settings: nextSettings } });
      if (result.count) { row = { ...row, settings: nextSettings }; }
    }
    return res.json({ success: true, data: workspaceDto(row) });
  } catch (error) {
    console.error('[WORKSPACE_GET_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_GET_FAILED', message: 'Gagal memuat Workspace.' });
  }
});

router.put('/:chatId', async (req: Request, res: Response) => {
  const parsed = UpdateWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: 'WORKSPACE_INVALID', message: 'Perubahan Workspace tidak valid.' });
  try {
    const current = await ownedWorkspace(req.params.chatId, req.user!.userId, true);
    if (!current) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
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

// Workflow plans are persisted as a versioned, schema-validated workspace setting.
// The task checklist remains independently addressable through WorkspaceTasks.
router.post('/:chatId/plans', async (req: Request, res: Response) => {
  const parsed = WorkspacePlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: 'WORKSPACE_PLAN_INVALID', message: parsed.error.issues[0]?.message || 'Plan tidak valid.' });
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, true);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    const settings = parseWorkspaceSettings(workspace.settings);
    const workflow = readAgentWorkflow(settings);
    const current = workflow?.plan;
    if (current && current.status !== 'completed' && current.status !== 'cancelled') {
      return res.status(409).json({ success: false, code: 'WORKSPACE_PLAN_ACTIVE', message: 'Selesaikan atau batalkan plan aktif sebelum membuat plan baru.' });
    }
    storeAgentWorkflow(settings, { version: 1, plan: parsed.data });
    if (JSON.stringify(settings).length > 1_000_000) return res.status(413).json({ success: false, code: 'WORKSPACE_PLAN_TOO_LARGE', message: 'Plan terlalu besar untuk disimpan.' });
    const saved = await prisma.workspaces.updateMany({ where: { chatId: req.params.chatId, settings: workspace.settings }, data: { settings: JSON.stringify(settings) } });
    if (!saved.count) return res.status(409).json({ success: false, code: 'WORKSPACE_PLAN_CONFLICT', message: 'Plan berubah di sesi lain. Muat ulang sebelum menyimpan.' });
    await prisma.chats.update({ where: { id: req.params.chatId }, data: { updatedAt: new Date() } });
    return res.status(201).json({ success: true, data: parsed.data });
  } catch (error) {
    console.error('[WORKSPACE_PLAN_CREATE_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_PLAN_CREATE_FAILED', message: 'Plan gagal disimpan.' });
  }
});

router.put('/:chatId/plans/:planId', async (req: Request, res: Response) => {
  const parsed = WorkspacePlanSchema.safeParse(req.body);
  if (!parsed.success || parsed.data?.id !== req.params.planId) return res.status(400).json({ success: false, code: 'WORKSPACE_PLAN_INVALID', message: parsed.success ? 'ID plan tidak cocok.' : parsed.error.issues[0]?.message || 'Plan tidak valid.' });
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    const settings = parseWorkspaceSettings(workspace.settings);
    const workflow = readAgentWorkflow(settings);
    const current = workflow?.plan;
    if (!current || current.id !== req.params.planId) return res.status(404).json({ success: false, code: 'WORKSPACE_PLAN_NOT_FOUND', message: 'Plan tidak ditemukan.' });
    if (current.status === 'cancelled' || current.status === 'completed') return res.status(409).json({ success: false, code: 'WORKSPACE_PLAN_FINAL', message: 'Plan sudah berakhir.' });
    for (const currentTask of current.tasks || []) {
      const submittedTask = parsed.data.tasks.find(task => task.id === currentTask.id);
      if (currentTask.status === 'running' && (!submittedTask || submittedTask.executionId !== currentTask.executionId)) {
        return res.status(409).json({ success: false, code: 'WORKSPACE_TASK_EXECUTION_STALE', message: 'Eksekusi task berubah. Muat ulang plan sebelum menyimpan hasil.' });
      }
    }
    const transitions: Record<string, string[]> = { draft: ['draft', 'approved', 'cancelled'], approved: ['approved', 'running', 'paused', 'cancelled', 'completed'], running: ['running', 'approved', 'paused', 'cancelled'], paused: ['paused', 'approved', 'cancelled'] };
    if (!transitions[current.status]?.includes(parsed.data.status)) return res.status(409).json({ success: false, code: 'WORKSPACE_PLAN_TRANSITION_INVALID', message: 'Perubahan status plan tidak diizinkan.' });
    if (parsed.data.status === 'completed' && !parsed.data.tasks.every(task => task.status === 'done')) return res.status(409).json({ success: false, code: 'WORKSPACE_PLAN_INCOMPLETE', message: 'Semua task wajib selesai sebelum goal dikonfirmasi.' });
    if (JSON.stringify({ ...settings, agentWorkflow: { version: 1, plan: parsed.data } }).length > 1_000_000) return res.status(413).json({ success: false, code: 'WORKSPACE_PLAN_TOO_LARGE', message: 'Plan terlalu besar untuk disimpan.' });
    storeAgentWorkflow(settings, { version: 1, plan: parsed.data });
    const saved = await prisma.workspaces.updateMany({ where: { chatId: req.params.chatId, settings: workspace.settings }, data: { settings: JSON.stringify(settings) } });
    if (!saved.count) return res.status(409).json({ success: false, code: 'WORKSPACE_PLAN_CONFLICT', message: 'Plan berubah di sesi lain. Muat ulang sebelum menyimpan.' });
    await prisma.chats.update({ where: { id: req.params.chatId }, data: { updatedAt: new Date() } });
    return res.json({ success: true, data: parsed.data });
  } catch (error) {
    console.error('[WORKSPACE_PLAN_UPDATE_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_PLAN_UPDATE_FAILED', message: 'Plan gagal diperbarui.' });
  }
});

router.post('/:chatId/plans/:planId/tasks/:taskId/run', async (req: Request, res: Response) => {
  const parsed = WorkspaceTaskExecutionRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: 'WORKSPACE_TASK_EXECUTION_INVALID', message: 'Snapshot task tidak valid.' });
  try {
    const workspace = await ownedWorkspace(req.params.chatId, req.user!.userId, false);
    if (!workspace) return res.status(404).json({ success: false, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace tidak ditemukan.' });
    const settings = parseWorkspaceSettings(workspace.settings);
    const workflow = readAgentWorkflow(settings);
    const current = workflow?.plan;
    if (!current || current.id !== req.params.planId) return res.status(404).json({ success: false, code: 'WORKSPACE_PLAN_NOT_FOUND', message: 'Plan tidak ditemukan.' });
    if (current.status !== 'approved' && current.status !== 'running') return res.status(409).json({ success: false, code: 'WORKSPACE_PLAN_NOT_APPROVED', message: 'Plan harus disetujui sebelum task dijalankan.' });
    const task = current.tasks.find((item: any) => item.id === req.params.taskId);
    if (!task) return res.status(404).json({ success: false, code: 'WORKSPACE_TASK_NOT_FOUND', message: 'Task tidak ditemukan.' });
    if (task.status === 'running' && task.executionId === parsed.data.executionId) return res.json({ success: true, data: current });
    if (task.status !== 'todo' && task.status !== 'failed' && task.status !== 'waiting_review') return res.status(409).json({ success: false, code: 'WORKSPACE_TASK_NOT_RUNNABLE', message: 'Task ini tidak dapat dijalankan sekarang.' });
    if (!task.dependsOn.every((id: string) => current.tasks.some((candidate: any) => candidate.id === id && candidate.status === 'done'))) return res.status(409).json({ success: false, code: 'WORKSPACE_TASK_DEPENDENCY_BLOCKED', message: 'Selesaikan dependency sebelum menjalankan task ini.' });
    if (current.tasks.some((candidate: any) => candidate.status === 'running')) return res.status(409).json({ success: false, code: 'WORKSPACE_TASK_ALREADY_RUNNING', message: 'Workspace sedang menjalankan task lain.' });
    const now = new Date().toISOString();
    const updated = { ...current, status: 'running', updatedAt: now, tasks: current.tasks.map((item: any) => item.id === task.id ? { ...item, status: 'running', executionId: parsed.data.executionId, snapshot: parsed.data.snapshot, modelId: parsed.data.snapshot.modelId, executionHistory: [...(item.executionHistory || []), { executionId: parsed.data.executionId, modelId: parsed.data.snapshot.modelId, startedAt: now, status: 'running' }].slice(-20), updatedAt: now } : item) };
    storeAgentWorkflow(settings, { version: 1, plan: updated });
    if (JSON.stringify(settings).length > 1_000_000) return res.status(413).json({ success: false, code: 'WORKSPACE_PLAN_TOO_LARGE', message: 'Snapshot task terlalu besar untuk disimpan.' });
    const claimed = await prisma.workspaces.updateMany({ where: { chatId: req.params.chatId, settings: workspace.settings }, data: { settings: JSON.stringify(settings) } });
    if (!claimed.count) return res.status(409).json({ success: false, code: 'WORKSPACE_TASK_ALREADY_RUNNING', message: 'Status Workspace berubah. Muat ulang plan sebelum menjalankan task.' });
    return res.status(202).json({ success: true, data: updated });
  } catch (error) {
    console.error('[WORKSPACE_TASK_RUN_ERROR]', error);
    return res.status(500).json({ success: false, code: 'WORKSPACE_TASK_RUN_FAILED', message: 'Task gagal dimulai.' });
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

export default router;
