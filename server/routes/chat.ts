import { prisma } from '../database.js';
import { MAX_CHAT_ATTACHMENTS_PER_MESSAGE, MAX_WORKSPACE_ACTIVE_ATTACHMENTS } from '../../shared/contracts/files.js';
import { Router, Request, Response, NextFunction } from 'express';

import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { aiAbuseLimiter } from '../middleware/aiAbuseLimiter.js';
import { aiChatLimiter, aiSummaryLimiter } from '../middleware/rateLimiters.js';
import { sanitizeInput } from '../security.js';
import { scanAndSanitizePII } from '../services/piiService.js';
import { checkUserAiUsageLimit, rollbackUserAiQuota } from '../services/aiUsageLimiter.js';
import { serverDb } from '../database.js';

import { encryptionService } from '../services/encryptionService.js';
import { getLocalFallbackResponse } from './fallbackAi.js';


import { aiSafetyService } from '../services/ai/aiSafetyService.js';
import { aiGateway } from '../services/ai/aiGateway.js';
import { validateAndSanitizeToolCall } from '../services/ai/aiToolSchemas.js';
import { ChatController } from '../controllers/chatController.js';
import { aiMetricsService } from '../services/ai/aiMetricsService.js';
import { attachmentStorageService } from '../services/attachmentStorageService.js';
import { documentIngestionService } from '../services/file-intelligence/documentIngestionService.js';
import { DocumentProcessingException } from '../services/file-intelligence/fileTypes.js';
import { getVerifiedEmergencyContacts } from '../config/emergencyRegistry.js';
import { AiModelError, getModelDefinition, resolveAiModel } from '../services/ai/aiModelRegistry.js';
import { AUTO_ROUTING_MODEL_ID } from '../../shared/aiModelContract.js';
import { smartModelRouter } from '../services/ai/smartModelRouter.js';

const router = Router();

// Endpoint for inspecting non-sensitive AI performance metrics
router.get('/ai/metrics', requireAuth, requireRole(['admin']), (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const summary = aiMetricsService.getMetricsSummary();
  res.json({ success: true, metrics: summary });
});

// Error wrapper helper
const sendError = (res: Response, code: string, message: string, status = 500) => {
  res.status(status).json({ 
    success: false, 
    code, 
    message,
    error: { code, message }
  });
};

const sendModelSelectionError = (res: Response, error: unknown) => {
  if (!(error instanceof AiModelError)) return false;
  const status = error.code === 'MODEL_NOT_ALLOWED' ? 403 : 400;
  const messages: Record<AiModelError['code'], string> = {
    MODEL_NOT_FOUND: 'Model AI tidak dikenal.',
    MODEL_NOT_ALLOWED: 'Model ini tidak tersedia untuk paket akun Anda.',
    MODEL_UNAVAILABLE: 'Model AI sedang tidak tersedia.',
    PROVIDER_NOT_CONFIGURED: 'Penyedia model AI sedang tidak tersedia.'
  };
  sendError(res, error.code, messages[error.code], status);
  return true;
};

// Middleware to check ownership for a specific chat ID
const checkChatOwnership = async (req: Request, res: Response, next: NextFunction) => {
  const chatId = req.params.id || req.body.chatId;
  const userId = req.user?.userId;
  if (!chatId) return sendError(res, 'MISSING_CHAT_ID', 'Chat ID wajib diisi', 400);
  if (!userId) return sendError(res, 'UNAUTHORIZED', 'Sesi tidak valid', 401);
  
  try {
    const chat = await prisma.chats.findFirst({ where: { id: chatId, userId } });
    if (!chat) return sendError(res, 'NOT_FOUND', 'Percakapan tidak ditemukan atau bukan milik Anda', 404);
    next();
  } catch (err) {
    sendError(res, 'DB_ERROR', 'Gagal memvalidasi kepemilikan percakapan', 500);
  }
};

// Routes delegation to ChatController
router.get('/chat/models', optionalAuth, ChatController.getModels);
router.get('/chat/history', requireAuth, ChatController.getHistory);
router.get('/chat/search', requireAuth, ChatController.search);

// 1. Bookmark endpoints (registered before :id to prevent route capture)
router.get('/chat/bookmarks', requireAuth, ChatController.getBookmarks);
router.get('/chat/bookmarks/ids', requireAuth, ChatController.getBookmarkedIds);
router.post('/chat/bookmarks', requireAuth, ChatController.addBookmark);
router.delete('/chat/bookmarks/:messageId', requireAuth, ChatController.removeBookmark);

// Chat scoped bookmark route
router.post('/chat/:id/bookmarks', requireAuth, checkChatOwnership, (req: Request, res: Response) => {
  req.body.chatId = req.params.id;
  return ChatController.addBookmark(req, res);
});

// 2. Chat scoped endpoints
router.get('/chat/:id/messages', requireAuth, checkChatOwnership, ChatController.getMessages);
router.put('/chat/:id/title', requireAuth, checkChatOwnership, ChatController.updateTitle);
router.put('/chat/:id/pin', requireAuth, checkChatOwnership, ChatController.togglePin);
router.put('/chat/:id/archive', requireAuth, checkChatOwnership, ChatController.toggleArchive);
router.delete('/chat/:id', requireAuth, checkChatOwnership, ChatController.deleteChat);

// 3. Search inside conversation
router.get('/chat/:id/search', requireAuth, checkChatOwnership, ChatController.searchInChat);

// 4. Branch conversation
router.post('/chat/:id/branch', requireAuth, checkChatOwnership, ChatController.branchChat);

// 5. Smart Session Summary
router.get('/chat/:id/summary', requireAuth, checkChatOwnership, ChatController.getSummary);
router.post('/chat/:id/summary', requireAuth, checkChatOwnership, aiSummaryLimiter, aiAbuseLimiter, ChatController.generateSummary);

// 6. Memory preference per conversation
router.put('/chat/:id/memory', requireAuth, checkChatOwnership, ChatController.updateMemoryPreference);

// 7. User Memories management (CRUD)
router.get('/chat/user-memories', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const memories = await prisma.userMemories.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    const decrypted = memories.map(m => ({
      ...m,
      content: encryptionService.decryptSensitive(m.content) || m.content
    }));
    res.json({ success: true, memories: decrypted });
  } catch {
    sendError(res, 'FETCH_MEMORIES_FAILED', 'Gagal mengambil data memori');
  }
});

