import { createHash } from 'node:crypto';
import type { WorkspacePlan } from '../../shared/contracts/workspace.js';
import { WorkspacePlanSchema } from '../../shared/contracts/workspace.js';
import { prisma } from '../database.js';
import { encryptionService } from './encryptionService.js';
import { getPublicModelCatalog } from './ai/aiModelRegistry.js';
import type { AgentArtifactProposal } from './agent/agentContracts.js';
import type { AgentExecutionEvent } from './agent/agentContracts.js';

type WorkflowStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted';

export class WorkspaceWorkflowError extends Error {
  constructor(public readonly code: string, public readonly status = 409, message = code) {
    super(message);
    this.name = 'WorkspaceWorkflowError';
  }
}

function encryptJson(value: unknown): string {
  return encryptionService.encryptRequiredSensitive(JSON.stringify(value));
}

function decryptJson<T>(value: string): T {
  const decrypted = encryptionService.decryptSensitive(value);
  if (!decrypted || encryptionService.isEncrypted(decrypted)) throw new WorkspaceWorkflowError('WORKSPACE_WORKFLOW_DECRYPT_FAILED', 500);
  return JSON.parse(decrypted) as T;
}

function decryptText(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const decrypted = encryptionService.decryptSensitive(value);
  if (decrypted == null || encryptionService.isEncrypted(decrypted)) throw new WorkspaceWorkflowError('WORKSPACE_WORKFLOW_DECRYPT_FAILED', 500);
  return decrypted;
}

function dateOrNow(value: string | undefined, fallback = new Date()): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? fallback : parsed;
}

function executionStatus(value: string): WorkflowStatus {
  return value as WorkflowStatus;
}

function toPlanDto(row: any): WorkspacePlan {
  const tasks = [...(row.tasks || [])].sort((a, b) => a.position - b.position).map((task: any) => {
    const current = (task.executions || []).find((execution: any) => execution.id === task.currentExecutionId)
      || (task.executions || [])[0];
    const snapshot = current ? decryptJson<any>(current.snapshotEncrypted) : undefined;
    const sources = current?.sourcesEncrypted ? decryptJson<any[]>(current.sourcesEncrypted) : undefined;
    const executionEvents = current?.eventsEncrypted ? decryptJson<AgentExecutionEvent[]>(current.eventsEncrypted) : undefined;
    const history = (task.executions || []).map((execution: any) => ({
      executionId: execution.id,
      modelId: execution.modelId,
      startedAt: execution.startedAt.toISOString(),
      ...(execution.finishedAt ? { completedAt: execution.finishedAt.toISOString() } : {}),
      status: executionStatus(execution.status)
    })).slice(0, 20);
    return {
      id: task.id,
      title: decryptText(task.titleEncrypted) || '',
      ...(task.descriptionEncrypted ? { description: decryptText(task.descriptionEncrypted) } : {}),
      type: task.taskType,
      dependsOn: (task.dependencies || []).map((dependency: any) => dependency.dependsOnTaskId),
      status: task.status,
      ...(task.currentExecutionId ? { executionId: task.currentExecutionId } : {}),
      ...(snapshot ? { snapshot } : {}),
      ...(current?.outputEncrypted ? { output: decryptText(current.outputEncrypted) } : {}),
      ...(current?.outputArtifactId ? { outputArtifactId: current.outputArtifactId } : {}),
      ...(sources ? { sources } : {}),
      ...(executionEvents ? { executionEvents } : {}),
      ...(task.modelId ? { modelId: task.modelId } : {}),
      ...(history.length ? { executionHistory: history } : {}),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    };
  });
  return WorkspacePlanSchema.parse({
    id: row.id,
    title: decryptText(row.titleEncrypted) || '',
    goal: decryptText(row.goalEncrypted) || '',
    status: row.status,
    revision: row.revision,
    tasks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  });
}

const planInclude = {
  tasks: {
    orderBy: { position: 'asc' as const },
    include: {
      dependencies: { select: { dependsOnTaskId: true } },
      executions: { orderBy: { startedAt: 'desc' as const }, take: 20 }
    }
  }
};

export async function findWorkspacePlan(workspaceId: string, userId: string, planId?: string): Promise<WorkspacePlan | null> {
  const row = await prisma.workspacePlans.findFirst({
    where: { workspaceId, userId, ...(planId ? { id: planId } : {}) },
    orderBy: { updatedAt: 'desc' },
    include: planInclude
  });
  return row ? toPlanDto(row) : null;
}

