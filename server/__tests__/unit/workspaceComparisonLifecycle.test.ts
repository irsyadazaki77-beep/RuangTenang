import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { __clearComparisonSnapshotsForTests } from '../../services/ai/comparisonSnapshotStore.js';

const mocks = vi.hoisted(() => ({
  chatsFindFirst: vi.fn(), chatsCreate: vi.fn(), chatsUpdate: vi.fn(), messagesFindMany: vi.fn(), messagesCreate: vi.fn(), transaction: vi.fn(),
  getUser: vi.fn(), consent: vi.fn(), buildContext: vi.fn(), generate: vi.fn(), validateCandidates: vi.fn(), usage: vi.fn(), rollback: vi.fn(),
  savedMessages: [] as Array<Record<string, unknown>>, contextCalls: [] as unknown[], modelCalls: [] as unknown[]
}));

vi.mock('../../database.js', () => ({
  prisma: {
    chats: { findFirst: mocks.chatsFindFirst, create: mocks.chatsCreate, update: mocks.chatsUpdate },
    chatMessages: { findMany: mocks.messagesFindMany, create: mocks.messagesCreate },
    $transaction: mocks.transaction
  },
  serverDb: { getUserById: mocks.getUser }
}));
vi.mock('../../middleware/auth.js', () => ({ optionalAuth: (req: any, _res: any, next: () => void) => { req.user = { userId: req.header('x-test-user') || 'user-a', tier: 'Pro', role: 'student' }; next(); } }));
vi.mock('../../middleware/aiAbuseLimiter.js', () => ({ aiAbuseLimiter: (_req: any, _res: any, next: () => void) => next() }));
vi.mock('../../middleware/rateLimiters.js', () => ({ aiChatLimiter: (_req: any, _res: any, next: () => void) => next() }));
vi.mock('../../security.js', () => ({ sanitizeInput: (value: string) => value }));
vi.mock('../../services/piiService.js', () => ({ scanAndSanitizePII: (text: string) => ({ sanitizedText: text }) }));
vi.mock('../../services/aiUsageLimiter.js', () => ({ checkUserAiUsageLimit: mocks.usage, rollbackUserAiQuota: mocks.rollback }));
vi.mock('../../services/consentService.js', () => ({ consentService: { getUserConsents: mocks.consent } }));
vi.mock('../../services/encryptionService.js', () => ({ encryptionService: { encryptSensitive: (value: string) => value, decryptSensitive: (value: string) => value } }));
vi.mock('../../services/ai/aiContextBuilder.js', () => ({
  RUANG_KERJA_SYSTEM_PROMPT: 'Workspace system',
  aiContextBuilder: { buildContext: mocks.buildContext }
}));
vi.mock('../../services/ai/aiRequestService.js', () => ({ aiRequestService: { generateStreamResponse: mocks.generate } }));
vi.mock('../../services/ai/aiSafetyService.js', () => ({ aiSafetyService: {
  detectPromptInjection: () => false, detectCrisis: () => ({ isCrisis: false }), getCrisisSafeResponse: () => '', validateOutput: () => ({ isValid: true })
} }));
vi.mock('../../services/ai/aiModelRegistry.js', () => ({ getModelDefinition: (id: string) => ({ id, name: id, provider: id.startsWith('gemini') ? 'gemini' : 'deepseek' }) }));
vi.mock('../../services/ai/comparisonValidation.js', () => ({
  ComparisonValidationError: class extends Error { code = 'MODEL_NOT_FOUND'; },
  validateComparisonCandidates: (ids: string[]) => mocks.validateCandidates(ids),
  reserveComparisonQuota: async (count: number) => ({ allowed: true, reservations: Array(count).fill(true) })
}));

import workspaceComparisonRouter from '../../routes/workspaceComparison.js';

const app = express();
app.use(express.json());
app.use('/api/v1', workspaceComparisonRouter);
const comparisonId = '11111111-1111-4111-8111-111111111111';
const snapshotId = '22222222-2222-4222-8222-222222222222';