router.post('/chat/user-memories', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const rawContent = req.body.content || (req.body.key && req.body.value ? `${req.body.key}: ${req.body.value}` : '');
    if (!rawContent || typeof rawContent !== 'string' || rawContent.trim().length === 0) {
      return sendError(res, 'INVALID_INPUT', 'Konten memori tidak valid', 400);
    }
    const cleanContent = sanitizeInput(rawContent.trim(), 200);
    const encrypted = encryptionService.encryptSensitive(cleanContent) || cleanContent;
    const newMemory = await prisma.userMemories.create({
      data: {
        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        content: encrypted,
        isActive: true
      }
    });
    const memoryObj = { ...newMemory, content: cleanContent };
    res.status(201).json({ success: true, memory: memoryObj, item: memoryObj });
  } catch {
    sendError(res, 'CREATE_MEMORY_FAILED', 'Gagal menyimpan memori baru');
  }
});

router.delete('/chat/user-memories/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const existing = await prisma.userMemories.findFirst({ where: { id, userId } });
    if (!existing) {
      return sendError(res, 'NOT_FOUND', 'Memori tidak ditemukan', 404);
    }
    await prisma.userMemories.delete({ where: { id } });
    res.json({ success: true, message: 'Memori berhasil dihapus' });
  } catch {
    sendError(res, 'DELETE_MEMORY_FAILED', 'Gagal menghapus memori');
  }
});
router.delete('/chat/:id/messages', requireAuth, checkChatOwnership, async (req: Request, res: Response) => {
  try {
    const chatId = req.params.id;
    await prisma.chatMessages.deleteMany({
      where: { chatId }
    });
    res.json({ success: true, message: 'Semua pesan berhasil dihapus' });
  } catch (err: any) {
    sendError(res, 'CLEAR_MESSAGES_FAILED', 'Gagal membersihkan pesan percakapan');
  }
});

router.post('/chat/:id/truncate', requireAuth, checkChatOwnership, async (req: Request, res: Response) => {

  try {
    const { messageId } = req.body;
    if (!messageId) return sendError(res, 'MISSING_MSG_ID', 'ID Pesan diperlukan', 400);
    const msg = await prisma.chatMessages.findUnique({ where: { id: messageId } });
    if (msg && msg.chatId === req.params.id) {
      await prisma.chatMessages.deleteMany({
        where: {
          chatId: req.params.id,
          createdAt: { gte: msg.createdAt }
        }
      });
      res.json({ success: true });
    } else {
      sendError(res, 'NOT_FOUND', 'Pesan tidak ditemukan dalam percakapan ini', 404);
    }
  } catch (e: any) {
    sendError(res, 'TRUNCATE_FAILED', 'Gagal memotong pesan');
  }
});

router.post('/chat/summary', requireAuth, checkChatOwnership, aiSummaryLimiter, aiAbuseLimiter, (req: Request, res: Response) => {
  return ChatController.generateSummary(req, res);
});

// Canonical Chat Endpoint (Non-streaming JSON & Pre-flight Safe Interceptor)
router.post(['/chat', '/api/chat'], optionalAuth, aiChatLimiter, aiAbuseLimiter, async (req: Request, res: Response) => {
  try {
    const { 
      message, 
      chatId, 
      mode,
      isTemporary, 
      chatMode, 
      responseStyle, 
      aiModel: requestedAiModel
    } = req.body;

    const isAutoRouting = !requestedAiModel || requestedAiModel === AUTO_ROUTING_MODEL_ID;
    const userTier = req.user?.tier || 'Free';

    const isAnonymous = !req.user || req.user.userId === 'guest';
    const maxLength = isAnonymous ? 500 : 2000;
    let cleanMessage = sanitizeInput(message || '', maxLength);
    cleanMessage = scanAndSanitizePII(cleanMessage).sanitizedText;

    // PRE-FLIGHT SAFE INTERCEPTOR: Intercept acute crisis BEFORE invoking external LLM
    const crisisCheck = aiSafetyService.detectCrisis(cleanMessage);
    if (crisisCheck.isCrisis) {
      const emergencyResponse = aiSafetyService.getCrisisSafeResponse();
      const verifiedContacts = getVerifiedEmergencyContacts();
      return res.status(200).json({
        success: true,
        isCrisis: true,
        crisisDetected: true,
        message: emergencyResponse,
        response: emergencyResponse,
        hotlines: ['119 ext 8', '0811-3855-472'],
        contacts: verifiedContacts
      });
    }

    // If manual mode, validate the requested model
    if (!isAutoRouting) {
      try { resolveAiModel(requestedAiModel, userTier); }
      catch (error) { if (sendModelSelectionError(res, error)) return; throw error; }
    }

    const routingContext = {
      manualModelId: isAutoRouting ? AUTO_ROUTING_MODEL_ID : requestedAiModel,
      workspaceMode: Boolean(mode && mode.toLowerCase().includes('ruang_kerja')),
      chatMode,
      responseStyle,
      streamingRequired: false,
      userTier: userTier as any
    };

    const routingDecision = smartModelRouter.routeModel(routingContext, cleanMessage);

    const pipelineRes = await aiSafetyService.runUnifiedPipeline({
      userId: req.user?.userId,
      input: cleanMessage,
      chatId,
      mode,
      chatMode,
      responseStyle,
      aiModel: routingDecision.selectedModelId,
      userTier: (req.user as any)?.tier,
      userRole: req.user?.role,
      history: [],
      isStreaming: false,
      isTemporary,
      routingDecision,
      routingContext
    });

    return res.status(200).json({
      success: true,
      text: pipelineRes.text,
      message: pipelineRes.text,
      isCrisis: pipelineRes.isCrisisOverride,
      modelUsed: pipelineRes.modelUsed,
      modelRequested: routingDecision.selectedModelId,
      providerUsed: getModelDefinition(pipelineRes.modelUsed)?.provider || 'local',
      isFallback: pipelineRes.isFallback,
      fallbackFrom: pipelineRes.isFallback && pipelineRes.modelUsed !== routingDecision.selectedModelId ? routingDecision.selectedModelId : undefined,
      routingMode: routingDecision.routingMode,
      routingReason: routingDecision.routingReason
    });
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    return res.status(500).json({ success: false, error: 'Gagal memproses pesan chat.' });
  }
});

