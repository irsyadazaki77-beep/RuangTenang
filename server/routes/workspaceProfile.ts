import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { agentProfileService, AGENT_PROFILE_ABOUT_MAX, AGENT_PROFILE_INSTRUCTIONS_MAX } from '../services/agentProfileService.js';

const router = Router();

const profileSchema = z.object({
  aboutMe: z.string().max(AGENT_PROFILE_ABOUT_MAX).optional(),
  responseInstructions: z.string().max(AGENT_PROFILE_INSTRUCTIONS_MAX).optional(),
  isEnabled: z.boolean().optional()
});

const sendError = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ success: false, code, message, error: { code, message } });

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await agentProfileService.get(req.user!.userId);
    res.json({ success: true, profile });
  } catch {
    sendError(res, 500, 'PROFILE_FETCH_FAILED', 'Gagal memuat profil.');
  }
});

router.put('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'INVALID_INPUT', 'Isi profil tidak valid atau terlalu panjang.');
  try {
    const profile = await agentProfileService.upsert(req.user!.userId, parsed.data);
    res.json({ success: true, profile });
  } catch {
    sendError(res, 500, 'PROFILE_SAVE_FAILED', 'Gagal menyimpan profil.');
  }
});

router.delete('/', requireAuth, async (req: Request, res: Response) => {
  try {
    await agentProfileService.remove(req.user!.userId);
    res.json({ success: true });
  } catch {
    sendError(res, 500, 'PROFILE_DELETE_FAILED', 'Gagal menghapus profil.');
  }
});

export default router;