describe('Workspace comparison immutable snapshot lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __clearComparisonSnapshotsForTests();
    mocks.savedMessages.length = 0; mocks.contextCalls.length = 0; mocks.modelCalls.length = 0;
    mocks.getUser.mockResolvedValue({ tier: 'Pro', role: 'student' });
    mocks.chatsFindFirst.mockResolvedValue({ id: 'chat-a', userId: 'user-a' });
    mocks.chatsCreate.mockImplementation(({ data }: any) => Promise.resolve(data));
    mocks.chatsUpdate.mockResolvedValue({});
    mocks.messagesFindMany.mockImplementation(({ where }: any) => Promise.resolve(where.id?.in ? mocks.savedMessages.filter(message => where.id.in.includes(message.id) && message.chatId === where.chatId) : []));
    mocks.messagesCreate.mockImplementation(({ data }: any) => { mocks.savedMessages.push(data); return Promise.resolve(data); });
    mocks.transaction.mockImplementation((operations: Promise<unknown>[]) => Promise.all(operations));
    mocks.consent.mockResolvedValue({ consentForAI: true });
    mocks.buildContext.mockImplementation(async () => {
      mocks.contextCalls.push(true);
      return { systemContext: 'shared document context', recentHistory: [{ role: 'user', parts: [{ text: 'same recent history' }] }], documentContextSnapshot: { id: 'docs-1', query: 'prompt', createdAt: new Date().toISOString(), selectedAttachmentIds: [], selectedChunks: [], sourceReferences: [], tokenBudget: 2500, totalTokensUsed: 0 } };
    });
    mocks.validateCandidates.mockImplementation((ids: string[]) => ids.map(id => ({ id, name: id, provider: id.startsWith('gemini') ? 'gemini' : 'deepseek' })));
    mocks.generate.mockImplementation(async ({ requestedModelId, prompt, history, systemInstruction }: any) => {
      mocks.modelCalls.push({ requestedModelId, prompt, history: structuredClone(history), systemInstruction });
      return { modelUsed: requestedModelId, stream: (async function* () { yield { text: `answer-${requestedModelId}` }; })() };
    });
  });

  it('fans out one snapshot and retries from it without rebuilding context', async () => {
    const initial = await request(app).post('/api/v1/chat/compare/stream').set('x-test-user', 'user-a').send({
      comparisonId, snapshotId, chatId: 'chat-a', workspaceIdentity: 'chat:chat-a', prompt: 'prompt', selectedModelIds: ['gemini-3.8-flash', 'deepseek-chat'],
      activeContext: { artifactId: 'artifact-a', title: 'Canvas', version: 4, content: 'Canvas before edit'.padEnd(1500, '.') }
    }).expect(200);

    const initialEvents = initial.text.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)));
    const started = initialEvents.filter((event: any) => event.type === 'candidate_started');
    const modelCalls = mocks.modelCalls as Array<{ history: Array<{ parts: Array<{ text: string }> }>; systemInstruction: string }>;
    expect(started).toHaveLength(2);
    expect(new Set(started.map((event: any) => event.snapshotId))).toEqual(new Set([snapshotId]));
    expect(new Set(started.map((event: any) => event.contextFingerprint)).size).toBe(1);
    expect(mocks.contextCalls).toHaveLength(1);
    expect(modelCalls[0]).toEqual(expect.objectContaining({ history: modelCalls[1].history, systemInstruction: modelCalls[1].systemInstruction }));
    expect(modelCalls[0].history.at(-1)?.parts[0].text).toContain('Canvas before edit');

    await request(app).post(`/api/v1/chat/compare/${comparisonId}/retry/deepseek-chat`).set('x-test-user', 'user-a').send({ snapshotId, attemptId: '33333333-3333-4333-8333-333333333333' }).expect(200);
    expect(mocks.contextCalls).toHaveLength(1);
    expect(mocks.modelCalls).toHaveLength(3);
    expect(modelCalls[2]).toEqual(modelCalls[1]);
  });

  it('persists a selected result once and creates a chat for a new Workspace', async () => {
    await request(app).post('/api/v1/chat/compare/stream').set('x-test-user', 'user-a').send({
      comparisonId, snapshotId, workspaceIdentity: 'local:user-a:workspace-1', prompt: 'prompt', selectedModelIds: ['gemini-3.8-flash', 'deepseek-chat']
    }).expect(200);
    mocks.chatsFindFirst.mockResolvedValue(null);
    const body = { workspaceIdentity: 'local:user-a:workspace-1', prompt: 'prompt', response: 'selected answer', modelId: 'gemini-3.8-flash', candidateId: 'gemini-3.8-flash', comparisonId, snapshotId, attemptId: '33333333-3333-4333-8333-333333333333' };
    const first = await request(app).post('/api/v1/chat/compare/select').set('x-test-user', 'user-a').send(body).expect(200);
    const second = await request(app).post('/api/v1/chat/compare/select').set('x-test-user', 'user-a').send(body).expect(200);
    expect(first.body.chatId).toMatch(/^chat_cmp_/);
    expect(second.body).toMatchObject({ chatId: first.body.chatId, idempotent: true });
    expect(mocks.savedMessages).toHaveLength(2);
    expect(mocks.chatsCreate).toHaveBeenCalledTimes(1);
  });
});
