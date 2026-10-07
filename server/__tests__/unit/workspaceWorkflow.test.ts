import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const db = vi.hoisted(() => ({
  chatsFindFirst: vi.fn(), workspaceFindUnique: vi.fn(), workspaceUpdate: vi.fn(), workspaceUpdateMany: vi.fn(), chatsUpdate: vi.fn(), attachmentsFindMany: vi.fn(), attachmentsFindFirst: vi.fn(), attachmentsUpdate: vi.fn()
}));
vi.mock('../../database.js', () => ({ prisma: {
  chats: { findFirst: db.chatsFindFirst, update: db.chatsUpdate },
  workspaces: { findUnique: db.workspaceFindUnique, update: db.workspaceUpdate, updateMany: db.workspaceUpdateMany },
  attachments: { findMany: db.attachmentsFindMany, findFirst: db.attachmentsFindFirst, update: db.attachmentsUpdate }
} }));
vi.mock('../../middleware/auth.js', () => ({ requireAuth: (req: any, _res: any, next: () => void) => { req.user = { userId: req.header('x-test-user') || 'user-a' }; next(); } }));
vi.mock('../../services/encryptionService.js', () => ({ encryptionService: { encryptSensitive: (value: string) => value, decryptSensitive: (value: string) => value } }));
vi.mock('../../security.js', () => ({ sanitizeInput: (value: string) => value }));

import workspaceRouter from '../../routes/workspace.js';

const app = express(); app.use(express.json()); app.use('/api/v1/workspace', workspaceRouter);
const now = '2026-10-06T00:00:00.000Z';
const plan = (status: string, tasks = [
  { id: 't1', title: 'Analisis sumber', type: 'analysis', dependsOn: [], status: 'todo' },
  { id: 't2', title: 'Tulis ringkasan', type: 'writing', dependsOn: ['t1'], status: 'todo' }
]) => ({ id: 'p1', goal: 'Buat ringkasan', title: 'Ringkasan sumber', status, tasks, createdAt: now, updatedAt: now });
let row: any;

describe('Workspace workflow authorization and task execution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    row = { chatId: 'chat-a', settings: JSON.stringify({ agentWorkflow: { version: 1, plan: plan('draft') } }), createdAt: new Date(now), updatedAt: new Date(now) };
    db.chatsFindFirst.mockImplementation(({ where }: any) => where.userId === 'user-a' && where.id === 'chat-a' ? { id: 'chat-a', title: 'Workspace', updatedAt: new Date(now) } : null);
    db.workspaceFindUnique.mockImplementation(({ where }: any) => where.chatId === 'chat-a' ? row : null);
    db.workspaceUpdateMany.mockImplementation(async ({ data }: any) => { row = { ...row, ...data }; return { count: 1 }; });
    db.workspaceUpdate.mockImplementation(async ({ data }: any) => { row = { ...row, ...data }; return row; });
    db.chatsUpdate.mockResolvedValue({});
    db.attachmentsFindMany.mockResolvedValue([{ id: 'file-a', filename: 'paper.pdf', fileKind: 'pdf', metadata: '{"pageCount":4}', createdAt: new Date(now) }]);
    db.attachmentsFindFirst.mockResolvedValue({ id: 'file-a', filename: 'paper.pdf', metadata: '{"pageCount":4}', createdAt: new Date(now) });
    db.attachmentsUpdate.mockResolvedValue({});
  });

  it('rejects execution until the plan is approved', async () => {
    await request(app).post('/api/v1/workspace/chat-a/plans/p1/tasks/t1/run').set('x-test-user', 'user-a').send({ executionId: 'exec-a', snapshot: { inputPrompt: 'run', contextSourceIds: [], modelId: 'auto', createdAt: now } }).expect(409).expect(({ body }) => expect(body.code).toBe('WORKSPACE_PLAN_NOT_APPROVED'));
    expect(db.workspaceUpdateMany).not.toHaveBeenCalled();
  });

  it('blocks tasks whose dependencies are incomplete', async () => {
    row.settings = JSON.stringify({ agentWorkflow: { version: 1, plan: plan('approved') } });
    await request(app).post('/api/v1/workspace/chat-a/plans/p1/tasks/t2/run').set('x-test-user', 'user-a').send({ executionId: 'exec-b', snapshot: { inputPrompt: 'run', contextSourceIds: [], modelId: 'auto', createdAt: now } }).expect(409).expect(({ body }) => expect(body.code).toBe('WORKSPACE_TASK_DEPENDENCY_BLOCKED'));
  });

  it('claims one approved task with an immutable execution snapshot', async () => {
    row.settings = JSON.stringify({ agentWorkflow: { version: 1, plan: plan('approved') } });
    const snapshot = { inputPrompt: 'Analyze only source A', contextSourceIds: ['file-a'], artifactContext: 'Canvas v2', modelId: 'model-x', createdAt: now };
    const response = await request(app).post('/api/v1/workspace/chat-a/plans/p1/tasks/t1/run').set('x-test-user', 'user-a').send({ executionId: 'exec-a', snapshot }).expect(202);
    expect(response.body.data.status).toBe('running');
    expect(response.body.data.tasks[0]).toMatchObject({ status: 'running', executionId: 'exec-a', snapshot });
    expect(db.workspaceUpdateMany).toHaveBeenCalledOnce();
  });

  it('scopes plan execution to the authenticated Workspace owner', async () => {
    await request(app).post('/api/v1/workspace/chat-b/plans/p1/tasks/t1/run').set('x-test-user', 'user-a').send({ executionId: 'exec-a', snapshot: { inputPrompt: 'run', contextSourceIds: [], modelId: 'auto', createdAt: now } }).expect(404);
    expect(db.workspaceUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects cyclic plan dependencies during schema validation', async () => {
    const cyclic = plan('draft', [
      { id: 'a', title: 'A', type: 'analysis', dependsOn: ['b'], status: 'todo' },
      { id: 'b', title: 'B', type: 'writing', dependsOn: ['a'], status: 'todo' }
    ]);
    await request(app).post('/api/v1/workspace/chat-a/plans').set('x-test-user', 'user-a').send(cyclic).expect(400);
    expect(db.workspaceUpdate).not.toHaveBeenCalled();
  });

  it('returns only owned workspace files as sources and preserves unknown metadata as unknown', async () => {
    const response = await request(app).get('/api/v1/workspace/chat-a/sources').set('x-test-user', 'user-a').expect(200);
    expect(response.body.data[0]).toMatchObject({ id: 'file-a', title: 'paper.pdf', pageCount: 4, metadataConfidence: 'unknown', provenance: 'uploaded file' });
    expect(response.body.data[0]).not.toHaveProperty('author');
    expect(db.attachmentsFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { chatId: 'chat-a', userId: 'user-a', status: 'ready' } }));
  });

  it('rejects a source from outside the owned Workspace and rejects malformed DOI metadata', async () => {
    db.attachmentsFindFirst.mockResolvedValue(null);
    await request(app).put('/api/v1/workspace/chat-a/sources/file-other').set('x-test-user', 'user-a').send({ title: 'A', doi: '10.nope/fake' }).expect(400);
    await request(app).put('/api/v1/workspace/chat-a/sources/file-other').set('x-test-user', 'user-a').send({ title: 'A' }).expect(404);
    expect(db.attachmentsUpdate).not.toHaveBeenCalled();
  });
});
