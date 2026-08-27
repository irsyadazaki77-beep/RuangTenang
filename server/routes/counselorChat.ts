import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { optionalAuth } from '../middleware/auth';
import { checkRateLimit, sanitizeInput } from '../security.js';
import { scanAndSanitizePII } from '../services/piiService.js';
import { checkUserAiUsageLimit, recordUserAiUsage } from '../services/aiUsageLimiter.js';
import { getLocalCounselorResponse } from './fallbackAi';
import { consentService } from '../services/consentService.js';
import { aiGateway } from '../services/ai/aiGateway.js';

const router = Router();

export const counselorChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(1000),
  }).strict()),
  counselorName: z.string().max(100).optional(),
  counselorTitle: z.string().max(100).optional(),
  counselorUniversity: z.string().max(100).optional(),
  counselorSpecialties: z.array(z.string().max(50)).optional(),
  studentName: z.string().max(100).optional(),
  concern: z.string().max(500).optional(),
}).strict();

// Counselor Simulation Chat Endpoint
router.post(['/counselor-chat', '/api/counselor-chat'], optionalAuth, async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown-ip';

    const rateCheck = checkRateLimit(clientIp, 20, 60000);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'Batas pesan simulasi terlampaui. Silakan tunggu sebentar.'
      });
    }

    const parsed = counselorChatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validasi gagal.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const {
      messages,
      counselorName,
      counselorTitle,
      counselorUniversity,
      counselorSpecialties,
      studentName,
      concern
    } = parsed.data;

    const specialtiesStr = Array.isArray(counselorSpecialties) ? counselorSpecialties.join(', ') : 'Konseling Umum';

    const runLocalCounselor = () => {
      return getLocalCounselorResponse(
        messages,
        counselorName,
        counselorTitle,
        specialtiesStr,
        studentName,
        concern
      );
    };

    const userId = req.user?.userId;

    // Enforce explicit AI consent check - fail safe by running local counselor simulation
    const hasConsent = userId ? await consentService.canUseAI(userId) : false;
    if (!hasConsent) {
      return res.json({
        reply: runLocalCounselor()
      });
    }

    const usageCheck = await checkUserAiUsageLimit(userId, clientIp, (req.user as any)?.tier, req.user?.role);
    if (!usageCheck.allowed) {
      return res.json({
        reply: `*(Batas pesan AI harian Anda telah tercapai: ${usageCheck.dailyUsage}/${usageCheck.dailyLimit}). Mengalihkan ke mode simulasi lokal konselor:*\n\n` + runLocalCounselor()
      });
    }

    await recordUserAiUsage(userId, clientIp);

    try {
      const result = await aiGateway.counselorSimulationChat({
        userId,
        userTier: (req.user as any)?.tier || 'Free',
        studentName,
        counselorName,
        counselorTitle,
        counselorUniversity,
        counselorSpecialties,
        concern,
        messages
      });

      return res.json({ reply: result.reply });
    } catch (err: any) {
      console.warn('Counselor chat failed via gateway, falling back to local simulation:', err);
      return res.json({
        reply: runLocalCounselor()
      });
    }
  } catch (error: any) {
    console.error('Error in /api/counselor-chat:', error);
    res.status(500).json({
      error: 'Gagal menghubungkan dengan asisten konselor virtual.',
      message: error?.message || 'Terjadi kendala koneksi.'
    });
  }
});

export default router;
