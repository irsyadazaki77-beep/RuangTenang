import { Router, Request, Response } from 'express';
import { defenseService, GenerateDefenseQuestionsPayload, EvaluateDefenseAnswerPayload, DefenseExamType } from '../services/defenseService.js';
import { sanitizeInput } from '../security.js';
import { optionalAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const defenseRouter = Router();

/**
 * POST /api/ai/defense/generate-questions
 * Generates dynamic thesis defense questions tailored to thesis title & context.
 */
defenseRouter.post('/defense/generate-questions', optionalAuth, async (req: Request, res: Response) => {
  try {
    const rawTitle = typeof req.body?.thesisTitle === 'string' ? req.body.thesisTitle : '';
    const rawContext = typeof req.body?.contextText === 'string' ? req.body.contextText : '';
    const rawExamType = typeof req.body?.examType === 'string' ? req.body.examType : 'SIDANG_SKRIPSI';
    const rawRigor = typeof req.body?.rigorLevel === 'string' ? req.body.rigorLevel : 'standar';
    const modelId = typeof req.body?.modelId === 'string' ? req.body.modelId : undefined;

    const sanitizedTitle = sanitizeInput(rawTitle).trim();
    const sanitizedContext = sanitizeInput(rawContext);

    if (!sanitizedTitle) {
      return res.status(400).json({
        success: false,
        message: 'Judul skripsi (thesisTitle) wajib diisi untuk menghasilkan pertanyaan sidang'
      });
    }

    const validExamTypes: DefenseExamType[] = ['SEMINAR_PROPOSAL', 'SEMINAR_HASIL', 'SIDANG_SKRIPSI'];
    const examType: DefenseExamType = validExamTypes.includes(rawExamType as DefenseExamType)
      ? (rawExamType as DefenseExamType)
      : 'SIDANG_SKRIPSI';

    const rigorLevel = rawRigor === 'killer' ? 'killer' : 'standar';

    const payload: GenerateDefenseQuestionsPayload = {
      thesisTitle: sanitizedTitle,
      examType,
      contextText: sanitizedContext,
      rigorLevel,
      modelId,
      userId: req.user?.userId,
      userTier: req.user?.tier || 'Free'
    };

    const questions = await defenseService.generateQuestions(payload);

    return res.json({
      success: true,
      data: questions
    });
  } catch (error: any) {
    logger.error('Error generating defense questions:', { error: error?.message });
    return res.status(500).json({
      success: false,
      message: error?.message || 'Gagal menghasilkan pertanyaan simulasi sidang skripsi'
    });
  }
});

/**
 * POST /api/ai/defense/evaluate
 * Evaluates student's defense argument against examiner's question.
 */
defenseRouter.post('/defense/evaluate', optionalAuth, async (req: Request, res: Response) => {
  try {
    const rawAnswer = typeof req.body?.studentAnswer === 'string' ? req.body.studentAnswer : '';
    const rawTitle = typeof req.body?.thesisTitle === 'string' ? req.body.thesisTitle : 'Penelitian Skripsi';
    const rawExamType = typeof req.body?.examType === 'string' ? req.body.examType : 'SIDANG_SKRIPSI';
    const rawRigor = typeof req.body?.rigorLevel === 'string' ? req.body.rigorLevel : 'standar';
    const question = req.body?.question;
    const examiner = req.body?.examiner;
    const modelId = typeof req.body?.modelId === 'string' ? req.body.modelId : undefined;

    const sanitizedAnswer = sanitizeInput(rawAnswer).trim();
    const sanitizedTitle = sanitizeInput(rawTitle).trim();

    if (!sanitizedAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Jawaban mahasiswa (studentAnswer) tidak boleh kosong'
      });
    }

    if (!question || typeof question.question !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Objek pertanyaan penguji (question) wajib disertakan'
      });
    }

    if (!examiner || typeof examiner.name !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Profil dewan penguji (examiner) wajib disertakan'
      });
    }

    const payload: EvaluateDefenseAnswerPayload = {
      question: {
        id: String(question.id || 'q-1'),
        chapterTag: String(question.chapterTag || 'Bab Metodologi'),
        question: sanitizeInput(String(question.question)),
        expectedKeyPoints: Array.isArray(question.expectedKeyPoints)
          ? question.expectedKeyPoints.map((k: unknown) => sanitizeInput(String(k)))
          : undefined
      },
      studentAnswer: sanitizedAnswer,
      examiner: {
        id: String(examiner.id || 'examiner-1'),
        name: sanitizeInput(String(examiner.name)),
        title: sanitizeInput(String(examiner.title || '')),
        role: sanitizeInput(String(examiner.role || 'Penguji')),
        focusArea: sanitizeInput(String(examiner.focusArea || 'Metodologi Riset'))
      },
      thesisTitle: sanitizedTitle,
      examType: (['SEMINAR_PROPOSAL', 'SEMINAR_HASIL', 'SIDANG_SKRIPSI'].includes(rawExamType)
        ? rawExamType
        : 'SIDANG_SKRIPSI') as DefenseExamType,
      rigorLevel: rawRigor === 'killer' ? 'killer' : 'standar',
      modelId,
      userId: req.user?.userId,
      userTier: req.user?.tier || 'Free'
    };

    const evaluation = await defenseService.evaluateAnswer(payload);

    return res.json({
      success: true,
      data: evaluation
    });
  } catch (error: any) {
    logger.error('Error evaluating defense answer:', { error: error?.message });
    return res.status(500).json({
      success: false,
      message: error?.message || 'Gagal mengevaluasi jawaban simulasi sidang skripsi'
    });
  }
});