async function createRelationalPlan(tx: any, workspaceId: string, userId: string, plan: WorkspacePlan, revision = 1) {
  const createdAt = dateOrNow(plan.createdAt);
  const updatedAt = dateOrNow(plan.updatedAt, createdAt);
  await tx.workspacePlans.create({ data: {
    id: plan.id,
    workspaceId,
    userId,
    titleEncrypted: encryptionService.encryptRequiredSensitive(plan.title),
    goalEncrypted: encryptionService.encryptRequiredSensitive(plan.goal),
    status: plan.status,
    revision,
    createdAt,
    updatedAt,
    ...(plan.status === 'completed' ? { completedAt: updatedAt } : {})
  } });
  for (let position = 0; position < plan.tasks.length; position += 1) {
    const task = plan.tasks[position];
    await tx.workspacePlanTasks.create({ data: {
      id: task.id,
      planId: plan.id,
      titleEncrypted: encryptionService.encryptRequiredSensitive(task.title),
      ...(task.description !== undefined ? { descriptionEncrypted: encryptionService.encryptRequiredSensitive(task.description) } : {}),
      taskType: task.type,
      position,
      status: task.status,
      modelId: task.modelId || task.snapshot?.modelId || null,
      ...(task.executionId ? { currentExecutionId: task.executionId } : {}),
      createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
      updatedAt: task.updatedAt ? new Date(task.updatedAt) : new Date()
    } });
    if (task.dependsOn.length) {
      await tx.workspaceTaskDependencies.createMany({ data: task.dependsOn.map(dependsOnTaskId => ({ taskId: task.id, dependsOnTaskId })) });
    }
    const attempts = [...(task.executionHistory || [])];
    if (task.executionId && !attempts.some(attempt => attempt.executionId === task.executionId)) {
      attempts.push({ executionId: task.executionId, modelId: task.modelId || task.snapshot?.modelId || 'auto', startedAt: task.snapshot?.createdAt || task.updatedAt || plan.updatedAt, status: task.status === 'running' ? 'running' : 'interrupted' });
    }
    for (const [attemptNumber, attempt] of attempts.entries()) {
      const snapshot = task.snapshot || { inputPrompt: '', contextSourceIds: [], modelId: attempt.modelId, createdAt: attempt.startedAt };
      await tx.workspaceTaskExecutions.create({ data: {
        id: attempt.executionId,
        planTaskId: task.id,
        workspaceId,
        userId,
        status: attempt.status,
        modelId: attempt.modelId,
        requestFingerprint: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),
        snapshotEncrypted: encryptJson(snapshot),
        ...(task.executionId === attempt.executionId && task.output ? { outputEncrypted: encryptionService.encryptRequiredSensitive(task.output) } : {}),
        ...(task.executionId === attempt.executionId && task.sources ? { sourcesEncrypted: encryptJson(task.sources) } : {}),
        ...(task.executionId === attempt.executionId && task.executionEvents ? { eventsEncrypted: encryptJson(task.executionEvents) } : {}),
        ...(task.executionId === attempt.executionId && task.outputArtifactId ? { outputArtifactId: task.outputArtifactId } : {}),
        attemptNumber: attemptNumber + 1,
        startedAt: dateOrNow(attempt.startedAt, createdAt),
        ...(attempt.completedAt ? { finishedAt: dateOrNow(attempt.completedAt, updatedAt) } : {})
      } });
    }
  }
}

/** Copies a legacy encrypted settings plan into the relational store without changing its lifecycle. */
export async function backfillLegacyPlan(workspaceId: string, userId: string, input: unknown): Promise<WorkspacePlan> {
  const plan = WorkspacePlanSchema.parse(input);
  try {
    await prisma.$transaction(async tx => {
      const existing = await tx.workspacePlans.findUnique({ where: { id: plan.id }, select: { id: true, workspaceId: true, userId: true } });
      if (existing) {
        if (existing.workspaceId !== workspaceId || existing.userId !== userId) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_CONFLICT');
        return;
      }
      await createRelationalPlan(tx, workspaceId, userId, plan, plan.revision || 1);
    });
  } catch (error) {
    if (error instanceof WorkspaceWorkflowError) throw error;
    // A concurrent migration may have inserted the same plan ID. Verify ownership and return it.
    const existing = await prisma.workspacePlans.findUnique({ where: { id: plan.id }, select: { workspaceId: true, userId: true } });
    if (!existing || existing.workspaceId !== workspaceId || existing.userId !== userId) throw error;
  }
  return (await findWorkspacePlan(workspaceId, userId, plan.id))!;
}

