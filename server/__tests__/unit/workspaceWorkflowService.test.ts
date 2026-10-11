import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  workspacePlans: { findFirst: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  workspacePlanTasks: { create: vi.fn(), createMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
  workspaceTaskDependencies: { createMany: vi.fn() },
  workspaceTaskExecutions: { findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn() },
  attachments: { findMany: vi.fn() },
  artifacts: { findFirst: vi.fn() },
  $transaction: vi.fn()
}));

vi.mock('../../database.js', () => ({ prisma: db }));
vi.mock('../../services/encryptionService.js', () => ({ encryptionService: {
  encryptRequiredSensitive: (value: string) => `cipher:${Buffer.from(value).toString('base64')}`,
  decryptSensitive: (value: string) => value.startsWith('cipher:') ? Buffer.from(value.slice('cipher:'.length), 'base64').toString() : value,
  isEncrypted: (value: string) => value.startsWith('cipher:')
} }));
vi.mock('../../services/ai/aiModelRegistry.js', () => ({ getPublicModelCatalog: () => [{ id: 'model-a', selectable: true }] }));

import { backfillLegacyPlan, startWorkspaceTask, finishWorkspaceTask } from '../../services/workspaceWorkflowService.js';

const timestamp = new Date('2026-10-10T00:00:00.000Z');
const snapshot = { inputPrompt: 'private task prompt', contextSourceIds: [], modelId: 'auto', createdAt: timestamp.toISOString() };
const planRecord = () => ({
  id: 'plan-a', workspaceId: 'workspace-a', userId: 'user-a', titleEncrypted: `cipher:${Buffer.from('Title').toString('base64')}`,
  goalEncrypted: `cipher:${Buffer.from('Goal').toString('base64')}`, status: 'approved', revision: 1, createdAt: timestamp, updatedAt: timestamp,
  tasks: [{ id: 'task-a', planId: 'plan-a', titleEncrypted: `cipher:${Buffer.from('Task').toString('base64')}`, taskType: 'analysis', position: 0, status: 'todo', revision: 1, createdAt: timestamp, updatedAt: timestamp, dependencies: [], executions: [] }]
});

