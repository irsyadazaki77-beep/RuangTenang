import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../database.js';
import { encryptionService } from '../../services/encryptionService.js';
import {
  createWorkspacePlan,
  findWorkspacePlan,
  finishWorkspaceTask,
  reviewWorkspaceTask,
  startWorkspaceTask,
  transitionWorkspacePlan,
  updateDraftPlan,
  backfillLegacyPlan,
  claimWorkspaceTaskAgentExecution,
  workspaceAgentProposalId
} from '../../services/workspaceWorkflowService.js';

const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const userId = `workflow-user-${suffix}`;
const otherUserId = `workflow-other-${suffix}`;
const chatId = `workflow-chat-${suffix}`;
const workspaceId = chatId;
const timestamp = new Date().toISOString();
const firstTaskId = `workflow-task-a-${suffix}`;
const secondTaskId = `workflow-task-b-${suffix}`;
const planId = `workflow-plan-${suffix}`;
const legacyPlanId = `workflow-legacy-plan-${suffix}`;
const legacyTaskId = `workflow-legacy-task-${suffix}`;
const taskPrompt = `private workflow prompt ${suffix}`;
const taskOutput = `private workflow output ${suffix}`;

async function seedWorkspaceOwner(id: string, emailSuffix: string) {
  await prisma.$executeRaw`INSERT INTO "Users" ("id", "name", "email", "passwordHash") VALUES (${id}, 'Workflow Test', ${`workflow-${emailSuffix}@example.test`}, 'test-hash')`;
}

async function createWorkspaceRows() {
  await seedWorkspaceOwner(userId, suffix);
  await seedWorkspaceOwner(otherUserId, `other-${suffix}`);
  await prisma.$executeRaw`INSERT INTO "Chats" ("id", "userId", "title", "workspaceMode", "updatedAt") VALUES (${chatId}, ${userId}, 'Workflow test', 'RUANG_KERJA', ${new Date()})`;
  await prisma.$executeRaw`INSERT INTO "Workspaces" ("chatId", "settings", "updatedAt") VALUES (${chatId}, '{}', ${new Date()})`;
}