export async function createWorkspacePlan(workspaceId: string, userId: string, input: unknown): Promise<WorkspacePlan> {
  const plan = WorkspacePlanSchema.parse(input);
  if (plan.status !== 'draft' || plan.tasks.some(task => task.status !== 'todo' || task.executionId || task.executionHistory?.length || task.output || task.outputArtifactId)) {
    throw new WorkspaceWorkflowError('WORKSPACE_PLAN_CREATE_INVALID', 400);
  }
  const existing = await prisma.workspacePlans.findFirst({ where: { workspaceId, userId }, orderBy: { updatedAt: 'desc' }, select: { status: true } });
  if (existing && existing.status !== 'completed' && existing.status !== 'cancelled') throw new WorkspaceWorkflowError('WORKSPACE_PLAN_ACTIVE', 409);
  await prisma.$transaction(tx => createRelationalPlan(tx, workspaceId, userId, plan));
  return (await findWorkspacePlan(workspaceId, userId, plan.id))!;
}

function safeDraftTask(task: WorkspacePlan['tasks'][number], current: any, position: number) {
  if (!current && (task.status !== 'todo' || task.executionId || task.executionHistory?.length || task.output || task.outputArtifactId)) {
    throw new WorkspaceWorkflowError('WORKSPACE_PLAN_MUTATION_INVALID', 400);
  }
  if (current && (task.status !== current.status || task.executionId !== (current.currentExecutionId || undefined) || task.output !== undefined || task.executionHistory?.length || task.outputArtifactId !== undefined)) {
    throw new WorkspaceWorkflowError('WORKSPACE_PLAN_MUTATION_INVALID', 400);
  }
  return { ...task, position };
}

export async function updateDraftPlan(workspaceId: string, userId: string, input: unknown): Promise<WorkspacePlan> {
  const plan = WorkspacePlanSchema.parse(input);
  const expectedRevision = plan.revision || 1;
  await prisma.$transaction(async tx => {
    const current: any = await tx.workspacePlans.findFirst({ where: { id: plan.id, workspaceId, userId }, include: { tasks: true } });
    if (!current) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_NOT_FOUND', 404);
    if (current.revision !== expectedRevision) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_CONFLICT');
    if (current.status !== 'draft' || (plan.status !== 'draft' && plan.status !== 'approved')) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_COMMAND_REQUIRED');
    const currentById = new Map(current.tasks.map((task: any) => [task.id, task]));
    const tasks = plan.tasks.map((task, position) => safeDraftTask(task, currentById.get(task.id), position));
    const count = await tx.workspacePlans.updateMany({
      where: { id: plan.id, workspaceId, userId, revision: expectedRevision, status: 'draft' },
      data: {
        titleEncrypted: encryptionService.encryptRequiredSensitive(plan.title),
        goalEncrypted: encryptionService.encryptRequiredSensitive(plan.goal),
        status: plan.status,
        revision: { increment: 1 },
        updatedAt: new Date()
      }
    });
    if (!count.count) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_CONFLICT');
    await tx.workspacePlanTasks.deleteMany({ where: { planId: plan.id } });
    for (const task of tasks) {
      await tx.workspacePlanTasks.create({ data: {
        id: task.id, planId: plan.id,
        titleEncrypted: encryptionService.encryptRequiredSensitive(task.title),
        ...(task.description !== undefined ? { descriptionEncrypted: encryptionService.encryptRequiredSensitive(task.description) } : {}),
        taskType: task.type, position: task.position, status: 'todo', modelId: task.modelId || null,
        createdAt: task.createdAt ? new Date(task.createdAt) : new Date(), updatedAt: new Date()
      } });
      if (task.dependsOn.length) await tx.workspaceTaskDependencies.createMany({ data: task.dependsOn.map(dependsOnTaskId => ({ taskId: task.id, dependsOnTaskId })) });
    }
  });
  return (await findWorkspacePlan(workspaceId, userId, plan.id))!;
}

