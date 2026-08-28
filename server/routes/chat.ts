import { prisma } from '../database.js';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { aiAbuseLimiter } from '../middleware/aiAbuseLimiter.js';
import { sanitizeInput, detectPromptInjection } from '../security.js';
import { scanAndSanitizePII } from '../services/piiService.js';
import { checkUserAiUsageLimit, recordUserAiUsage } from '../services/aiUsageLimiter.js';
import { serverDb } from '../database.js';
import { consentService } from '../services/consentService.js';
import { encryptionService } from '../services/encryptionService.js';
import { getLocalFallbackResponse, getLocalFallbackSummary, getLocalFallbackFollowups } from './fallbackAi.js';
import { withRetry } from '../apiV1Helpers.js';
import { AVAILABLE_AI_MODELS } from '../services/ai/aiModelRegistry.js';
import { aiRequestService } from '../services/ai/aiRequestService.js';
import { aiSafetyService } from '../services/ai/aiSafetyService.js';
import { aiGateway } from '../services/ai/aiGateway.js';
import { validateAndSanitizeToolCall } from '../services/ai/aiToolSchemas.js';
import { ChatController } from '../controllers/chatController.js';
import { DEFAULT_AI_MODEL } from '../config/aiConfig.js';

const router = Router();

// Error wrapper helper
const sendError = (res: Response, code: string, message: string, status = 500) => {
  res.status(status).json({ 
    success: false, 
    code, 
    message,
    error: { code, message }
  });
};

// Middleware to check ownership for a specific chat ID
const checkChatOwnership = async (req: Request, res: Response, next: any) => {
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
router.get('/chat/models', ChatController.getModels);
router.get('/chat/history', requireAuth, ChatController.getHistory);
router.get('/chat/search', requireAuth, ChatController.search);
router.get('/chat/:id/messages', requireAuth, checkChatOwnership, ChatController.getMessages);
router.put('/chat/:id/title', requireAuth, checkChatOwnership, ChatController.updateTitle);
router.put('/chat/:id/pin', requireAuth, checkChatOwnership, ChatController.togglePin);
router.put('/chat/:id/archive', requireAuth, checkChatOwnership, ChatController.toggleArchive);
router.delete('/chat/:id', requireAuth, checkChatOwnership, ChatController.deleteChat);
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

router.post('/chat/summary', requireAuth, checkChatOwnership, aiAbuseLimiter, async (req: Request, res: Response) => {
  try {
    const { chatId, aiModel = DEFAULT_AI_MODEL } = req.body;
    let history = await prisma.chatMessages.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' }
    });
    history = history.map(m => ({ ...m, content: encryptionService.decryptSensitive(m.content) || m.content }));
    
    // Enforce explicit AI consent check before external processing
    const hasAiConsent = await consentService.canUseAI(req.user!.userId);
    if (!hasAiConsent) {
      const localSummary = getLocalFallbackSummary(history);
      return res.json({ summary: localSummary });
    }

    try {
      const chatText = history.map(m => `${m.role}: ${m.content}`).join('\n');
      const response = await aiRequestService.generateChatResponse({
        userId: req.user!.userId,
        prompt: `Buat ringkasan percakapan berikut:\n- Inti pembahasan\n- Perasaan utama pengguna\n- Hal yang sudah dibahas\n- Langkah kecil berikutnya\n\nPercakapan:\n${chatText}`,
        systemInstruction: 'Anda adalah AI asisten summarization.',
        requestedModelId: 'gemini-3.1-flash-lite', userTier: 'Free'});
      if (response.text && !response.isFallback) {
        return res.json({ summary: response.text });
      }
    } catch (err) {
      console.warn('Gemini summary failed, falling back to local summary:', err);
    }
    
    const localSummary = getLocalFallbackSummary(history);
    res.json({ summary: localSummary });
  } catch (e: any) {
    sendError(res, 'SUMMARY_FAILED', 'Gagal membuat ringkasan percakapan');
  }
});

