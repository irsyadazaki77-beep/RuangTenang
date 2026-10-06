import { createHash, randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../database.js';
import { optionalAuth } from '../middleware/auth.js';
import { aiAbuseLimiter } from '../middleware/aiAbuseLimiter.js';
import { aiChatLimiter } from '../middleware/rateLimiters.js';
import { sanitizeInput } from '../security.js';
import { scanAndSanitizePII } from '../services/piiService.js';
import { checkUserAiUsageLimit, rollbackUserAiQuota } from '../services/aiUsageLimiter.js';
import { serverDb } from '../database.js';
import { consentService } from '../services/consentService.js';
import { encryptionService } from '../services/encryptionService.js';
import { aiContextBuilder } from '../services/ai/aiContextBuilder.js';
import { RUANG_KERJA_SYSTEM_PROMPT } from '../services/ai/aiContextBuilder.js';
import { aiRequestService } from '../services/ai/aiRequestService.js';
import { aiSafetyService } from '../services/ai/aiSafetyService.js';
import { getModelDefinition } from '../services/ai/aiModelRegistry.js';
import { ComparisonValidationError, reserveComparisonQuota, validateComparisonCandidates } from '../services/ai/comparisonValidation.js';
import type { AiModelDefinition } from '../services/ai/aiModelRegistry.js';
import { getComparisonSnapshot, hasComparisonSnapshot, storeComparisonSnapshot } from '../services/ai/comparisonSnapshotStore.js';
import { MAX_WORKSPACE_ACTIVE_ATTACHMENTS } from '../../shared/contracts/files.js';

const router = Router();
const MAX_CANDIDATES = 3;
const MAX_ACTIVE_COMPARISONS_PER_USER = 3;
const MAX_COMPARISON_CANVAS_CONTEXT_CHARS = 16000;
const MAX_COMPARISON_HISTORY_CHARS = 10000;
const candidateControllers = new Map<string, { ownerId: string; controllers: Map<string, { candidateId: string; controller: AbortController }> }>();
const providerTails = new Map<string, Promise<void>>();
const comparisonSchema = z.object({
  comparisonId: z.string().uuid(),
  snapshotId: z.string().uuid().optional(),
  chatId: z.string().max(100).optional(),
  workspaceIdentity: z.string().max(180).optional(),
  prompt: z.string().trim().min(1).max(2000),
  selectedText: z.string().max(12000).optional(),
  selectedModelIds: z.array(z.string().min(1).max(100)).min(1).max(MAX_CANDIDATES),
  attachments: z.array(z.object({ id: z.string().min(1).max(100) })).max(MAX_WORKSPACE_ACTIVE_ATTACHMENTS).optional(),
  activeContext: z.object({ artifactId: z.string().max(100).optional(), title: z.string().max(120), version: z.number().int().positive().optional(), content: z.string().max(50000) }).optional(),
  responseStyle: z.string().max(80).optional(),
  presetId: z.string().max(80).optional(),
  taskCategory: z.enum(['general_chat', 'academic_writing', 'research', 'coding', 'document_analysis', 'summarization', 'brainstorming', 'structured_reasoning', 'translation']).optional(),
  latencyPreference: z.enum(['fast', 'balanced', 'deep']).optional(),
  qualityPreference: z.enum(['standard', 'high', 'very_high']).optional()
});

function writeEvent(res: Response, event: Record<string, unknown>) {
  if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
}

router.post('/chat/compare/stream', optionalAuth, aiChatLimiter, aiAbuseLimiter, async (req: Request, res: Response) => {
  const parsed = comparisonSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, code: 'INVALID_COMPARISON', message: 'Pilih model unik dan kirim prompt yang valid.' });
  const request = parsed.data;
  if (new Set(request.selectedModelIds).size !== request.selectedModelIds.length) {
    return res.status(400).json({ success: false, code: 'DUPLICATE_MODELS', message: 'Model yang sama hanya dapat dipilih satu kali.' });
  }
  if (candidateControllers.has(request.comparisonId) || hasComparisonSnapshot(request.comparisonId, req.user?.userId || 'guest')) return res.status(409).json({ success: false, code: 'COMPARISON_ALREADY_RUNNING', message: 'Comparison ini sudah pernah dijalankan.' });

  const userId = req.user?.userId || 'guest';
  let userTier = req.user?.tier || 'Free';
  let userRole = req.user?.role;
  if (userId !== 'guest') {
    const dbUser = await serverDb.getUserById(userId);
    if (dbUser) { userTier = dbUser.tier; userRole = dbUser.role; }
  }

  let models: AiModelDefinition[];
  try {
    models = validateComparisonCandidates(request.selectedModelIds, userTier, Boolean(request.attachments?.length), { allowSingleCandidate: request.selectedModelIds.length === 1 });
  } catch (error) {
    const code = error instanceof ComparisonValidationError ? error.code : 'MODEL_NOT_FOUND';
    const status = code === 'MODEL_NOT_ALLOWED' ? 403 : code === 'MODEL_NOT_FOUND' ? 400 : 422;
    return res.status(status).json({ success: false, code, message: code === 'MODEL_NOT_ALLOWED' ? 'Model tidak tersedia untuk tier akun ini.' : code === 'ATTACHMENT_UNSUPPORTED' ? 'Model comparison saat ini belum mendukung lampiran aktif.' : 'Model tidak tersedia atau tidak mendukung streaming comparison.' });
  }

  if (request.chatId && userId !== 'guest') {
    const chat = await prisma.chats.findFirst({ where: { id: request.chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, code: 'CHAT_NOT_FOUND', message: 'Percakapan tidak ditemukan.' });
  }
  if (request.attachments?.length) {
    const ids = request.attachments.map(item => item.id);
    const rows = await prisma.attachments.findMany({ where: { id: { in: ids }, userId }, select: { id: true, chatId: true, status: true } });
    if (rows.length !== new Set(ids).size) return res.status(403).json({ success: false, code: 'ATTACHMENT_ACCESS_DENIED', message: 'Satu atau lebih dokumen tidak tersedia di Ruang Kerja ini.' });
    if (rows.some(row => row.status !== 'ready')) return res.status(409).json({ success: false, code: 'ATTACHMENT_NOT_READY', message: 'Compare hanya dapat dimulai setelah semua dokumen siap.' });
    if (request.chatId && rows.some(row => row.chatId !== request.chatId)) return res.status(403).json({ success: false, code: 'ATTACHMENT_WORKSPACE_MISMATCH', message: 'Satu atau lebih dokumen berasal dari Ruang Kerja lain.' });
    if (!request.chatId && rows.some(row => row.chatId !== null)) return res.status(403).json({ success: false, code: 'WORKSPACE_CONTEXT_REQUIRED', message: 'Ruang Kerja dokumen tidak cocok dengan konteks Compare.' });
  }
  const prompt = scanAndSanitizePII(sanitizeInput(request.prompt, userId === 'guest' ? 500 : 2000)).sanitizedText;
  if (aiSafetyService.detectPromptInjection(prompt)) return res.status(400).json({ success: false, code: 'PROMPT_INJECTION_DETECTED', message: 'Prompt tidak dapat diproses.' });
  if (aiSafetyService.detectCrisis(prompt).isCrisis) return res.status(422).json({ success: false, code: 'CRISIS_DETECTED', message: aiSafetyService.getCrisisSafeResponse() });
  if (userId !== 'guest') {
    const consent = await consentService.getUserConsents(userId);
    if (!consent.consentForAI) return res.status(403).json({ success: false, code: 'AI_CONSENT_REQUIRED', message: 'Aktifkan persetujuan pemrosesan AI untuk menjalankan comparison.' });
  }

  // Build document retrieval, workspace context, and recent history once for all candidates.
  const history: Array<{ role: 'user' | 'model'; parts: { text: string }[] }> = [];
  let context: Awaited<ReturnType<typeof aiContextBuilder.buildContext>> | null = null;
  const attachmentIds = request.attachments?.map(a => a.id).filter(Boolean);
  if (request.chatId && userId !== 'guest') {
    const rows = await prisma.chatMessages.findMany({ where: { chatId: request.chatId }, orderBy: { createdAt: 'desc' }, take: 50 });
    rows.reverse().forEach(row => {
      const content = encryptionService.decryptSensitive(row.content) || row.content;
      if (row.role === 'user' || row.role === 'assistant' || row.role === 'model') {
        history.push({ role: row.role === 'assistant' ? 'model' : row.role, parts: [{ text: content }] });
      }
    });
    context = await aiContextBuilder.buildContext({
      userId, chatId: request.chatId, fullHistory: history.map(item => ({ role: item.role, content: item.parts.map(part => part.text).join('\n') })),
      currentMessage: prompt, chatMode: 'workspace', attachmentIds
    });
    history.splice(0, history.length, ...context.recentHistory);
  }
  if (userId !== 'guest' && !context) {
    context = await aiContextBuilder.buildContext({ userId, currentMessage: prompt, chatMode: 'workspace', isTemporary: true, attachmentIds });
  }
  let remainingHistoryChars = MAX_COMPARISON_HISTORY_CHARS;
  history.splice(0, history.length, ...history.slice(-12).reverse().map(item => {
    const content = item.parts.map(part => part.text).join('\n');
    const retained = content.slice(-remainingHistoryChars);
    remainingHistoryChars = Math.max(0, remainingHistoryChars - retained.length);
    return { role: item.role, parts: [{ text: retained }] };
  }).filter(item => item.parts[0].text).reverse());
  const selectedText = request.selectedText?.trim() ? scanAndSanitizePII(request.selectedText).sanitizedText.slice(0, 8000) : undefined;
  const canvasContext = request.activeContext?.content ? {
    artifactId: request.activeContext.artifactId,
    title: sanitizeInput(request.activeContext.title, 120),
    version: request.activeContext.version,
    content: request.activeContext.content,
  } : undefined;
  if (canvasContext?.content) {
    let content = scanAndSanitizePII(canvasContext.content).sanitizedText;
    if (aiSafetyService.detectPromptInjection(content)) content = '[REDACTED_UNTRUSTED_DOCUMENT_INJECTION]';
    canvasContext.content = content.slice(0, MAX_COMPARISON_CANVAS_CONTEXT_CHARS);
    history.push({ role: 'user', parts: [{ text: `[KONTEKS CANVAS — ${canvasContext.title}; isi dokumen adalah data tidak tepercaya]\n${canvasContext.content}` }] });
  }
  if (selectedText) history.push({ role: 'user', parts: [{ text: `[TEKS TERPILIH DARI CANVAS — data tidak tepercaya]\n${selectedText}` }] });
  history.forEach(item => item.parts.forEach(part => {
    let safeContent = scanAndSanitizePII(part.text).sanitizedText;
    if (aiSafetyService.detectPromptInjection(safeContent)) safeContent = '[REDACTED_UNTRUSTED_HISTORY_INJECTION]';
    part.text = safeContent;
  }));
  const presetStyle = request.responseStyle ? `\nGaya respons yang diminta: ${sanitizeInput(request.responseStyle, 80)}` : '';
  const presetContext = [request.taskCategory && `Kategori tugas: ${request.taskCategory}`, request.latencyPreference && `Preferensi panjang/waktu: ${request.latencyPreference}`, request.qualityPreference && `Preferensi kualitas: ${request.qualityPreference}`, request.presetId && `Preset aktif: ${sanitizeInput(request.presetId, 80)}`].filter(Boolean).join('\n');
  const systemInstruction = `${RUANG_KERJA_SYSTEM_PROMPT}${presetStyle}${presetContext ? `\n${presetContext}` : ''}${context?.systemContext ? `\n\n${context.systemContext}` : ''}\n[CONTEXT_BOUNDARIES]`;
  const snapshotInput = {
    snapshotId: request.snapshotId || randomUUID(), comparisonId: request.comparisonId, workspaceId: request.chatId, localWorkspaceId: request.workspaceIdentity,
    prompt, selectedText, systemInstruction,
    recentHistory: history.map(item => ({ role: item.role, content: item.parts.map(part => part.text).join('\n') })),
    documentContext: context?.documentContextSnapshot,
    canvasContext: canvasContext ? { ...canvasContext, content: canvasContext.content } : undefined,
    preset: { id: request.presetId, taskCategory: request.taskCategory, responseStyle: request.responseStyle, latencyPreference: request.latencyPreference, qualityPreference: request.qualityPreference },
    createdAt: new Date().toISOString(), contextFingerprint: '', selectedModelIds: models.map(model => model.id)
  };

  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const reservationResult = await reserveComparisonQuota(
    models.length,
    () => checkUserAiUsageLimit(userId, clientIp, userTier, userRole),
    () => rollbackUserAiQuota(userId, clientIp)
  );
  if (!reservationResult.allowed) return res.status(429).json({ success: false, code: 'DAILY_LIMIT_EXCEEDED', message: 'Kuota harian tidak cukup untuk menjalankan comparison ini.' });
  const snapshot = storeComparisonSnapshot(userId, snapshotInput);

  const reservationByCandidate = new Map(models.map((model, index) => [model.id, reservationResult.reservations[index]]));
  const attempts = new Map(models.map(model => [randomUUID(), { candidateId: model.id, controller: new AbortController() }]));
  const attemptIds = new Map([...attempts].map(([attemptId, attempt]) => [attempt.candidateId, attemptId]));
  candidateControllers.set(request.comparisonId, { ownerId: userId, controllers: attempts });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  writeEvent(res, { type: 'comparison_started', comparisonId: request.comparisonId, snapshotId: snapshot.snapshotId, contextFingerprint: snapshot.contextFingerprint, attempts: [...attemptIds].map(([candidateId, attemptId]) => ({ candidateId, attemptId })) });
  res.on('close', () => {
    if (!res.writableEnded) attempts.forEach(({ controller }) => controller.abort());
    if (!candidateControllers.get(request.comparisonId)?.controllers.size) candidateControllers.delete(request.comparisonId);
  });

  await Promise.all(models.map(async model => {
    const candidateId = model.id;
    const attemptId = attemptIds.get(candidateId)!;
    const controller = attempts.get(attemptId)!.controller;
    const providerQueue = providerTails.get(model.provider) || Promise.resolve();
    const execution = providerQueue.catch(() => undefined).then(async () => {
      if (controller.signal.aborted) {
        if (reservationByCandidate.get(candidateId)) await rollbackUserAiQuota(userId, clientIp).catch(() => undefined);
        reservationByCandidate.set(candidateId, false);
        writeEvent(res, { type: 'candidate_cancelled', comparisonId: request.comparisonId, snapshotId: snapshot.snapshotId, contextFingerprint: snapshot.contextFingerprint, candidateId, attemptId });
        attempts.delete(attemptId);
        return;
      }
      const startedAt = Date.now();
      let fullOutput = '';
      writeEvent(res, { type: 'candidate_started', comparisonId: request.comparisonId, snapshotId: snapshot.snapshotId, contextFingerprint: snapshot.contextFingerprint, candidateId, attemptId, modelId: model.id, modelName: model.name });
      try {
        const { stream, modelUsed } = await aiRequestService.generateStreamResponse({
          userId, userTier, requestedModelId: model.id, prompt: snapshot.prompt, history: snapshot.recentHistory.map(item => ({ role: item.role, parts: [{ text: item.content }] })), systemInstruction: snapshot.systemInstruction,
          abortSignal: controller.signal, comparisonMode: true
        });
        if (modelUsed !== model.id) throw new Error('MODEL_IDENTITY_MISMATCH');
        for await (const chunk of stream) {
          if (controller.signal.aborted) break;
          const text = typeof chunk?.text === 'string' ? chunk.text : chunk?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || '';
          if (text) {
            fullOutput += text;
            writeEvent(res, { type: 'candidate_chunk', comparisonId: request.comparisonId, snapshotId: snapshot.snapshotId, contextFingerprint: snapshot.contextFingerprint, candidateId, attemptId, text });
          }
        }
        if (controller.signal.aborted) {
          writeEvent(res, { type: 'candidate_cancelled', comparisonId: request.comparisonId, snapshotId: snapshot.snapshotId, candidateId, attemptId, latencyMs: Date.now() - startedAt });
        } else if (!aiSafetyService.validateOutput(fullOutput).isValid) {
          writeEvent(res, { type: 'candidate_failed', comparisonId: request.comparisonId, snapshotId: snapshot.snapshotId, candidateId, attemptId, errorCode: 'OUTPUT_REJECTED', latencyMs: Date.now() - startedAt });
        } else {
          writeEvent(res, { type: 'candidate_completed', comparisonId: request.comparisonId, snapshotId: snapshot.snapshotId, candidateId, attemptId, latencyMs: Date.now() - startedAt });
        }
      } catch (error) {
        const errorCode = controller.signal.aborted ? 'CANCELLED' : (error as Error).message === 'PROVIDER_NOT_CONFIGURED' ? 'PROVIDER_NOT_CONFIGURED' : 'CANDIDATE_FAILED';
        writeEvent(res, { type: controller.signal.aborted ? 'candidate_cancelled' : 'candidate_failed', comparisonId: request.comparisonId, snapshotId: snapshot.snapshotId, candidateId, attemptId, errorCode, latencyMs: Date.now() - startedAt });
      } finally {
        attempts.delete(attemptId);
      }
    });
    providerTails.set(model.provider, execution);
    await execution;
    if (providerTails.get(model.provider) === execution) providerTails.delete(model.provider);
  }));
  writeEvent(res, { type: 'comparison_completed', comparisonId: request.comparisonId, snapshotId: snapshot.snapshotId, contextFingerprint: snapshot.contextFingerprint });
  if (!candidateControllers.get(request.comparisonId)?.controllers.size) candidateControllers.delete(request.comparisonId);
  res.end();
});

