import { Router, Request, Response } from 'express';
import { quizService, GenerateQuizPayload } from '../services/quizService.js';
import { sanitizeInput } from '../security.js';
import { optionalAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const quizRouter = Router();

quizRouter.post('/generate-quiz', optionalAuth, async (req: Request, res: Response) => {
  try {
    const rawContext = typeof req.body?.contextText === 'string' ? req.body.contextText : '';
    const rawTopic = typeof req.body?.topic === 'string' ? req.body.topic : '';
    const difficulty = req.body?.difficulty;
    const totalQuestions = Number(req.body?.totalQuestions) || 5;
    const sourceDocumentNames = Array.isArray(req.body?.sourceDocumentNames)
      ? req.body.sourceDocumentNames.map((n: unknown) => String(n).slice(0, 100))
      : [];
    const modelId = typeof req.body?.modelId === 'string' ? req.body.modelId : undefined;

    const sanitizedContext = sanitizeInput(rawContext);
    const sanitizedTopic = sanitizeInput(rawTopic);

    if (!sanitizedContext.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Konten dokumen materi (contextText) wajib disertakan untuk menghasilkan soal ujian'
      });
    }

    const payload: GenerateQuizPayload = {
      contextText: sanitizedContext,
      topic: sanitizedTopic || 'Materi Dokumen',
      difficulty: ['mudah', 'sedang', 'sulit'].includes(difficulty) ? difficulty : 'sedang',
      totalQuestions,
      sourceDocumentNames,
      modelId,
      userId: req.user?.userId,
      userTier: req.user?.tier || 'Free'
    };

    const quiz = await quizService.generateQuiz(payload);

    return res.json({
      success: true,
      data: quiz
    });
  } catch (error: any) {
    logger.error('Error generating quiz:', { error: error?.message });
    return res.status(500).json({
      success: false,
      message: error?.message || 'Terjadi kesalahan saat membuat kuis simulasi ujian'
    });
  }
});
