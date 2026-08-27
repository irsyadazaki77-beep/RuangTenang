import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { serverDb } from '../database.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { sanitizeInput } from '../security.js';
import { getUserDailyLimit } from '../services/aiUsageLimiter.js';

const router = Router();

export const usabilityFeedbackSchema = z.object({
  scenarioName: z.string().min(2).max(100),
  susScores: z.array(z.number().int().min(1).max(5)).length(10),
  overallSusScore: z.number().min(0).max(100),
  comments: z.string().max(500).optional(),
}).strict();

export const programProgressSchema = z.object({
  programId: z.string().min(1).max(100),
  completedStepIds: z.array(z.string().min(1).max(100)),
}).strict();

// Usability Feedbacks
router.get(['/usability', '/api/usability'], requireAuth, requireRole(['admin', 'konselor']), async (req: Request, res: Response) => {
  try {
    await serverDb.logAudit(
      'READ_USABILITY',
      `User ${req.user!.name} (${req.user!.email}) membaca data pengujian usabilitas.`,
      req.user!.role
    );

    const feedbacks = await serverDb.getUsabilityFeedbacks();

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const total = feedbacks.length;
    const paginated = feedbacks.slice(startIndex, endIndex);

    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', page);
    res.setHeader('X-Limit', limit);
    res.setHeader('X-Total-Pages', Math.ceil(total / limit));

    if (req.query.format === 'object') {
      return res.json({
        data: paginated,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    }
    res.json(paginated);
  } catch (err: any) {
    console.error('Error fetching usability feedbacks:', err);
    res.status(500).json({ error: 'Gagal mengambil data pengujian usabilitas.' });
  }
});

router.post(['/usability', '/api/usability'], requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = usabilityFeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validasi gagal.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const validated = parsed.data;
    const record = await serverDb.addUsabilityFeedback({
      role: req.user!.role === 'mahasiswa' ? 'mahasiswa' : 'konselor',
      scenarioName: validated.scenarioName,
      susScores: validated.susScores,
      overallSusScore: validated.overallSusScore,
      comments: sanitizeInput(validated.comments || '', 500)
    });
    res.json({ success: true, record });
  } catch (err: any) {
    console.error('Error adding usability feedback:', err);
    res.status(500).json({ error: 'Gagal menyimpan umpan balik usabilitas.' });
  }
});

// Program Progress
router.get(['/program-progress/:userId', '/api/program-progress/:userId'], requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.role === 'mahasiswa' && req.params.userId !== req.user!.userId) {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }
    const progress = await serverDb.getProgramProgress(req.params.userId);
    res.json(progress);
  } catch (err: any) {
    console.error('Error fetching program progress:', err);
    res.status(500).json({ error: 'Gagal mengambil progres program.' });
  }
});

router.post(['/program-progress', '/api/program-progress'], requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = programProgressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validasi gagal.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const validated = parsed.data;
    const record = await serverDb.saveProgramProgress(
      req.user!.userId,
      validated.programId,
      validated.completedStepIds
    );
    res.json({ success: true, record });
  } catch (err: any) {
    console.error('Error saving program progress:', err);
    res.status(500).json({ error: 'Gagal menyimpan progres program.' });
  }
});

// Usage Statistics
router.get(['/user/usage-stats', '/api/user/usage-stats'], optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || 'guest';
    const userRole = req.user?.role || 'guest';
    const user = userId !== 'guest' ? await serverDb.getUserById(userId) : null;
    
    // Explicitly derive tier from DB (or Free if guest) - do not trust req.query
    const userTier = user ? user.tier : 'Free';
    const isDeveloper = userRole === 'admin' || userTier === 'Developer';
    const isPro = userRole === 'konselor' || userTier === 'Pro';
    
    const dailyLimit = getUserDailyLimit(userTier, userRole);
    const weeklyLimit = dailyLimit >= 999999 ? 999999 : dailyLimit * 7;
    
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const today = new Date().toISOString().split('T')[0];
    const ipUsage = await serverDb.getDailyUsage(`ip_${clientIp}`, today);
    const userUsage = userId !== 'guest' ? await serverDb.getDailyUsage(`user_${userId}`, today) : ipUsage;
    const dailyUsage = Math.max(ipUsage, userUsage);
    
    const weeklyHistory = userId !== 'guest' ? await serverDb.getWeeklyUsage(`user_${userId}`) : [];
    const weeklyUsage = weeklyHistory.reduce((sum, h) => sum + h.count, 0);
    
    return res.json({
      dailyLimit,
      dailyUsage,
      weeklyLimit,
      weeklyUsage,
      weeklyHistory,
      userTier,
      isPro,
      isDeveloper
    });
  } catch (err: any) {
    console.error('Error fetching usage stats:', err);
    return res.status(500).json({ error: 'Gagal mengambil statistik penggunaan.' });
  }
});

export default router;