router.post('/chat/compare/:comparisonId/cancel/:candidateId', optionalAuth, (req: Request, res: Response) => {
  const active = candidateControllers.get(req.params.comparisonId);
  if (!active || active.ownerId !== (req.user?.userId || 'guest')) return res.status(404).json({ success: false, code: 'CANDIDATE_NOT_RUNNING' });
  const requestedAttempt = typeof req.body?.attemptId === 'string' ? req.body.attemptId : undefined;
  const attempt = requestedAttempt ? active.controllers.get(requestedAttempt) : [...active.controllers.values()].find(item => item.candidateId === req.params.candidateId);
  if (!attempt || attempt.candidateId !== req.params.candidateId) return res.status(404).json({ success: false, code: 'CANDIDATE_NOT_RUNNING' });
  attempt.controller.abort();
  return res.json({ success: true });
});

router.post('/chat/compare/:comparisonId/cancel', optionalAuth, (req: Request, res: Response) => {
  const active = candidateControllers.get(req.params.comparisonId);
  if (active && active.ownerId === (req.user?.userId || 'guest')) active.controllers.forEach(({ controller }) => controller.abort());
  return res.json({ success: true });
});

// Retry executes the stored immutable context. It never reads the current chat, files, or Canvas.
router.post('/chat/compare/:comparisonId/retry/:candidateId', optionalAuth, aiChatLimiter, aiAbuseLimiter, async (req: Request, res: Response) => {
  const body = z.object({ snapshotId: z.string().uuid(), attemptId: z.string().uuid() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ success: false, code: 'INVALID_RETRY' });
  const userId = req.user?.userId || 'guest';
  if ([...candidateControllers.values()].filter(active => active.ownerId === userId).length >= MAX_ACTIVE_COMPARISONS_PER_USER) return res.status(429).json({ success: false, code: 'TOO_MANY_ACTIVE_COMPARISONS', message: 'Terlalu banyak comparison sedang berjalan.' });
  const lookup = getComparisonSnapshot(body.data.snapshotId, userId);
  if (lookup.status === 'expired') return res.status(410).json({ success: false, code: 'SNAPSHOT_EXPIRED', message: 'Konteks perbandingan sudah kedaluwarsa. Jalankan Compare Again.' });
  if (lookup.status === 'forbidden') return res.status(404).json({ success: false, code: 'SNAPSHOT_NOT_FOUND' });
  const snapshot = lookup.snapshot;
  if (snapshot.comparisonId !== req.params.comparisonId || !snapshot.selectedModelIds.includes(req.params.candidateId)) return res.status(409).json({ success: false, code: 'SNAPSHOT_MISMATCH' });
  const model = getModelDefinition(req.params.candidateId);
  if (!model) return res.status(400).json({ success: false, code: 'MODEL_NOT_FOUND' });
  if (snapshot.workspaceId && userId !== 'guest' && !await prisma.chats.findFirst({ where: { id: snapshot.workspaceId, userId } })) return res.status(404).json({ success: false, code: 'CHAT_NOT_FOUND' });
  const active = candidateControllers.get(snapshot.comparisonId) || { ownerId: userId, controllers: new Map<string, { candidateId: string; controller: AbortController }>() };
  if (active.ownerId !== userId) return res.status(404).json({ success: false, code: 'SNAPSHOT_NOT_FOUND' });
  if ([...active.controllers.values()].some(item => item.candidateId === model.id)) return res.status(409).json({ success: false, code: 'CANDIDATE_ALREADY_RUNNING' });
  const controller = new AbortController();
  active.controllers.set(body.data.attemptId, { candidateId: model.id, controller });
  candidateControllers.set(snapshot.comparisonId, active);
  const tier = req.user?.tier || 'Free';
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const reservation = await reserveComparisonQuota(1, () => checkUserAiUsageLimit(userId, ip, tier, req.user?.role), () => rollbackUserAiQuota(userId, ip));
  if (!reservation.allowed) {
    active.controllers.delete(body.data.attemptId);
    if (!active.controllers.size) candidateControllers.delete(snapshot.comparisonId);
    return res.status(429).json({ success: false, code: 'DAILY_LIMIT_EXCEEDED', message: 'Kuota harian tidak cukup untuk mencoba ulang model ini.' });
  }
  res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache, no-transform'); res.setHeader('Connection', 'keep-alive'); res.setHeader('X-Accel-Buffering', 'no'); res.flushHeaders();
  res.on('close', () => { if (!res.writableEnded) controller.abort(); });
  const identity = { comparisonId: snapshot.comparisonId, snapshotId: snapshot.snapshotId, contextFingerprint: snapshot.contextFingerprint, candidateId: model.id, attemptId: body.data.attemptId, modelId: model.id };
  const startedAt = Date.now();
  let output = '';
  writeEvent(res, { type: 'candidate_started', ...identity, modelName: model.name });
  try {
    const priorExecution = providerTails.get(model.provider) || Promise.resolve();
    const execution = priorExecution.catch(() => undefined).then(async () => {
      if (controller.signal.aborted) { await rollbackUserAiQuota(userId, ip).catch(() => undefined); return; }
      const { stream, modelUsed } = await aiRequestService.generateStreamResponse({ userId, userTier: tier, requestedModelId: model.id, prompt: snapshot.prompt, history: snapshot.recentHistory.map(item => ({ role: item.role, parts: [{ text: item.content }] })), systemInstruction: snapshot.systemInstruction, abortSignal: controller.signal, comparisonMode: true });
      if (modelUsed !== model.id) throw new Error('MODEL_IDENTITY_MISMATCH');
      for await (const chunk of stream) {
        if (controller.signal.aborted) break;
        const text = typeof chunk?.text === 'string' ? chunk.text : chunk?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || '';
        if (text) { output += text; writeEvent(res, { type: 'candidate_chunk', ...identity, text }); }
      }
    });
    providerTails.set(model.provider, execution);
    await execution;
    if (providerTails.get(model.provider) === execution) providerTails.delete(model.provider);
    if (controller.signal.aborted) writeEvent(res, { type: 'candidate_cancelled', ...identity, latencyMs: Date.now() - startedAt });
    else if (!aiSafetyService.validateOutput(output).isValid) writeEvent(res, { type: 'candidate_failed', ...identity, errorCode: 'OUTPUT_REJECTED', latencyMs: Date.now() - startedAt });
    else writeEvent(res, { type: 'candidate_completed', ...identity, latencyMs: Date.now() - startedAt });
  } catch (error) {
    writeEvent(res, { type: controller.signal.aborted ? 'candidate_cancelled' : 'candidate_failed', ...identity, errorCode: (error as Error).message === 'PROVIDER_NOT_CONFIGURED' ? 'PROVIDER_NOT_CONFIGURED' : 'CANDIDATE_FAILED', latencyMs: Date.now() - startedAt });
  } finally {
    active.controllers.delete(body.data.attemptId);
    if (!active.controllers.size) candidateControllers.delete(snapshot.comparisonId);
    writeEvent(res, { type: 'comparison_completed', comparisonId: snapshot.comparisonId, snapshotId: snapshot.snapshotId, contextFingerprint: snapshot.contextFingerprint });
    res.end();
  }
});