// Main Streaming Chat Route
router.post('/chat/stream', optionalAuth, aiChatLimiter, aiAbuseLimiter, async (req: Request, res: Response) => {
  try {
    const { 
      message, 
      chatId, 
      mode,
      isTemporary, 
      pluginResult, 
      chatMode, 
      responseStyle, 
      aiModel: requestedAiModel,
      attachments,
      workspaceMode,
      taskCategory,
      latencyPreference,
      qualityPreference,
      presetId,
      includeWorkspaceFiles,
      workspaceAttachmentIds,
      isolatedTaskExecution
    } = req.body;
    
    const isAnonymous = !req.user || req.user.userId === 'guest';
    const maxLength = isAnonymous ? 500 : 2000;
    let cleanMessage = sanitizeInput(message || '', maxLength);
    cleanMessage = scanAndSanitizePII(cleanMessage).sanitizedText;

    const userId = req.user?.userId;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    let userTier = (req.user as { tier?: string })?.tier;
    let userRole = req.user?.role;
    if (userId) {
      const dbUser = await serverDb.getUserById(userId);
      if (dbUser) {
        userTier = dbUser.tier;
        userRole = dbUser.role;
      }
    }

    const isAutoRouting = !requestedAiModel || requestedAiModel === AUTO_ROUTING_MODEL_ID;

    if (!isAutoRouting) {
      try { resolveAiModel(requestedAiModel, userTier || 'Free'); }
      catch (error) { if (sendModelSelectionError(res, error)) return; throw error; }
    }

    const isWorkspace = Boolean(workspaceMode) || (mode || '').toLowerCase().includes('ruang_kerja') || (chatMode || '').toLowerCase().includes('ruangkerja');
    const attachmentLimit = isWorkspace ? MAX_WORKSPACE_ACTIVE_ATTACHMENTS : MAX_CHAT_ATTACHMENTS_PER_MESSAGE;
    if (Array.isArray(attachments) && attachments.length > attachmentLimit) {
      return sendError(res, 'TOO_MANY_FILES', `Maksimal ${attachmentLimit} lampiran aktif diperbolehkan`, 400);
    }

    const validTaskCategories = ['general_chat', 'academic_writing', 'research', 'coding', 'document_analysis', 'summarization', 'brainstorming', 'structured_reasoning', 'translation'];
    const validLatencyPreferences = ['fast', 'balanced', 'deep'];
    const validQualityPreferences = ['standard', 'high', 'very_high'];

    const routingContext = {
      manualModelId: isAutoRouting ? AUTO_ROUTING_MODEL_ID : requestedAiModel,
      workspaceMode: isWorkspace,
      chatMode,
      responseStyle,
      taskCategory: typeof taskCategory === 'string' && validTaskCategories.includes(taskCategory) ? (taskCategory as any) : undefined,
      latencyPreference: typeof latencyPreference === 'string' && validLatencyPreferences.includes(latencyPreference) ? (latencyPreference as any) : undefined,
      qualityPreference: typeof qualityPreference === 'string' && validQualityPreferences.includes(qualityPreference) ? (qualityPreference as any) : undefined,
      presetId: typeof presetId === 'string' && presetId.trim() ? sanitizeInput(presetId.trim(), 50) : undefined,
      streamingRequired: true,
      userTier: (userTier as any) || 'Free',
      attachments: (attachments || []).map((a: any) => ({
        filename: a?.filename || a?.name,
        mimeType: a?.mimeType || a?.type,
        size: a?.size
      }))
    };

    const routingDecision = smartModelRouter.routeModel(routingContext, cleanMessage);
    const aiModel = routingDecision.selectedModelId;

    // Enforce atomic daily usage limit check to prevent API key exhaustion and parallel race conditions
    const usageCheck = await checkUserAiUsageLimit(userId, clientIp, userTier, userRole);
    if (!usageCheck.allowed) {
      const tomorrow = new Date();
      tomorrow.setUTCHours(24, 0, 0, 0);
      const resetAt = tomorrow.toISOString();
      const empatheticMsg = usageCheck.message || "Kamu sudah meluangkan waktu untuk berbagi banyak hal hari ini. Istirahat sejenak ya. Sambil menunggu kuota harianmu di-reset, kamu bisa mencoba relaksasi pernapasan atau menjadwalkan konsultasi dengan konselor kami.";

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write('data: ' + JSON.stringify({ 
        error: 'DAILY_LIMIT_EXCEEDED', 
        quotaExceeded: true,
        message: empatheticMsg,
        text: `⚠️ ${empatheticMsg}`,
        resetAt,
        suggestedActions: ["BREATHING", "COUNSELOR_BOOKING"]
      }) + '\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    let activeIsTemporary = isTemporary || !userId;
    let currentChatId = chatId;
    let isNewChat = false;

    if (!activeIsTemporary && userId) {
      try {
        if (currentChatId) {
          // Ownership check
          const existingChat = await prisma.chats.findFirst({ where: { id: currentChatId, userId } });
          if (!existingChat) {
            await rollbackUserAiQuota(userId, clientIp);
            return sendError(res, 'NOT_FOUND', 'Percakapan tidak ditemukan atau bukan milik Anda', 404);
          }
        } else {
          isNewChat = true;
          const newTitle = cleanMessage ? (cleanMessage.substring(0, 30) + (cleanMessage.length > 30 ? '...' : '')) : 'Percakapan Baru';
          const newChat = await prisma.chats.create({
            data: {
              id: `chat_${Date.now()}`,
              userId,
              title: encryptionService.encryptSensitive(newTitle) || newTitle,
              workspaceMode: isWorkspace ? 'RUANG_KERJA' : 'RUANG_TENANG',
            }
          });
          currentChatId = newChat.id;
          if (isWorkspace) await prisma.workspaces.create({ data: { chatId: newChat.id } });
        }

        if (isWorkspace && currentChatId) {
          await prisma.chats.update({ where: { id: currentChatId }, data: { workspaceMode: 'RUANG_KERJA' } });
          await prisma.workspaces.upsert({ where: { chatId: currentChatId }, create: { chatId: currentChatId }, update: {} });
        }

        if (Array.isArray(attachments)) {
          const maxAttachmentCount = isWorkspace ? MAX_WORKSPACE_ACTIVE_ATTACHMENTS : MAX_CHAT_ATTACHMENTS_PER_MESSAGE;
          if (attachments.length > maxAttachmentCount) {
            await rollbackUserAiQuota(userId, clientIp);
            return sendError(res, 'TOO_MANY_FILES', `Maksimal ${maxAttachmentCount} lampiran aktif diperbolehkan`, 400);
          }

          if (isWorkspace) {
            for (const attachment of attachments) {
              const attachmentId = typeof attachment === 'string' ? attachment : attachment?.id;
              if (!attachmentId) {
                await rollbackUserAiQuota(userId, clientIp);
                return sendError(res, 'INVALID_ATTACHMENT', 'Lampiran Workspace tidak valid.', 400);
              }
              const record = await prisma.attachments.findUnique({ where: { id: attachmentId } });
              if (!record || record.userId !== userId) {
                await rollbackUserAiQuota(userId, clientIp);
                return sendError(res, 'UNAUTHORIZED_ACCESS', 'Anda tidak memiliki akses ke dokumen ini.', 403);
              }
              if (record.status !== 'ready') {
                await rollbackUserAiQuota(userId, clientIp);
                return sendError(res, 'ATTACHMENT_NOT_READY', 'Tunggu sampai semua dokumen selesai diproses.', 409);
              }
              if (record.chatId && record.chatId !== currentChatId) {
                await rollbackUserAiQuota(userId, clientIp);
                return sendError(res, 'ATTACHMENT_WORKSPACE_MISMATCH', 'Dokumen ini terhubung ke Ruang Kerja lain.', 403);
              }
            }
          }
        }

        if (!pluginResult) {
          const msgResult = await prisma.chatMessages.create({

            data: {
              id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              chatId: currentChatId,
              role: 'user',
              content: encryptionService.encryptSensitive(cleanMessage) || cleanMessage
            }
          });
          
          
          if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            for (const att of attachments) {
              try {
                const attId = typeof att === 'string' ? att : att?.id;
                if (attId) {
                  // Verify IDOR ownership and link messageId and chatId
                  const result = await attachmentStorageService.getAttachmentForUser(attId, userId || 'guest');
                  if (result) {
                    await prisma.attachments.update({
                      where: { id: attId },
                      data: {
                        messageId: msgResult.id,
                        chatId: currentChatId
                      }
                    });
                  }
                } else if (att.base64) {
                  // Backward compatibility for direct base64 uploads (validates mime, magic bytes, size & saves to disk via canonical pipeline)
                  const base64Clean = att.base64.includes(',') ? att.base64.split(',')[1] : att.base64;
                  const buffer = Buffer.from(base64Clean, 'base64');
                  await documentIngestionService.ingestFile({
                    userId: userId || 'guest',
                    buffer,
                    originalFilename: att.filename || 'attachment.bin',
                    clientMime: att.mimeType || 'application/octet-stream',
                    chatId: currentChatId,
                    messageId: msgResult.id
                  });
                }
              } catch (e: any) {
                console.error('[ATTACHMENT_PROCESS_ERROR]', e.message);
                const safeMsg = e instanceof DocumentProcessingException ? e.safeMessage : e.message;
                const errCode = e instanceof DocumentProcessingException ? e.code : '';

                if (errCode === 'OWNERSHIP_ERROR' || e.message.includes('UNAUTHORIZED_ACCESS')) {
                  await rollbackUserAiQuota(userId, clientIp);
                  return sendError(res, 'UNAUTHORIZED_ACCESS', 'Anda tidak memiliki akses ke berkas lampiran ini', 403);
                }
                if (errCode === 'SECURITY_REJECTED' || e.message.includes('PROMPT_INJECTION')) {
                  await rollbackUserAiQuota(userId, clientIp);
                  return sendError(res, 'PROMPT_INJECTION_IN_ATTACHMENT', 'Terdeteksi upaya prompt injection dalam lampiran', 400);
                }
                if (
                  ['FILE_TOO_LARGE', 'EMPTY_FILE', 'SIGNATURE_MISMATCH', 'MIME_MISMATCH', 'UNSUPPORTED_FORMAT', 'ARCHIVE_TOO_LARGE', 'PARSER_ERROR'].includes(errCode) ||
                  e.message.includes('FILE_TOO_LARGE') || e.message.includes('INVALID_FILE') || e.message.includes('EXTENSION_MIMETYPE_MISMATCH')
                ) {
                  await rollbackUserAiQuota(userId, clientIp);
                  return sendError(res, 'INVALID_ATTACHMENT', safeMsg || e.message, 400);
                }
              }
            }
          }
          
          await prisma.chats.update({
            where: { id: currentChatId },
            data: { updatedAt: new Date() }
          });
        } else {
          await prisma.chatMessages.create({
            data: {
               id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
               chatId: currentChatId,
               role: 'user',
               content: encryptionService.encryptSensitive(pluginResult) || pluginResult,
               plugin: 'system_plugin_result'
            }
          });
        }
      } catch (dbErr: any) {
        console.warn(`[CHAT_DB_WARNING] Database write failed, falling back to temporary mode: ${dbErr.message}`);
        activeIsTemporary = true;
      }
    }

    const messagesToSend = [];
    const currentWorkspaceAttachmentIds = new Set<string>(
      isWorkspace && Array.isArray(attachments)
        ? attachments.map((attachment: any) => typeof attachment === 'string' ? attachment : attachment?.id).filter((id: unknown): id is string => typeof id === 'string')
        : []
    );
    
    if (!activeIsTemporary && userId && currentChatId) {
      try {
        const history = await prisma.chatMessages.findMany({
          where: { chatId: currentChatId },
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: { attachments: true }
        });
        history.reverse();
        if (isolatedTaskExecution === true) {
          if (!isWorkspace) return sendError(res, 'TASK_CONTEXT_DENIED', 'Konteks terisolasi hanya tersedia di Workspace.', 403);
          const latestUserIndex = history.map((msg: any) => msg.role === 'user').lastIndexOf(true);
          if (latestUserIndex < 0) history.length = 0;
          else history.splice(0, latestUserIndex);
        }
        for (const msg of history) {
           // Skip duplicating the current prompt
          const decryptedContent = encryptionService.decryptSensitive(msg.content) || msg.content;
          if (msg.plugin === 'system_plugin_result') {
            messagesToSend.push({ role: 'user', parts: [{ text: `[PLUGIN_RESULT]\n${decryptedContent}` }] });
          } else if (msg.plugin) {
             messagesToSend.push({ role: 'model', parts: [{ text: `{"tool_call": "${msg.plugin}"}` }] });
          } else {
            
            const parts: any[] = [{ text: decryptedContent }];
            if (msg.attachments && msg.attachments.length > 0) {
              for (const att of msg.attachments) {
                if (isWorkspace && (!currentWorkspaceAttachmentIds.has(att.id) || (att.fileKind !== 'image' && !att.mimeType?.startsWith('image/')))) continue;
                try {
                  const res = await attachmentStorageService.getAttachmentForUser(att.id, userId || 'guest');
                  if (res) {
                    if (att.mimeType === 'text/plain' || att.mimeType === 'text/markdown') {
                      let text = res.buffer.toString('utf8');
                      text = scanAndSanitizePII(text).sanitizedText;
                      if (aiSafetyService.detectPromptInjection(text)) {
                        text = '[REDACTED_UNTRUSTED_ATTACHMENT_INJECTION]';
                      }
                      parts.push({ text: `[LAMPIRAN TEKS: ${att.filename}]\n${text}` });
                    } else {
                      parts.push({
                        inlineData: {
                          data: res.base64!,
                          mimeType: att.mimeType
                        }
                      });
                    }
                  }
                } catch (err: any) {
                  console.warn(`[ATTACHMENT_READ_WARN] Could not read attachment ${att.id}:`, err.message);
                }
              }
            }
            messagesToSend.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts });

          }
        }
      } catch (e) {
        const parts: any[] = [{ text: pluginResult ? `[PLUGIN_RESULT]\n${pluginResult}` : cleanMessage }];
        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
          for (const att of attachments) {
            try {
              const attId = typeof att === 'string' ? att : att?.id;
              if (isWorkspace && (!attId || !currentWorkspaceAttachmentIds.has(attId) || !att.mimeType?.startsWith('image/'))) continue;
              if (attId) {
                const res = await attachmentStorageService.getAttachmentForUser(attId, userId || 'guest');
                if (res) {
                  if (res.attachment.mimeType === 'text/plain' || res.attachment.mimeType === 'text/markdown') {
                    let text = res.buffer.toString('utf8');
                    text = scanAndSanitizePII(text).sanitizedText;
                    if (aiSafetyService.detectPromptInjection(text)) {
                      text = '[REDACTED_UNTRUSTED_ATTACHMENT_INJECTION]';
                    }
                    parts.push({ text: `[LAMPIRAN TEKS: ${res.attachment.filename}]\n${text}` });
                  } else {
                    parts.push({
                      inlineData: {
                        data: res.base64!,
                        mimeType: res.attachment.mimeType
                      }
                    });
                  }
                }
              } else if (att.base64) {
                if (att.mimeType === 'text/plain' || att.mimeType === 'text/markdown') {
                  const base64Data = att.base64.includes(',') ? att.base64.split(',')[1] : att.base64;
                  let text = Buffer.from(base64Data, 'base64').toString('utf8');
                  text = scanAndSanitizePII(text).sanitizedText;
                  if (aiSafetyService.detectPromptInjection(text)) {
                    text = '[REDACTED_UNTRUSTED_ATTACHMENT_INJECTION]';
                  }
                  parts.push({ text: `[LAMPIRAN TEKS: ${att.filename || 'attachment.txt'}]\n${text}` });
                } else {
                  const base64Data = att.base64.includes(',') ? att.base64.split(',')[1] : att.base64;
                  parts.push({
                    inlineData: {
                      data: base64Data,
                      mimeType: att.mimeType
                    }
                  });
                }
              }
            } catch (err) {}
          }
        }
        messagesToSend.push({ role: 'user', parts });
      }
    } else {
      const parts: any[] = [{ text: pluginResult ? `[PLUGIN_RESULT]\n${pluginResult}` : cleanMessage }];
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        for (const att of attachments) {
          try {
            const attId = typeof att === 'string' ? att : att?.id;
            if (isWorkspace && (!attId || !currentWorkspaceAttachmentIds.has(attId) || !att.mimeType?.startsWith('image/'))) continue;
            if (attId) {
              const res = await attachmentStorageService.getAttachmentForUser(attId, userId || 'guest');
              if (res) {
                if (res.attachment.mimeType === 'text/plain' || res.attachment.mimeType === 'text/markdown') {
                  let text = res.buffer.toString('utf8');
                  text = scanAndSanitizePII(text).sanitizedText;
                  if (aiSafetyService.detectPromptInjection(text)) {
                    text = '[REDACTED_UNTRUSTED_ATTACHMENT_INJECTION]';
                  }
                  parts.push({ text: `[LAMPIRAN TEKS: ${res.attachment.filename}]\n${text}` });
                } else {
                  parts.push({
                    inlineData: {
                      data: res.base64!,
                      mimeType: res.attachment.mimeType
                    }
                  });
                }
              }
            } else if (att.base64) {
              if (att.mimeType === 'text/plain' || att.mimeType === 'text/markdown') {
                const base64Data = att.base64.includes(',') ? att.base64.split(',')[1] : att.base64;
                let text = Buffer.from(base64Data, 'base64').toString('utf8');
                text = scanAndSanitizePII(text).sanitizedText;
                if (aiSafetyService.detectPromptInjection(text)) {
                  text = '[REDACTED_UNTRUSTED_ATTACHMENT_INJECTION]';
                }
                parts.push({ text: `[LAMPIRAN TEKS: ${att.filename || 'attachment.txt'}]\n${text}` });
              } else {
                const base64Data = att.base64.includes(',') ? att.base64.split(',')[1] : att.base64;
                parts.push({
                  inlineData: {
                    data: base64Data,
                    mimeType: att.mimeType
                  }
                });
              }
            }
          } catch (err) {}
        }
      }
      messagesToSend.push({ role: 'user', parts });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    // Let RuangKerja bind its newly-created conversation immediately so a
    // clear request during generation can still target the persisted messages.
    if (isWorkspace && isNewChat && currentChatId) {
      res.write(`data: ${JSON.stringify({ chatId: currentChatId })}\n\n`);
    }

    // Periodically send SSE keepalive heartbeat every 15 seconds to prevent Cloud Run / Nginx / reverse proxy timeouts
    const keepAliveTimer = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': keepalive\n\n');
      } else {
        clearInterval(keepAliveTimer);
      }
    }, 15000);

    const cleanupKeepAlive = () => {
      clearInterval(keepAliveTimer);
    };

    req.on('close', cleanupKeepAlive);
    res.on('finish', cleanupKeepAlive);
    res.on('close', cleanupKeepAlive);

    const runLocalFallback = async () => {
      if (isWorkspace && (clientDisconnected || reqAbortController.signal.aborted)) {
        if (!res.writableEnded) res.end();
        return;
      }
      console.warn('Executing Local Fallback AI stream response');
      const fallbackResponse = getLocalFallbackResponse(cleanMessage || pluginResult || '', chatMode, responseStyle);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({
          type: 'routing',
          modelUsed: 'local-empathetic-fallback',
          isFallback: true,
          fallbackFrom: aiModel,
          routingMode: routingDecision.routingMode,
          routingReason: 'Model penyedia tidak menyelesaikan respons; jawaban lokal digunakan.'
        })}\n\n`);
      }
      
      if (fallbackResponse.tool_call) {
        res.write(`data: ${JSON.stringify({ tool_call: fallbackResponse.tool_call, parameters: { reason: fallbackResponse.text } })}\n\n`);
        
        if (!activeIsTemporary && userId && currentChatId && !(isWorkspace && (clientDisconnected || reqAbortController.signal.aborted))) {
          try {
            await prisma.chatMessages.create({
              data: {
                id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                chatId: currentChatId,
                role: 'assistant',
                content: encryptionService.encryptSensitive(`Memanggil ${fallbackResponse.tool_call}`) || `Memanggil ${fallbackResponse.tool_call}`,
                plugin: fallbackResponse.tool_call
              }
            });
          } catch(e) {}
        }
      } else {
        const words = fallbackResponse.text.split(' ');
        let currentFullText = '';
        for (const word of words) {
          if (isWorkspace && (clientDisconnected || reqAbortController.signal.aborted)) break;
          const chunk = word + ' ';
          currentFullText += chunk;
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        
        if (!activeIsTemporary && userId && currentChatId && !(isWorkspace && (clientDisconnected || reqAbortController.signal.aborted))) {
          try {
            await prisma.chatMessages.create({
              data: {
                id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                chatId: currentChatId,
                role: 'assistant',
                content: encryptionService.encryptSensitive(currentFullText.trim()) || currentFullText.trim()
              }
            });
          } catch(e) {}
        }
      }

      if (isNewChat && !activeIsTemporary && userId) {
        try {
          const title = (cleanMessage || 'Percakapan').substring(0, 30) + ((cleanMessage && cleanMessage.length > 30) ? '...' : '');
          res.write(`data: ${JSON.stringify({ newTitle: title })}\n\n`);
        } catch(e) {}
      }

      res.write(`data: ${JSON.stringify({ done: true, chatId: currentChatId })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    };

    const reqAbortController = new AbortController();
    let clientDisconnected = false;

    req.on('close', () => {
      clientDisconnected = true;
      reqAbortController.abort();
    });
    req.on('aborted', () => {
      clientDisconnected = true;
      reqAbortController.abort();
    });
    res.on('close', () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
        reqAbortController.abort();
      }
    });

    const requestStartTime = Date.now();
    let firstTokenTime = 0;

    let responseStream: any = null;
    let fullResponseText = '';
    let pipelineRes: any = null;
    const requestedWorkspaceAttachmentIds = Array.isArray(workspaceAttachmentIds)
      ? [...new Set(workspaceAttachmentIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0 && id.length <= 100))].slice(0, 8)
      : [];

    if (requestedWorkspaceAttachmentIds.length > 0) {
      if (!isWorkspace || !currentChatId || !userId || userId === 'guest') {
        if (userId) await rollbackUserAiQuota(userId, clientIp).catch(() => undefined);
        return sendError(res, 'WORKSPACE_FILE_ACCESS_DENIED', 'File hanya dapat digunakan dari Workspace yang memilikinya.', 403);
      }
      const ownedReadyFiles = await prisma.attachments.findMany({
        where: { id: { in: requestedWorkspaceAttachmentIds }, chatId: currentChatId, userId, status: 'ready' },
        select: { id: true }
      });
      if (ownedReadyFiles.length !== requestedWorkspaceAttachmentIds.length) {
        await rollbackUserAiQuota(userId, clientIp).catch(() => undefined);
        return sendError(res, 'WORKSPACE_FILE_ACCESS_DENIED', 'File tidak tersedia di Workspace ini.', 403);
      }
    }
    
    try {
      // Call the canonical Unified Safety Pipeline
      pipelineRes = await aiSafetyService.runUnifiedPipeline({
        userId,
        input: cleanMessage,
        chatId: currentChatId,
        mode,
        chatMode,
        responseStyle,
        aiModel,
        userTier,
        userRole,
        history: messagesToSend,
        pluginResult,
        workspaceMode: Boolean(workspaceMode) || (mode || '').toLowerCase().includes('ruang_kerja') || (chatMode || '').toLowerCase().includes('ruangkerja'),
        attachments,
        includeWorkspaceFiles: typeof includeWorkspaceFiles === 'boolean' ? includeWorkspaceFiles : undefined,
        workspaceAttachmentIds: isWorkspace ? requestedWorkspaceAttachmentIds : undefined,
        isStreaming: true,
        isTemporary: activeIsTemporary,
        abortSignal: reqAbortController.signal,
        routingDecision,
        routingContext
      });
    } catch (err: any) {
      console.warn('[CHAT_STREAM] Unified safety pipeline threw error, switching to fallback:', err?.message || err);
      return await runLocalFallback();
    }

    if (!pipelineRes) {
      return await runLocalFallback();
    }

    if (pipelineRes.isConsentFallback || pipelineRes.modelUsed?.startsWith('local-')) {
      console.log('Fallback triggered from pipeline result!');
      return await runLocalFallback();
    }

    if (pipelineRes.isPromptInjectionOverride) {
      if (!res.writableEnded) {
        res.write('data: ' + JSON.stringify({ text: pipelineRes.text }) + '\n\n');
        res.write(`data: ${JSON.stringify({ done: true, chatId: currentChatId })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
      return;
    }

    if (pipelineRes.isCrisisOverride) {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ isCrisis: true, crisisDetected: true, tool_call: 'emergency', parameters: { reason: 'CRISIS_HOTLINE_TRIGGER' } })}\n\n`);
      }
      const crisisResponse = pipelineRes.text;
      const words = crisisResponse.split(' ');
      let currentFullText = '';
      for (const word of words) {
         if (clientDisconnected || reqAbortController.signal.aborted) break;
         const chunk = word + ' ';
         currentFullText += chunk;
         if (!res.writableEnded) {
           res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
         }
         await new Promise(resolve => setTimeout(resolve, 30));
      }
      if (!isTemporary && userId && currentChatId && !clientDisconnected) {
        try {
          await prisma.chatMessages.create({
             data: {
               id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
               chatId: currentChatId,
               role: 'assistant',
               content: encryptionService.encryptSensitive(currentFullText.trim()) || currentFullText.trim()
             }
          });
        } catch (e) {}
      }
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ done: true, chatId: currentChatId })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
      return;
    }

    responseStream = pipelineRes.stream;

    if (!responseStream) {
      console.log('Stream falsy, executing fallback!');
      await runLocalFallback();
      return;
    }

    try {
      fullResponseText = '';
      let isToolCall = false;
      let validToolCallParsed: any = null;
      let hasStreamedAnyText = false;

      // Emit routing decision event so client can display which model was actually routed
      if (pipelineRes.routingDecision && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({
          type: 'routing',
          modelUsed: pipelineRes.modelUsed || pipelineRes.routingDecision.selectedModelId,
          modelRequested: pipelineRes.routingDecision.selectedModelId,
          providerUsed: getModelDefinition(pipelineRes.modelUsed)?.provider || 'local',
          isFallback: Boolean(pipelineRes.isFallback),
          fallbackFrom: pipelineRes.isFallback ? pipelineRes.routingDecision.selectedModelId : undefined,
          routingMode: pipelineRes.routingDecision.routingMode,
          routingReason: pipelineRes.routingDecision.routingReason,
          presetId: routingContext.presetId
        })}\n\n`);
      }

      if (pipelineRes.sourceReferences && pipelineRes.sourceReferences.length > 0 && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ sources: pipelineRes.sourceReferences })}\n\n`);
      }

      for await (const chunk of responseStream) {
        if (clientDisconnected || reqAbortController.signal.aborted || res.writableEnded) {
          console.log('[SSE] Client disconnected or request aborted, stopping stream');
          break;
        }

        const text = chunk.text;
        if (text) {
          if (!firstTokenTime) {
            firstTokenTime = Date.now();
          }
          fullResponseText += text;
          if (fullResponseText.trim().startsWith('{')) {
             isToolCall = true;
          }

          if (!isToolCall && !res.writableEnded) {
            hasStreamedAnyText = true;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
      }

      // Record performance & usage metrics
      const requestEndTime = Date.now();
      const ttfb = firstTokenTime ? (firstTokenTime - requestStartTime) : (requestEndTime - requestStartTime);
      
      aiMetricsService.recordRequestMetric({
        requestId: pipelineRes.requestId || `req_${Date.now()}`,
        ttfbMs: ttfb,
        totalLatencyMs: requestEndTime - requestStartTime,
        inputChars: (cleanMessage || pluginResult || '').length,
        estimatedInputTokens: aiMetricsService.estimateTokens(cleanMessage || pluginResult || ''),
        outputChars: fullResponseText.length,
        estimatedOutputTokens: aiMetricsService.estimateTokens(fullResponseText),
        contextSavedTokens: 0,
        modelUsed: pipelineRes.modelUsed || aiModel,
        isFallback: Boolean(pipelineRes.isFallback),
        aborted: clientDisconnected || reqAbortController.signal.aborted,
        routingMode: pipelineRes.routingDecision?.routingMode,
        routeReason: pipelineRes.routingDecision?.routingReason
      });

      if (clientDisconnected || reqAbortController.signal.aborted) {
        console.log('[SSE] Request was aborted mid-stream by client. Avoiding duplicate response writes.');
        if (!res.writableEnded) {
          res.end();
        }
        return;
      }

      if (isToolCall) {
        try {
          const parsed = JSON.parse(fullResponseText.trim());
          const validation = validateAndSanitizeToolCall(parsed);
          
          if (validation.isValid && validation.toolCall) {
            validToolCallParsed = { tool_call: validation.toolCall, parameters: validation.parameters || {} };
            
            if (validToolCallParsed.tool_call === 'ai_memory' && validToolCallParsed.parameters.action === 'save') {
               const memContent = validToolCallParsed.parameters.content;
               if (memContent && userId && !activeIsTemporary) {
                  try {
                    await prisma.userMemories.create({
                      data: {
                        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                        userId: userId,
                        content: encryptionService.encryptSensitive(memContent) || memContent
                      }
                    });
                  } catch(e) {}
               }
            }

            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ tool_call: validToolCallParsed.tool_call, parameters: validToolCallParsed.parameters || {} })}\n\n`);
            }
            
            if (!activeIsTemporary && userId && currentChatId) {
               try {
                 await prisma.chatMessages.create({
                    data: {
                      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                      chatId: currentChatId,
                      role: 'assistant',
                      content: encryptionService.encryptSensitive(`Memanggil ${validToolCallParsed.tool_call}`) || `Memanggil ${validToolCallParsed.tool_call}`,
                      plugin: validToolCallParsed.tool_call
                    }
                 });
               } catch(e) {}
            }
          } else {
            // Invalid JSON tool call format, just send as text if safe
            const validationText = aiSafetyService.validateOutput(fullResponseText);
            const safeText = validationText.isValid ? fullResponseText : 'Maaf, tanggapan tidak dapat ditampilkan demi kepatuhan klinis.';
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ text: safeText })}\n\n`);
            }
            if (!activeIsTemporary && userId && currentChatId) {
               try {
                 await prisma.chatMessages.create({
                    data: {
                      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                      chatId: currentChatId,
                      role: 'assistant',
                      content: encryptionService.encryptSensitive(safeText) || safeText
                    }
                 });
               } catch(e) {}
            }
          }
        } catch (e) {
          // JSON Parse failed
          const validationText = aiSafetyService.validateOutput(fullResponseText);
          const safeText = validationText.isValid ? fullResponseText : 'Maaf, tanggapan tidak dapat ditampilkan demi kepatuhan klinis.';
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ text: safeText })}\n\n`);
          }
          if (!activeIsTemporary && userId && currentChatId) {
             try {
               await prisma.chatMessages.create({
                  data: {
                    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    chatId: currentChatId,
                    role: 'assistant',
                    content: encryptionService.encryptSensitive(safeText) || safeText
                  }
               });
             } catch(e) {}
          }
        }
      } else {
        if (!hasStreamedAnyText && !fullResponseText) {
          // Stream produced nothing, fallback to local response
          console.warn('[CHAT_STREAM] Stream produced no output, running fallback');
          return await runLocalFallback();
        }

        if (!activeIsTemporary && userId && currentChatId && fullResponseText) {
           try {
             await prisma.chatMessages.create({
                data: {
                  id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                  chatId: currentChatId,
                  role: 'assistant',
                  content: encryptionService.encryptSensitive(fullResponseText) || fullResponseText
                }
             });
           } catch(e) {}
        }
      }

      if (isNewChat && !activeIsTemporary && userId && !res.writableEnded) {
         try {
            const title = (message || 'Percakapan').substring(0, 30) + ((message && message.length > 30) ? '...' : '');
            res.write(`data: ${JSON.stringify({ newTitle: title })}\n\n`);
         } catch(e) {}
      }

      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ done: true, chatId: currentChatId, sources: pipelineRes.sourceReferences })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } catch (e: any) {
      console.warn(`[CHAT_STREAM] requestId=${(pipelineRes as any).requestId || 'unknown'} stream interrupted category=${e?.category || 'INTERNAL_ERROR'}`);
      if (isWorkspace && (clientDisconnected || reqAbortController.signal.aborted)) {
        if (!res.writableEnded) res.end();
        return;
      }
      if (!res.writableEnded) {
        if (fullResponseText.trim()) {
          const interruptedMarker = '\n\n*(Respons terputus sebelum selesai. Kamu bisa mencoba ulang.)*';
          fullResponseText += interruptedMarker;
          res.write(`data: ${JSON.stringify({ text: interruptedMarker })}\n\n`);
          if (!activeIsTemporary && userId && currentChatId) {
            try {
              await prisma.chatMessages.create({
                data: {
                  id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                  chatId: currentChatId,
                  role: 'assistant',
                  content: encryptionService.encryptSensitive(fullResponseText) || fullResponseText
                }
              });
            } catch {}
          }
        } else {
          const safeMessage = e?.category === 'TIMEOUT'
            ? 'Model membutuhkan waktu terlalu lama untuk merespons.'
            : e?.category === 'RATE_LIMIT'
              ? 'Model sedang menerima terlalu banyak permintaan.'
              : 'Model sedang tidak tersedia.';
          res.write(`data: ${JSON.stringify({ error: true, code: e?.category || 'PROVIDER_UNAVAILABLE', message: safeMessage })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true, chatId: currentChatId })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  } catch (error: any) {
    console.error('[CHAT_STREAM] Outer unhandled error:', error);
    if (!res.headersSent) {
      sendError(res, 'INTERNAL_SERVER_ERROR', 'Terjadi kesalahan pada server');
    } else if (!res.writableEnded) {
      try {
        res.write(`data: ${JSON.stringify({ text: "\n\nAku di sini untuk mendengarkanmu. Ceritakan apa yang sedang kamu rasakan yaa 🌿" })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (e) {}
    }
  }
});

// Truncate history from a specific message onwards (for Edit & Regenerate)
router.post('/chat/truncate-history', requireAuth, checkChatOwnership, async (req: Request, res: Response) => {
  try {
    const { chatId, messageId } = req.body;
    
    if (!chatId || !messageId) {
      return sendError(res, 'INVALID_INPUT', 'Parameter chatId dan messageId diperlukan', 400);
    }
    
    const targetMsg = await prisma.chatMessages.findFirst({ where: { id: messageId, chatId } });
    if (targetMsg) {
      // Delete this message and all subsequent messages
      await prisma.chatMessages.deleteMany({
        where: {
          chatId,
          createdAt: { gte: targetMsg.createdAt }
        }
      });
    }
    
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to truncate chat history:', err);
    sendError(res, 'TRUNCATE_FAILED', 'Gagal memotong riwayat pesan', 500);
  }
});

// Daily AI Reflection Prompts
router.post('/chat/reflection-prompts', optionalAuth, aiAbuseLimiter, async (req: Request, res: Response) => {
  try {
    const { mood, feeling, context } = req.body;
    const userId = req.user?.userId;
    const result = await aiGateway.generateReflectionPrompts({
      userId,
      mood,
      feeling,
      context
    });
    res.json({ prompts: result.prompts, source: result.source });
  } catch (err) {
    res.json({
      prompts: [
        "Apa satu hal kecil hari ini yang membuatmu merasa sedikit lebih tenang?",
        "Bagaimana perasaan fisikmu saat ini, apakah ada ketegangan di bahu atau leher?",
        "Apa satu hal yang bisa kamu relakan sejenak agar bisa beristirahat malam ini?"
      ],
      source: 'deterministic_fallback'
    });
  }
});

// AI Weekly Mood Insights
router.post('/chat/mood-insights', optionalAuth, aiAbuseLimiter, async (req: Request, res: Response) => {
  try {
    const { logs, averageMood, streak } = req.body;
    const userId = req.user?.userId;
    const result = await aiGateway.generateMoodInsights({
      userId,
      logs,
      averageMood,
      streak
    });
    res.json({
      summary: result.summary,
      patterns: result.patterns,
      recommendations: result.recommendations,
      source: result.source
    });
  } catch (err) {
    res.json({
      summary: "Catatan mood harianmu tersimpan dengan baik.",
      patterns: ["Tetap jaga ritme istirahat dan nutrisi."],
      recommendations: ["Lakukan latihan pernapasan saat merasa cemas."],
      source: 'deterministic_fallback'
    });
  }
});

import { MemoryController } from '../controllers/memoryController.js';

// ... (other code)

// Memories
router.get('/memories', requireAuth, MemoryController.getMemories);
router.post('/memories', requireAuth, MemoryController.createMemory);
router.put('/memories/:id', requireAuth, MemoryController.updateMemory);
router.delete('/memories/:id', requireAuth, MemoryController.deleteMemory);
router.delete('/memories', requireAuth, MemoryController.deleteAllMemories);

export default router;