describe('normalized Workspace workflow execution service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation(async (callback: (client: typeof db) => unknown) => callback(db));
    db.workspacePlans.findFirst.mockResolvedValue(planRecord());
    db.workspaceTaskExecutions.findUnique.mockResolvedValue(null);
    db.workspacePlans.updateMany.mockResolvedValue({ count: 1 });
    db.workspacePlanTasks.updateMany.mockResolvedValue({ count: 1 });
    db.workspaceTaskExecutions.count.mockResolvedValue(0);
    db.workspaceTaskExecutions.create.mockResolvedValue({});
    db.attachments.findMany.mockResolvedValue([]);
    db.artifacts.findFirst.mockResolvedValue(null);
  });

  it('atomically claims one attempt and stores its snapshot encrypted', async () => {
    const result = await startWorkspaceTask('workspace-a', 'user-a', 'plan-a', 'task-a', 'execution-a', snapshot);

    expect(result.claimed).toBe(true);
    expect(db.workspacePlans.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ revision: 1, userId: 'user-a', workspaceId: 'workspace-a' }) }));
    expect(db.workspaceTaskExecutions.create).toHaveBeenCalledOnce();
    const execution = db.workspaceTaskExecutions.create.mock.calls[0][0].data;
    expect(execution).toMatchObject({ id: 'execution-a', planTaskId: 'task-a', workspaceId: 'workspace-a', userId: 'user-a', status: 'running', attemptNumber: 1 });
    expect(execution.snapshotEncrypted).not.toContain('private task prompt');
    expect(Buffer.from(execution.snapshotEncrypted.slice('cipher:'.length), 'base64').toString()).toContain('private task prompt');
  });

  it('returns an existing identical execution without claiming a second attempt', async () => {
    const fingerprint = await (async () => {
      const crypto = await import('node:crypto');
      return crypto.createHash('sha256').update(JSON.stringify({ workspaceId: 'workspace-a', userId: 'user-a', planId: 'plan-a', taskId: 'task-a', snapshot })).digest('hex');
    })();
    db.workspaceTaskExecutions.findUnique.mockResolvedValue({ id: 'execution-a', planTaskId: 'task-a', workspaceId: 'workspace-a', userId: 'user-a', requestFingerprint: fingerprint, task: { planId: 'plan-a' } });

    const result = await startWorkspaceTask('workspace-a', 'user-a', 'plan-a', 'task-a', 'execution-a', snapshot);

    expect(result.claimed).toBe(false);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.workspaceTaskExecutions.create).not.toHaveBeenCalled();
  });

  it('rejects an execution ID reused with a different payload or owner', async () => {
    db.workspaceTaskExecutions.findUnique.mockResolvedValue({ id: 'execution-a', planTaskId: 'task-a', workspaceId: 'workspace-b', userId: 'user-a', requestFingerprint: 'different', task: { planId: 'plan-a' } });

    await expect(startWorkspaceTask('workspace-a', 'user-a', 'plan-a', 'task-a', 'execution-a', snapshot)).rejects.toMatchObject({ code: 'WORKSPACE_TASK_EXECUTION_ID_CONFLICT' });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a concurrent claim when the atomic plan revision compare-and-swap loses', async () => {
    db.workspacePlans.updateMany.mockResolvedValue({ count: 0 });

    await expect(startWorkspaceTask('workspace-a', 'user-a', 'plan-a', 'task-a', 'execution-a', snapshot))
      .rejects.toMatchObject({ code: 'WORKSPACE_TASK_ALREADY_RUNNING' });
    expect(db.workspaceTaskExecutions.create).not.toHaveBeenCalled();
  });

  it('does not let an obsolete completion overwrite the current execution', async () => {
    db.workspacePlans.findFirst.mockResolvedValue({ ...planRecord(), status: 'running', tasks: [{ ...planRecord().tasks[0], status: 'running', currentExecutionId: 'execution-new' }] });

    await expect(finishWorkspaceTask('workspace-a', 'user-a', 'plan-a', 'task-a', 'execution-old', { output: 'stale' }))
      .rejects.toMatchObject({ code: 'WORKSPACE_TASK_EXECUTION_STALE' });
    expect(db.workspaceTaskExecutions.updateMany).not.toHaveBeenCalled();
  });

  it('backfills a legacy running attempt without resetting it and skips a duplicate backfill', async () => {
    const legacy = {
      id: 'legacy-plan', title: 'Legacy title', goal: 'Legacy goal', status: 'running', createdAt: timestamp.toISOString(), updatedAt: timestamp.toISOString(),
      tasks: [{ id: 'legacy-task', title: 'Legacy task', type: 'analysis', dependsOn: [], status: 'running', executionId: 'legacy-execution', modelId: 'auto', snapshot, createdAt: timestamp.toISOString(), updatedAt: timestamp.toISOString() }]
    };
    db.workspacePlans.findUnique.mockResolvedValueOnce(null).mockResolvedValue({ id: 'legacy-plan', workspaceId: 'workspace-a', userId: 'user-a' });

    await backfillLegacyPlan('workspace-a', 'user-a', legacy);

    expect(db.workspacePlans.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ id: 'legacy-plan', status: 'running', revision: 1 }) }));
    expect(db.workspacePlanTasks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ id: 'legacy-task', status: 'running', currentExecutionId: 'legacy-execution' }) }));
    expect(db.workspaceTaskExecutions.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ id: 'legacy-execution', status: 'running', workspaceId: 'workspace-a', userId: 'user-a' }) }));

    await backfillLegacyPlan('workspace-a', 'user-a', legacy);
    expect(db.workspacePlans.create).toHaveBeenCalledOnce();
  });
});