export async function setWorkspaceTaskModel(workspaceId: string, userId: string, planId: string, taskId: string, modelId: string | null, tier = 'Free'): Promise<WorkspacePlan> {
  if (modelId && modelId !== 'auto') {
    const model = getPublicModelCatalog(tier).find(item => item.id === modelId);
    if (!model) throw new WorkspaceWorkflowError('WORKSPACE_MODEL_NOT_FOUND', 400);
    if (!model.selectable) throw new WorkspaceWorkflowError('WORKSPACE_MODEL_UNAVAILABLE', 409);
  }
  await prisma.$transaction(async tx => {
    const plan: any = await tx.workspacePlans.findFirst({ where: { id: planId, workspaceId, userId }, include: { tasks: true } });
    if (!plan) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_NOT_FOUND', 404);
    if (plan.status !== 'approved' && plan.status !== 'paused') throw new WorkspaceWorkflowError('WORKSPACE_PLAN_COMMAND_REQUIRED');
    const task = plan.tasks.find((item: any) => item.id === taskId);
    if (!task) throw new WorkspaceWorkflowError('WORKSPACE_TASK_NOT_FOUND', 404);
    if (task.status !== 'failed' && task.status !== 'todo') throw new WorkspaceWorkflowError('WORKSPACE_TASK_NOT_RUNNABLE');
    const taskChanged = await tx.workspacePlanTasks.updateMany({ where: { id: taskId, planId, status: task.status, revision: task.revision }, data: { modelId: modelId || null, revision: { increment: 1 }, updatedAt: new Date() } });
    if (!taskChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
    const planChanged = await tx.workspacePlans.updateMany({ where: { id: planId, workspaceId, userId, revision: plan.revision, status: plan.status }, data: { revision: { increment: 1 }, updatedAt: new Date() } });
    if (!planChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_CONFLICT');
  });
  return (await findWorkspacePlan(workspaceId, userId, planId))!;
}

export interface StartTaskResult { plan: WorkspacePlan; claimed: boolean }

export async function startWorkspaceTask(workspaceId: string, userId: string, planId: string, taskId: string, executionId: string, snapshot: NonNullable<WorkspacePlan['tasks'][number]['snapshot']>, tier = 'Free'): Promise<StartTaskResult> {
  const fingerprint = createHash('sha256').update(JSON.stringify({ workspaceId, userId, planId, taskId, snapshot })).digest('hex');
  const matchesExisting = (execution: any) => execution.workspaceId === workspaceId && execution.userId === userId && execution.planTaskId === taskId && execution.requestFingerprint === fingerprint;
  const existingExecution = await prisma.workspaceTaskExecutions.findUnique({ where: { id: executionId }, include: { task: { select: { planId: true } } } });
  if (existingExecution) {
    if (!matchesExisting(existingExecution) || existingExecution.task.planId !== planId) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_ID_CONFLICT');
    const plan = await findWorkspacePlan(workspaceId, userId, planId);
    if (!plan) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_NOT_FOUND', 404);
    return { plan, claimed: false };
  }
  if (snapshot.modelId !== 'auto') {
    const model = getPublicModelCatalog(tier).find(item => item.id === snapshot.modelId);
    if (!model) throw new WorkspaceWorkflowError('WORKSPACE_MODEL_NOT_FOUND', 400);
    if (!model.selectable) throw new WorkspaceWorkflowError('WORKSPACE_MODEL_UNAVAILABLE', 409);
  }
  if (snapshot.contextSourceIds.length) {
    const sources = await prisma.attachments.findMany({ where: { id: { in: snapshot.contextSourceIds }, chatId: workspaceId, userId, status: 'ready' }, select: { id: true } });
    if (sources.length !== new Set(snapshot.contextSourceIds).size) throw new WorkspaceWorkflowError('WORKSPACE_SOURCE_NOT_FOUND', 404);
  }
  if (snapshot.artifactId) {
    const artifact = await prisma.artifacts.findFirst({ where: { id: snapshot.artifactId, chatId: workspaceId, userId }, select: { id: true } });
    if (!artifact) throw new WorkspaceWorkflowError('WORKSPACE_ARTIFACT_NOT_FOUND', 404);
  }
  try { await prisma.$transaction(async tx => {
    const current: any = await tx.workspacePlans.findFirst({ where: { id: planId, workspaceId, userId }, include: { tasks: { include: { dependencies: true } } } });
    if (!current) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_NOT_FOUND', 404);
    if (current.status !== 'approved' && current.status !== 'running') throw new WorkspaceWorkflowError('WORKSPACE_PLAN_NOT_APPROVED');
    const task = current.tasks.find((item: any) => item.id === taskId);
    if (!task) throw new WorkspaceWorkflowError('WORKSPACE_TASK_NOT_FOUND', 404);
    if (!['todo', 'failed', 'cancelled', 'waiting_review'].includes(task.status)) throw new WorkspaceWorkflowError('WORKSPACE_TASK_NOT_RUNNABLE');
    for (const dependency of task.dependencies) {
      const dependencyTask = current.tasks.find((item: any) => item.id === dependency.dependsOnTaskId);
      if (!dependencyTask || dependencyTask.status !== 'done') throw new WorkspaceWorkflowError('WORKSPACE_TASK_DEPENDENCY_BLOCKED');
    }
    if (current.tasks.some((item: any) => item.status === 'running')) throw new WorkspaceWorkflowError('WORKSPACE_TASK_ALREADY_RUNNING');
    const expectedRevision = current.revision;
    const changed = await tx.workspacePlans.updateMany({
      where: { id: planId, workspaceId, userId, revision: expectedRevision, status: { in: ['approved', 'running'] } },
      data: { status: 'running', revision: { increment: 1 }, updatedAt: new Date() }
    });
    if (!changed.count) throw new WorkspaceWorkflowError('WORKSPACE_TASK_ALREADY_RUNNING');
    const taskChanged = await tx.workspacePlanTasks.updateMany({ where: { id: taskId, planId, status: task.status, revision: task.revision }, data: { status: 'running', modelId: snapshot.modelId, currentExecutionId: executionId, revision: { increment: 1 }, updatedAt: new Date() } });
    if (!taskChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_TASK_ALREADY_RUNNING');
    const previousAttempts = await tx.workspaceTaskExecutions.count({ where: { planTaskId: taskId } });
    await tx.workspaceTaskExecutions.create({ data: {
      id: executionId, planTaskId: taskId, workspaceId, userId, status: 'running', modelId: snapshot.modelId,
      requestFingerprint: fingerprint, snapshotEncrypted: encryptJson(snapshot), attemptNumber: previousAttempts + 1,
      startedAt: new Date(), heartbeatAt: new Date()
    } });
  }); } catch (error) {
    const racedExecution = await prisma.workspaceTaskExecutions.findUnique({ where: { id: executionId }, include: { task: { select: { planId: true } } } });
    if (!racedExecution) throw error;
    if (!matchesExisting(racedExecution) || racedExecution.task.planId !== planId) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_ID_CONFLICT');
    const plan = await findWorkspacePlan(workspaceId, userId, planId);
    if (!plan) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_NOT_FOUND', 404);
    return { plan, claimed: false };
  }
  const plan = await findWorkspacePlan(workspaceId, userId, planId);
  if (!plan) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_NOT_FOUND', 404);
  return { plan, claimed: true };
}

/** Atomically claims the foreground Agent loop for a previously approved task execution. */
export async function claimWorkspaceTaskAgentExecution(workspaceId: string, userId: string, planId: string, taskId: string, executionId: string): Promise<boolean> {
  const current: any = await prisma.workspaceTaskExecutions.findFirst({
    where: { id: executionId, planTaskId: taskId, workspaceId, userId, status: 'running' },
    include: { task: { select: { planId: true, currentExecutionId: true, status: true } } }
  });
  if (!current || current.task.planId !== planId || current.task.currentExecutionId !== executionId || current.task.status !== 'running') {
    throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
  }
  const now = new Date();
  const claimed = await prisma.$executeRaw`
    UPDATE "WorkspaceTaskExecutions"
    SET "agentClaimedAt" = ${now}, "heartbeatAt" = ${now}
    WHERE "id" = ${executionId} AND "planTaskId" = ${taskId} AND "workspaceId" = ${workspaceId}
      AND "userId" = ${userId} AND "status" = 'running' AND "agentClaimedAt" IS NULL
  `;
  return claimed === 1;
}

/** Creates a new, encrypted proposal artifact. The deterministic ID makes retries idempotent. */
export function workspaceAgentProposalId(executionId: string): string {
  return `agent_${createHash('sha256').update(executionId).digest('hex').slice(0, 32)}`;
}

export async function finishWorkspaceTask(workspaceId: string, userId: string, planId: string, taskId: string, executionId: string, result: { output?: string; sources?: unknown[]; executionEvents?: AgentExecutionEvent[]; outputArtifactId?: string; artifactProposal?: AgentArtifactProposal; errorCode?: string }): Promise<WorkspacePlan> {
  if (result.artifactProposal && result.errorCode) throw new WorkspaceWorkflowError('WORKSPACE_TASK_RESULT_INVALID', 400);
  if (result.outputArtifactId) {
    const artifact = await prisma.artifacts.findFirst({ where: { id: result.outputArtifactId, chatId: workspaceId, userId }, select: { id: true } });
    if (!artifact) throw new WorkspaceWorkflowError('WORKSPACE_ARTIFACT_NOT_FOUND', 404);
  }
  await prisma.$transaction(async tx => {
    const current: any = await tx.workspacePlans.findFirst({ where: { id: planId, workspaceId, userId }, include: { tasks: true } });
    if (!current) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_NOT_FOUND', 404);
    const task = current.tasks.find((item: any) => item.id === taskId);
    if (!task) throw new WorkspaceWorkflowError('WORKSPACE_TASK_NOT_FOUND', 404);
    if (task.currentExecutionId !== executionId) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
    let outputArtifactId = result.outputArtifactId;
    if (result.artifactProposal) {
      outputArtifactId = workspaceAgentProposalId(executionId);
      const existing: any = await tx.artifacts.findUnique({ where: { id: outputArtifactId }, select: { userId: true, chatId: true, title: true, type: true, content: true } });
      if (existing) {
        const existingContent = encryptionService.decryptSensitive(existing.content) || existing.content;
        if (existing.userId !== userId || existing.chatId !== workspaceId || existing.title !== result.artifactProposal.title || existing.type !== result.artifactProposal.type || existingContent !== result.artifactProposal.content) {
          throw new WorkspaceWorkflowError('WORKSPACE_TASK_ARTIFACT_CONFLICT');
        }
      } else {
        const now = new Date();
        const encryptedContent = encryptionService.encryptRequiredSensitive(result.artifactProposal.content);
        await tx.artifacts.create({
          data: {
            id: outputArtifactId, userId, chatId: workspaceId,
            title: result.artifactProposal.title.slice(0, 200), type: result.artifactProposal.type,
            language: result.artifactProposal.language?.slice(0, 80) || null,
            content: encryptedContent, version: 1, createdAt: now, updatedAt: now,
            versions: { create: [{ id: `ver_${createHash('sha256').update(executionId + ':v1').digest('hex').slice(0, 32)}`, version: 1, title: result.artifactProposal.title.slice(0, 200), content: encryptedContent, createdAt: now }] }
          }
        });
      }
    }
    const executionStatusValue = result.errorCode ? 'failed' : 'completed';
    const execution = await tx.workspaceTaskExecutions.updateMany({ where: { id: executionId, planTaskId: taskId, workspaceId, userId, status: 'running' }, data: {
      status: executionStatusValue,
      ...(result.output !== undefined ? { outputEncrypted: encryptionService.encryptRequiredSensitive(result.output) } : {}),
      ...(result.sources !== undefined ? { sourcesEncrypted: encryptJson(result.sources) } : {}),
      ...(result.executionEvents !== undefined ? { eventsEncrypted: encryptJson(result.executionEvents) } : {}),
      ...(outputArtifactId ? { outputArtifactId } : {}),
      errorCode: result.errorCode || null, finishedAt: new Date(), heartbeatAt: new Date()
    } });
    if (!execution.count) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
    const taskChanged = await tx.workspacePlanTasks.updateMany({ where: { id: taskId, planId, status: 'running', currentExecutionId: executionId, revision: task.revision }, data: { status: result.errorCode ? 'failed' : 'waiting_review', revision: { increment: 1 }, updatedAt: new Date() } });
    if (!taskChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
    const planChanged = await tx.workspacePlans.updateMany({ where: { id: planId, workspaceId, userId, revision: current.revision, status: current.status }, data: { ...(current.status === 'running' ? { status: 'approved' } : {}), revision: { increment: 1 }, updatedAt: new Date() } });
    if (!planChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_CONFLICT');
  });
  return (await findWorkspacePlan(workspaceId, userId, planId))!;
}

export async function reviewWorkspaceTask(workspaceId: string, userId: string, planId: string, taskId: string, decision: 'accept' | 'reject'): Promise<WorkspacePlan> {
  await prisma.$transaction(async tx => {
    const current: any = await tx.workspacePlans.findFirst({ where: { id: planId, workspaceId, userId }, include: { tasks: true } });
    if (!current) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_NOT_FOUND', 404);
    const task = current.tasks.find((item: any) => item.id === taskId);
    if (!task) throw new WorkspaceWorkflowError('WORKSPACE_TASK_NOT_FOUND', 404);
    if (task.status !== 'waiting_review' || !task.currentExecutionId) throw new WorkspaceWorkflowError('WORKSPACE_TASK_NOT_WAITING_REVIEW');
    const execution = await tx.workspaceTaskExecutions.findFirst({ where: { id: task.currentExecutionId, planTaskId: taskId, workspaceId, userId, status: 'completed' }, select: { id: true } });
    if (!execution) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
    const status = decision === 'accept' ? 'done' : 'todo';
    const taskChanged = await tx.workspacePlanTasks.updateMany({ where: { id: taskId, planId, status: 'waiting_review', currentExecutionId: task.currentExecutionId, revision: task.revision }, data: { status, revision: { increment: 1 }, updatedAt: new Date() } });
    if (!taskChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
    const planChanged = await tx.workspacePlans.updateMany({ where: { id: planId, workspaceId, userId, revision: current.revision, status: current.status }, data: { revision: { increment: 1 }, updatedAt: new Date() } });
    if (!planChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_CONFLICT');
  });
  return (await findWorkspacePlan(workspaceId, userId, planId))!;
}

export async function linkWorkspaceTaskArtifact(workspaceId: string, userId: string, planId: string, taskId: string, executionId: string, artifactId: string): Promise<WorkspacePlan> {
  const artifact = await prisma.artifacts.findFirst({ where: { id: artifactId, chatId: workspaceId, userId }, select: { id: true } });
  if (!artifact) throw new WorkspaceWorkflowError('WORKSPACE_ARTIFACT_NOT_FOUND', 404);
  await prisma.$transaction(async tx => {
    const plan: any = await tx.workspacePlans.findFirst({ where: { id: planId, workspaceId, userId }, include: { tasks: true } });
    if (!plan) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_NOT_FOUND', 404);
    const task = plan.tasks.find((item: any) => item.id === taskId);
    if (!task) throw new WorkspaceWorkflowError('WORKSPACE_TASK_NOT_FOUND', 404);
    if (task.currentExecutionId !== executionId) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
    const execution: any = await tx.workspaceTaskExecutions.findFirst({ where: { id: executionId, planTaskId: taskId, workspaceId, userId, status: 'completed' } });
    if (!execution) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
    if (execution.outputArtifactId && execution.outputArtifactId !== artifactId) throw new WorkspaceWorkflowError('WORKSPACE_TASK_ARTIFACT_CONFLICT');
    const executionChanged = await tx.workspaceTaskExecutions.updateMany({ where: { id: executionId, planTaskId: taskId, workspaceId, userId, status: 'completed', OR: [{ outputArtifactId: null }, { outputArtifactId: artifactId }] }, data: { outputArtifactId: artifactId } });
    if (!executionChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_TASK_ARTIFACT_CONFLICT');
    const planChanged = await tx.workspacePlans.updateMany({ where: { id: planId, workspaceId, userId, revision: plan.revision, status: plan.status }, data: { revision: { increment: 1 }, updatedAt: new Date() } });
    if (!planChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_CONFLICT');
  });
  return (await findWorkspacePlan(workspaceId, userId, planId))!;
}

export async function transitionWorkspacePlan(workspaceId: string, userId: string, planId: string, action: 'approve' | 'pause' | 'resume' | 'cancel' | 'complete'): Promise<WorkspacePlan> {
  await prisma.$transaction(async tx => {
    const current: any = await tx.workspacePlans.findFirst({ where: { id: planId, workspaceId, userId }, include: { tasks: true } });
    if (!current) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_NOT_FOUND', 404);
    let nextStatus: string;
    if (action === 'approve' && current.status === 'draft') nextStatus = 'approved';
    else if (action === 'pause' && ['approved', 'running'].includes(current.status)) nextStatus = 'paused';
    else if (action === 'resume' && current.status === 'paused') nextStatus = 'approved';
    else if (action === 'cancel' && ['draft', 'approved', 'running', 'paused'].includes(current.status)) nextStatus = 'cancelled';
    else if (action === 'complete' && (!current.tasks.length || !current.tasks.every((task: any) => task.status === 'done'))) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_INCOMPLETE');
    else if (action === 'complete' && ['approved', 'running'].includes(current.status)) nextStatus = 'completed';
    else throw new WorkspaceWorkflowError('WORKSPACE_PLAN_TRANSITION_INVALID');
    if (action === 'cancel') {
      const runningTasks = current.tasks.filter((task: any) => task.status === 'running' && task.currentExecutionId);
      for (const task of runningTasks) {
        const executionChanged = await tx.workspaceTaskExecutions.updateMany({ where: { id: task.currentExecutionId, planTaskId: task.id, workspaceId, userId, status: 'running' }, data: { status: 'cancelled', errorCode: 'WORKSPACE_PLAN_CANCELLED', finishedAt: new Date() } });
        if (!executionChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
        const taskChanged = await tx.workspacePlanTasks.updateMany({ where: { id: task.id, planId, status: 'running', currentExecutionId: task.currentExecutionId, revision: task.revision }, data: { status: 'cancelled', revision: { increment: 1 }, updatedAt: new Date() } });
        if (!taskChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
      }
    }
    const planChanged = await tx.workspacePlans.updateMany({ where: { id: planId, workspaceId, userId, revision: current.revision, status: current.status }, data: { status: nextStatus, revision: { increment: 1 }, updatedAt: new Date(), ...(nextStatus === 'completed' ? { completedAt: new Date() } : {}) } });
    if (!planChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_CONFLICT');
  });
  return (await findWorkspacePlan(workspaceId, userId, planId))!;
}

export async function cancelWorkspaceTaskExecution(workspaceId: string, userId: string, planId: string, taskId: string, executionId: string): Promise<WorkspacePlan> {
  await prisma.$transaction(async tx => {
    const plan: any = await tx.workspacePlans.findFirst({ where: { id: planId, workspaceId, userId }, include: { tasks: true } });
    if (!plan) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_NOT_FOUND', 404);
    const task = plan.tasks.find((item: any) => item.id === taskId);
    if (!task) throw new WorkspaceWorkflowError('WORKSPACE_TASK_NOT_FOUND', 404);
    if (task.currentExecutionId !== executionId) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
    const changed = await tx.workspaceTaskExecutions.updateMany({ where: { id: executionId, planTaskId: taskId, workspaceId, userId, status: 'running' }, data: { status: 'cancelled', errorCode: 'WORKSPACE_EXECUTION_CANCELLED', finishedAt: new Date() } });
    if (!changed.count) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
    const taskChanged = await tx.workspacePlanTasks.updateMany({ where: { id: taskId, planId, status: 'running', currentExecutionId: executionId, revision: task.revision }, data: { status: 'todo', revision: { increment: 1 }, updatedAt: new Date() } });
    if (!taskChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
    const planChanged = await tx.workspacePlans.updateMany({ where: { id: planId, workspaceId, userId, revision: plan.revision, status: plan.status }, data: { ...(plan.status === 'running' ? { status: 'approved' } : {}), revision: { increment: 1 }, updatedAt: new Date() } });
    if (!planChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_CONFLICT');
  });
  return (await findWorkspacePlan(workspaceId, userId, planId))!;
}

export async function recoverWorkspaceTask(workspaceId: string, userId: string, planId: string, taskId: string, executionId: string): Promise<WorkspacePlan> {
  await prisma.$transaction(async tx => {
    const plan: any = await tx.workspacePlans.findFirst({ where: { id: planId, workspaceId, userId }, include: { tasks: true } });
    if (!plan) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_NOT_FOUND', 404);
    const task = plan.tasks.find((item: any) => item.id === taskId);
    if (!task) throw new WorkspaceWorkflowError('WORKSPACE_TASK_NOT_FOUND', 404);
    if (task.status !== 'running' || task.currentExecutionId !== executionId) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
    const changed = await tx.workspaceTaskExecutions.updateMany({ where: { id: executionId, planTaskId: taskId, workspaceId, userId, status: 'running' }, data: { status: 'interrupted', errorCode: 'WORKSPACE_EXECUTION_INTERRUPTED', finishedAt: new Date() } });
    if (!changed.count) throw new WorkspaceWorkflowError('WORKSPACE_EXECUTION_NOT_FOUND', 404);
    const taskChanged = await tx.workspacePlanTasks.updateMany({ where: { id: taskId, planId, status: 'running', currentExecutionId: executionId, revision: task.revision }, data: { status: 'failed', revision: { increment: 1 }, updatedAt: new Date() } });
    if (!taskChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_TASK_EXECUTION_STALE');
    const planChanged = await tx.workspacePlans.updateMany({ where: { id: planId, workspaceId, userId, revision: plan.revision, status: plan.status }, data: { status: plan.status === 'paused' ? 'paused' : 'approved', revision: { increment: 1 }, updatedAt: new Date() } });
    if (!planChanged.count) throw new WorkspaceWorkflowError('WORKSPACE_PLAN_CONFLICT');
  });
  return (await findWorkspacePlan(workspaceId, userId, planId))!;
}