describe('Workspace Agent normalized persistence integration', () => {
  beforeAll(async () => { await createWorkspaceRows(); });
  afterAll(async () => {
    await prisma.workspacePlans.deleteMany({ where: { id: { in: [planId, legacyPlanId] }, workspaceId } });
    await prisma.workspaces.deleteMany({ where: { chatId: workspaceId } });
    await prisma.chats.deleteMany({ where: { id: chatId } });
    await prisma.users.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  });

  it('persists attempts encrypted, enforces dependency and owner scope, preserves rejected outputs, and completes only after review', async () => {
    const draft = await createWorkspacePlan(workspaceId, userId, {
      id: planId, title: 'Integration report', goal: 'Create a reviewed report', status: 'draft', revision: 1,
      createdAt: timestamp, updatedAt: timestamp,
      tasks: [
        { id: firstTaskId, title: 'Analyze input', type: 'analysis', dependsOn: [], status: 'todo' },
        { id: secondTaskId, title: 'Write report', type: 'writing', dependsOn: [firstTaskId], status: 'todo' }
      ]
    });
    const approved = await updateDraftPlan(workspaceId, userId, { ...draft, status: 'approved' });
    const snapshot = { inputPrompt: taskPrompt, contextSourceIds: [], modelId: 'auto', createdAt: timestamp };

    await expect(startWorkspaceTask(workspaceId, userId, planId, secondTaskId, `blocked-${suffix}`, snapshot))
      .rejects.toMatchObject({ code: 'WORKSPACE_TASK_DEPENDENCY_BLOCKED' });
    const firstStart = await startWorkspaceTask(workspaceId, userId, planId, firstTaskId, `exec-a-${suffix}`, snapshot);
    expect(firstStart.claimed).toBe(true);
    const duplicateStart = await startWorkspaceTask(workspaceId, userId, planId, firstTaskId, `exec-a-${suffix}`, snapshot);
    expect(duplicateStart.claimed).toBe(false);
    expect(await prisma.workspaceTaskExecutions.count({ where: { planTaskId: firstTaskId } })).toBe(1);
    await expect(claimWorkspaceTaskAgentExecution(workspaceId, userId, planId, firstTaskId, `exec-a-${suffix}`)).resolves.toBe(true);
    await expect(claimWorkspaceTaskAgentExecution(workspaceId, userId, planId, firstTaskId, `exec-a-${suffix}`)).resolves.toBe(false);
    await expect(startWorkspaceTask(workspaceId, userId, planId, firstTaskId, `exec-a-${suffix}`, { ...snapshot, inputPrompt: 'different request' }))
      .rejects.toMatchObject({ code: 'WORKSPACE_TASK_EXECUTION_ID_CONFLICT' });

    const encryptedAttempt = await prisma.workspaceTaskExecutions.findUnique({ where: { id: `exec-a-${suffix}` } });
    expect(encryptedAttempt?.snapshotEncrypted).not.toContain(taskPrompt);
    expect(encryptionService.decryptSensitive(encryptedAttempt!.snapshotEncrypted)).toContain(taskPrompt);
    const executionEvents = [{ step: 1, kind: 'model_decision' as const, status: 'completed' as const, durationMs: 15 }];
    await finishWorkspaceTask(workspaceId, userId, planId, firstTaskId, `exec-a-${suffix}`, { output: taskOutput, executionEvents });
    const waitingReview = await findWorkspacePlan(workspaceId, userId, planId);
    expect(waitingReview?.tasks[0]).toMatchObject({ status: 'waiting_review', output: taskOutput, executionEvents });
    const finishedExecution = await prisma.workspaceTaskExecutions.findUnique({ where: { id: `exec-a-${suffix}` } });
    expect(finishedExecution).toMatchObject({ status: 'completed' });
    expect(finishedExecution?.eventsEncrypted).not.toContain('model_decision');
    expect(JSON.parse(encryptionService.decryptSensitive(finishedExecution!.eventsEncrypted)!)).toEqual(executionEvents);
    await expect(transitionWorkspacePlan(workspaceId, userId, planId, 'complete')).rejects.toMatchObject({ code: 'WORKSPACE_PLAN_INCOMPLETE' });
    const firstAccepted = await reviewWorkspaceTask(workspaceId, userId, planId, firstTaskId, 'accept');
    expect(firstAccepted.tasks[0].status).toBe('done');
    await expect(reviewWorkspaceTask(workspaceId, userId, planId, firstTaskId, 'accept')).resolves.toMatchObject({ revision: firstAccepted.revision });
    await expect(reviewWorkspaceTask(workspaceId, userId, planId, firstTaskId, 'reject')).rejects.toMatchObject({ code: 'WORKSPACE_TASK_NOT_WAITING_REVIEW' });

    await expect(findWorkspacePlan(workspaceId, otherUserId, planId)).resolves.toBeNull();
    await expect(startWorkspaceTask(workspaceId, otherUserId, planId, secondTaskId, `cross-${suffix}`, snapshot))
      .rejects.toMatchObject({ code: 'WORKSPACE_PLAN_NOT_FOUND' });

    await startWorkspaceTask(workspaceId, userId, planId, secondTaskId, `exec-b1-${suffix}`, snapshot);
    await finishWorkspaceTask(workspaceId, userId, planId, secondTaskId, `exec-b1-${suffix}`, { output: 'first draft remains in history' });
    const rejected = await reviewWorkspaceTask(workspaceId, userId, planId, secondTaskId, 'reject');
    expect(rejected.tasks[1]).toMatchObject({ status: 'todo', output: 'first draft remains in history' });
    await expect(reviewWorkspaceTask(workspaceId, userId, planId, secondTaskId, 'reject')).resolves.toMatchObject({ revision: rejected.revision });

    await startWorkspaceTask(workspaceId, userId, planId, secondTaskId, `exec-b2-${suffix}`, { ...snapshot, inputPrompt: `${taskPrompt} retry`, createdAt: new Date(Date.now() + 1).toISOString() });
    const staleProposalId = workspaceAgentProposalId(`exec-b1-${suffix}`);
    await expect(finishWorkspaceTask(workspaceId, userId, planId, secondTaskId, `exec-b1-${suffix}`, {
      output: 'stale response', artifactProposal: { title: 'Stale proposal', type: 'DOCUMENT', content: 'must not persist' }
    }))
      .rejects.toMatchObject({ code: 'WORKSPACE_TASK_EXECUTION_STALE' });
    await expect(prisma.artifacts.findUnique({ where: { id: staleProposalId } })).resolves.toBeNull();
    const proposal = { title: 'Reviewed Agent proposal', type: 'DOCUMENT' as const, content: 'proposal content with verified evidence' };
    await finishWorkspaceTask(workspaceId, userId, planId, secondTaskId, `exec-b2-${suffix}`, {
      output: 'reviewed final draft', artifactProposal: proposal
    });
    const pendingProposal = await findWorkspacePlan(workspaceId, userId, planId);
    expect(pendingProposal?.tasks[1]).toMatchObject({ status: 'waiting_review', artifactProposal: proposal });
    const uncommittedProposal = await prisma.artifacts.findUnique({ where: { id: workspaceAgentProposalId(`exec-b2-${suffix}`) } });
    expect(uncommittedProposal).toBeNull();
    const accepted = await reviewWorkspaceTask(workspaceId, userId, planId, secondTaskId, 'accept');
    const proposalArtifactId = workspaceAgentProposalId(`exec-b2-${suffix}`);
    expect(accepted.tasks[1]).toMatchObject({ status: 'done', output: 'reviewed final draft', outputArtifactId: proposalArtifactId });
    const storedProposal = await prisma.artifacts.findUnique({ where: { id: proposalArtifactId } });
    expect(storedProposal).toMatchObject({ userId, chatId: workspaceId, title: proposal.title, type: proposal.type });
    expect(encryptionService.decryptSensitive(storedProposal!.content)).toBe(proposal.content);
    expect(accepted.tasks[1].executionHistory).toHaveLength(2);
    const completed = await transitionWorkspacePlan(workspaceId, userId, planId, 'complete');
    expect(completed.status).toBe('completed');
    expect(approved.revision).toBeLessThan(completed.revision!);

    const storedOutput = await prisma.workspaceTaskExecutions.findUnique({ where: { id: `exec-b2-${suffix}` } });
    expect(storedOutput?.outputEncrypted).not.toContain('reviewed final draft');
    expect(encryptionService.decryptSensitive(storedOutput!.outputEncrypted!)).toBe('reviewed final draft');
  });

  it('backfills a legacy running plan idempotently without resetting its execution', async () => {
    const executionId = `legacy-exec-${suffix}`;
    const legacyPlan = {
      id: legacyPlanId,
      title: 'Legacy plan',
      goal: 'Preserve the in-flight task',
      status: 'running',
      revision: 4,
      createdAt: timestamp,
      updatedAt: timestamp,
      tasks: [{
        id: legacyTaskId,
        title: 'Legacy running task',
        type: 'analysis',
        dependsOn: [],
        status: 'running',
        executionId,
        snapshot: { inputPrompt: taskPrompt, contextSourceIds: [], modelId: 'auto', createdAt: timestamp },
        executionHistory: [{ executionId, modelId: 'auto', startedAt: timestamp, status: 'running' }]
      }]
    };

    const first = await backfillLegacyPlan(workspaceId, userId, legacyPlan);
    const second = await backfillLegacyPlan(workspaceId, userId, legacyPlan);

    expect(first.status).toBe('running');
    expect(second.tasks[0]).toMatchObject({ status: 'running', executionId });
    expect(await prisma.workspaceTaskExecutions.count({ where: { planTaskId: legacyTaskId } })).toBe(1);
    const stored = await prisma.workspaceTaskExecutions.findUnique({ where: { id: executionId } });
    expect(stored?.snapshotEncrypted).not.toContain(taskPrompt);
    expect(encryptionService.decryptSensitive(stored!.snapshotEncrypted)).toContain(taskPrompt);
  });
});