router.post('/chat/followup', requireAuth, checkChatOwnership, aiAbuseLimiter, async (req: Request, res: Response) => {
  try {
    const { chatId, aiModel = DEFAULT_AI_MODEL } = req.body;
    let history = await prisma.chatMessages.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: -5
    });
    history = history.map(m => ({ ...m, content: encryptionService.decryptSensitive(m.content) || m.content }));
    const lastMessageText = history[history.length - 1]?.content || '';
    
    // Enforce explicit AI consent check before external processing
    const hasAiConsent = await consentService.canUseAI(req.user!.userId);
    if (!hasAiConsent) {
      return res.json({ recommendations: getLocalFallbackFollowups(lastMessageText) });
    }

    try {
      const chatText = history.map(m => `${m.role}: ${m.content}`).join('\n');
      const response = await aiRequestService.generateChatResponse({
        userId: req.user!.userId,
        prompt: `Berdasarkan 5 pesan terakhir percakapan ini, berikan maksimal 3 rekomendasi pertanyaan lanjutan (follow-up) singkat yang bisa ditanyakan pengguna kepada AI. Balas HANYA dengan JSON array of strings, tanpa markdown. Contoh: ["Bagaimana cara mengatasinya?", "Apa yang harus saya lakukan?"]\n\nPercakapan:\n${chatText}`,
        systemInstruction: 'Anda adalah AI asisten summarization.',
        requestedModelId: 'gemini-3.1-flash-lite', userTier: 'Free'});
      if (response.text && !response.isFallback) {
        const recommendations = JSON.parse(response.text.replace(/```json\n?|```/g, '').trim() || '[]');
        if (Array.isArray(recommendations) && recommendations.length > 0) {
          return res.json({ recommendations: recommendations.slice(0, 3) });
        }
      }
    } catch (err) {
      console.warn('Gemini followup recommendations failed, falling back to local followups:', err);
    }
    
    const localFollowups = getLocalFallbackFollowups(lastMessageText);
    res.json({ recommendations: localFollowups });
  } catch (e: any) {
    try {
      const history = await prisma.chatMessages.findMany({ where: { chatId: req.body.chatId }, orderBy: { createdAt: 'asc' }, take: -1 });
      const lastMessageText = history[0]?.content || '';
      res.json({ recommendations: getLocalFallbackFollowups(lastMessageText) });
    } catch (innerErr) {
      res.json({ recommendations: ['Boleh tolong temani aku mengobrol sejenak?', 'Bagaimana cara meredakan rasa cemas?', 'Apa latihan mindfulness sederhana?'] });
    }
  }
});