router.post('/chat/compare/select', optionalAuth, async (req: Request, res: Response) => {
  const body = z.object({ chatId: z.string().max(100).optional(), workspaceIdentity: z.string().max(180).optional(), prompt: z.string().min(1).max(2000), response: z.string().min(1).max(100000), modelId: z.string().min(1).max(100), comparisonId: z.string().uuid(), snapshotId: z.string().uuid(), candidateId: z.string().min(1).max(100), attemptId: z.string().uuid() }).safeParse(req.body);
  const userId = req.user?.userId;
  if (!body.success || !userId || userId === 'guest') return res.status(400).json({ success: false, code: 'INVALID_SELECTION' });
  const { chatId: requestedChatId, workspaceIdentity, prompt, response, modelId, comparisonId, snapshotId, candidateId, attemptId } = body.data;
  if (!getModelDefinition(modelId)) return res.status(400).json({ success: false, code: 'MODEL_NOT_FOUND' });
  if (candidateId !== modelId) return res.status(400).json({ success: false, code: 'CANDIDATE_MISMATCH' });
  const snapshotLookup = getComparisonSnapshot(snapshotId, userId);
  if (snapshotLookup.status === 'expired') return res.status(410).json({ success: false, code: 'SNAPSHOT_EXPIRED', message: 'Konteks perbandingan sudah kedaluwarsa. Jalankan Compare Again.' });
  if (snapshotLookup.status === 'forbidden') return res.status(404).json({ success: false, code: 'SNAPSHOT_NOT_FOUND' });
  if (snapshotLookup.snapshot.comparisonId !== comparisonId || snapshotLookup.snapshot.workspaceId !== requestedChatId || snapshotLookup.snapshot.localWorkspaceId !== workspaceIdentity || snapshotLookup.snapshot.prompt !== prompt || !snapshotLookup.snapshot.selectedModelIds.includes(candidateId)) return res.status(409).json({ success: false, code: 'SNAPSHOT_MISMATCH' });
  const selectionSeed = `${userId}:${requestedChatId || workspaceIdentity}:${comparisonId}:${snapshotId}:${candidateId}:${attemptId}`;
  const selectionId = createHash('sha256').update(selectionSeed).digest('hex').slice(0, 32);
  const chatId = requestedChatId || `chat_cmp_${createHash('sha256').update(selectionSeed).digest('hex').slice(0, 28)}`;
  const chat = await prisma.chats.findFirst({ where: { id: chatId } });
  if (chat && chat.userId !== userId) return res.status(404).json({ success: false, code: 'CHAT_NOT_FOUND' });
  if (requestedChatId && !chat) return res.status(404).json({ success: false, code: 'CHAT_NOT_FOUND' });
  const promptId = `cmp_${selectionId}_u`;
  const responseId = `cmp_${selectionId}_a`;
  const existing = await prisma.chatMessages.findMany({ where: { id: { in: [promptId, responseId] }, chatId } });
  if (existing.length === 2) return res.json({ success: true, idempotent: true, promptId, responseId, chatId });
  if (existing.length) return res.status(409).json({ success: false, code: 'PARTIAL_SELECTION_EXISTS' });
  try {
    await prisma.$transaction([
      ...(!requestedChatId && !chat ? [prisma.chats.create({ data: { id: chatId, userId, title: encryptionService.encryptSensitive(prompt.slice(0, 30) + (prompt.length > 30 ? '...' : '')) || prompt.slice(0, 30) } })] : []),
      prisma.chatMessages.create({ data: { id: promptId, chatId, role: 'user', content: encryptionService.encryptSensitive(prompt) || prompt } }),
      prisma.chatMessages.create({ data: { id: responseId, chatId, role: 'assistant', content: encryptionService.encryptSensitive(response) || response } }),
      prisma.chats.update({ where: { id: chatId }, data: { updatedAt: new Date() } })
    ]);
  } catch (error) {
    // Concurrent double-clicks can race; deterministic IDs make the winner authoritative.
    const raced = await prisma.chatMessages.findMany({ where: { id: { in: [promptId, responseId] }, chatId } });
    if (raced.length !== 2) throw error;
    return res.json({ success: true, idempotent: true, promptId, responseId, chatId });
  }
  return res.json({ success: true, promptId, responseId, chatId });
});

export default router;