// Main Streaming Chat Route
router.post('/chat/stream', optionalAuth, aiAbuseLimiter, async (req: Request, res: Response) => {
  try {
    const { 
      message, 
      chatId, 
      isTemporary, 
      pluginResult, 
      chatMode, 
      responseStyle, 
      aiModel = DEFAULT_AI_MODEL
    } = req.body;
    
    const isAnonymous = !req.user || req.user.userId === 'guest';
    const maxLength = isAnonymous ? 500 : 2000;
    let cleanMessage = sanitizeInput(message || '', maxLength);
    cleanMessage = scanAndSanitizePII(cleanMessage).sanitizedText;
    
    if (detectPromptInjection(cleanMessage)) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write('data: ' + JSON.stringify({ text: 'Maaf, respons dibatasi oleh sistem keamanan kami karena terdeteksi adanya percobaan manipulasi prompt. Mari kita kembali fokus membahas perasaan dan apa yang sedang kamu alami dengan aman.' }) + '\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const userId = req.user?.userId;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    let userTier = (req.user as any)?.tier;
    let userRole = req.user?.role;
    if (userId) {
      const dbUser = await serverDb.getUserById(userId);
      if (dbUser) {
        userTier = dbUser.tier;
        userRole = dbUser.role;
      }
    }

    // Enforce daily usage limit check to prevent API key exhaustion
    const usageCheck = await checkUserAiUsageLimit(userId, clientIp, userTier, userRole);
    if (!usageCheck.allowed) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write('data: ' + JSON.stringify({ 
        error: 'DAILY_LIMIT_EXCEEDED', 
        text: `⚠️ ${usageCheck.message}` 
      }) + '\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // Increment usage counter for allowed request
    await recordUserAiUsage(userId, clientIp);

    let activeIsTemporary = isTemporary || !userId;
    let currentChatId = chatId;
    let isNewChat = false;

    if (!activeIsTemporary && userId) {
      try {
        if (currentChatId) {
          // Ownership check
          const existingChat = await prisma.chats.findFirst({ where: { id: currentChatId, userId } });
          if (!existingChat) {
            return sendError(res, 'NOT_FOUND', 'Percakapan tidak ditemukan atau bukan milik Anda', 404);
          }
        } else {
          isNewChat = true;
          const newTitle = message ? (message.substring(0, 30) + (message.length > 30 ? '...' : '')) : 'Percakapan Baru';
          const newChat = await prisma.chats.create({
            data: {
              id: `chat_${Date.now()}`,
              userId,
              title: encryptionService.encryptSensitive(newTitle) || newTitle,
            }
          });
          currentChatId = newChat.id;
        }
        
        if (!pluginResult) {
          await prisma.chatMessages.create({
            data: {
              id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              chatId: currentChatId,
              role: 'user',
              content: encryptionService.encryptSensitive(message) || message
            }
          });
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
    
    if (!activeIsTemporary && userId && currentChatId) {
      try {
        const history = await prisma.chatMessages.findMany({
          where: { chatId: currentChatId },
          orderBy: { createdAt: 'desc' },
          take: 20
        });
        history.reverse();
        for (const msg of history) {
          const decryptedContent = encryptionService.decryptSensitive(msg.content) || msg.content;
          if (msg.plugin === 'system_plugin_result') {
            messagesToSend.push({ role: 'user', parts: [{ text: `[PLUGIN_RESULT]\n${decryptedContent}` }] });
          } else if (msg.plugin) {
             messagesToSend.push({ role: 'model', parts: [{ text: `{"tool_call": "${msg.plugin}"}` }] });
          } else {
            messagesToSend.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: decryptedContent }] });
          }
        }
      } catch (e) {
        if (!pluginResult) {
          messagesToSend.push({ role: 'user', parts: [{ text: message }] });
        } else {
          messagesToSend.push({ role: 'user', parts: [{ text: `[PLUGIN_RESULT]\n${pluginResult}` }] });
        }
      }
    } else {
      if (!pluginResult) {
        messagesToSend.push({ role: 'user', parts: [{ text: message }] });
      } else {
        messagesToSend.push({ role: 'user', parts: [{ text: `[PLUGIN_RESULT]\n${pluginResult}` }] });
      }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const runLocalFallback = async () => {
      console.warn('Executing Local Fallback AI stream response');
      const fallbackResponse = getLocalFallbackResponse(message || pluginResult || '', chatMode, responseStyle);
      
      if (fallbackResponse.tool_call) {
        res.write(`data: ${JSON.stringify({ tool_call: fallbackResponse.tool_call, parameters: { reason: fallbackResponse.text } })}\n\n`);
        
        if (!activeIsTemporary && userId && currentChatId) {
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
          const chunk = word + ' ';
          currentFullText += chunk;
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        
        if (!activeIsTemporary && userId && currentChatId) {
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
          const title = (message || 'Percakapan').substring(0, 30) + ((message && message.length > 30) ? '...' : '');
          res.write(`data: ${JSON.stringify({ newTitle: title })}\n\n`);
        } catch(e) {}
      }

      res.write(`data: ${JSON.stringify({ done: true, chatId: currentChatId })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    };

    let responseStream: any = null;
    
    // Call the canonical Unified Safety Pipeline
    const pipelineRes = await aiSafetyService.runUnifiedPipeline({
      userId,
      input: message,
      chatId: currentChatId,
      chatMode,
      responseStyle,
      aiModel,
      userTier,
      userRole,
      history: messagesToSend,
      pluginResult,
      isStreaming: true
    });

    if (pipelineRes.isConsentFallback) {
      return runLocalFallback();
    }

    if (pipelineRes.isPromptInjectionOverride) {
      res.write('data: ' + JSON.stringify({ text: pipelineRes.text }) + '\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    if (pipelineRes.isCrisisOverride) {
      const crisisResponse = pipelineRes.text;
      const words = crisisResponse.split(' ');
      let currentFullText = '';
      for (const word of words) {
         const chunk = word + ' ';
         currentFullText += chunk;
         res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
         await new Promise(resolve => setTimeout(resolve, 30));
      }
      if (!isTemporary && userId && currentChatId) {
        await prisma.chatMessages.create({
           data: {
             id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
             chatId: currentChatId,
             role: 'assistant',
             content: encryptionService.encryptSensitive(currentFullText.trim()) || currentFullText.trim()
           }
        });
      }
      res.write(`data: ${JSON.stringify({ done: true, chatId: currentChatId })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    responseStream = pipelineRes.stream;

    if (!responseStream) {
      await runLocalFallback();
      return;
    }

    // Add client disconnect handler
    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    try {
      let fullResponseText = '';
      let isToolCall = false;
      let validToolCallParsed: any = null;

      let sentenceBuffer = '';
      let safetyViolationDetected = false;

      for await (const chunk of responseStream) {
        if (clientDisconnected) {
          console.log('[SSE] Client disconnected, aborting AI stream');
          break;
        }

        if (safetyViolationDetected) {
          break;
        }

        const text = chunk.text;
        if (text) {
          fullResponseText += text;
          if (fullResponseText.trim().startsWith('{')) {
             isToolCall = true;
          }

          if (!isToolCall) {
            sentenceBuffer += text;

            // Check if sentenceBuffer has completed sentences/segments (. ! ? \n)
            const delimiters = /[.!?\n]/;
            if (delimiters.test(sentenceBuffer)) {
              let lastDelimiterIdx = -1;
              for (let i = sentenceBuffer.length - 1; i >= 0; i--) {
                if (delimiters.test(sentenceBuffer[i])) {
                  lastDelimiterIdx = i;
                  break;
                }
              }

              if (lastDelimiterIdx !== -1) {
                const completedSegment = sentenceBuffer.substring(0, lastDelimiterIdx + 1);
                sentenceBuffer = sentenceBuffer.substring(lastDelimiterIdx + 1);

                // Run validation on completed segment
                const validation = aiSafetyService.validateOutput(completedSegment);
                if (!validation.isValid) {
                  safetyViolationDetected = true;
                  const safeReplacement = '\n\n[Maaf, kelanjutan respons ini dibatasi oleh sistem keamanan kami demi kenyamanan Anda. Jika Anda memerlukan diagnosis atau saran klinis, mohon berkonsultasi langsung dengan psikolog atau dokter profesional di Direktori Konselor.]';
                  res.write(`data: ${JSON.stringify({ text: safeReplacement })}\n\n`);
                  fullResponseText = fullResponseText.substring(0, fullResponseText.length - completedSegment.length) + safeReplacement;
                  break;
                } else {
                  // Safe segment, stream to browser
                  res.write(`data: ${JSON.stringify({ text: completedSegment })}\n\n`);
                }
              }
            }
          }
        }
      }

      // Flush remaining sentence buffer if not tool call and safe
      if (!isToolCall && !safetyViolationDetected && sentenceBuffer.length > 0) {
        const validation = aiSafetyService.validateOutput(sentenceBuffer);
        if (!validation.isValid) {
          const safeReplacement = '\n\n[Maaf, kelanjutan respons ini dibatasi oleh sistem keamanan kami demi kenyamanan Anda. Jika Anda memerlukan diagnosis atau saran klinis, mohon berkonsultasi langsung dengan psikolog atau dokter profesional di Direktori Konselor.]';
          res.write(`data: ${JSON.stringify({ text: safeReplacement })}\n\n`);
          fullResponseText += safeReplacement;
        } else {
          res.write(`data: ${JSON.stringify({ text: sentenceBuffer })}\n\n`);
        }
      }

      if (isToolCall) {
        try {
          const parsed = JSON.parse(fullResponseText.trim());
          const validation = validateAndSanitizeToolCall(parsed);
          
          if (validation.isValid && validation.toolCall) {
            validToolCallParsed = { tool_call: validation.toolCall, parameters: validation.parameters || {} };
            res.write(`data: ${JSON.stringify({ tool_call: validToolCallParsed.tool_call, parameters: validToolCallParsed.parameters || {} })}\n\n`);
            
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
            res.write(`data: ${JSON.stringify({ text: safeText })}\n\n`);
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
          res.write(`data: ${JSON.stringify({ text: safeText })}\n\n`);
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
           } catch(e) {}
        }
      }

      if (isNewChat && !activeIsTemporary && userId) {
         try {
            const title = (message || 'Percakapan').substring(0, 30) + ((message && message.length > 30) ? '...' : '');
            res.write(`data: ${JSON.stringify({ newTitle: title })}\n\n`);
         } catch(e) {}
      }

      res.write(`data: ${JSON.stringify({ done: true, chatId: currentChatId })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (e: any) {
      console.warn('Gemini stream execution error:', e);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ text: "\n\n*(Koneksi AI dialihkan ke pendampingan lokal)*\nAku tetap di sini mendengarkanmu. Ada hal lain yang ingin kamu luapkan atau ceritakan?" })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  } catch (error: any) {
    if (!res.headersSent) {
      sendError(res, 'INTERNAL_SERVER_ERROR', 'Terjadi kesalahan pada server');
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
