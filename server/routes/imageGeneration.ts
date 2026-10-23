import { Router, Request, Response } from 'express';
import { imageGenerationService } from '../services/imageGenerationService.js';
import { sanitizeInput } from '../security.js';
import { optionalAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const imageGenerationRouter = Router();

// POST /api/ai/generate-image atau /api/v1/ai/generate-image
imageGenerationRouter.post('/generate-image', optionalAuth, async (req: Request, res: Response) => {
  try {
    const rawPrompt = req.body?.prompt;
    if (!rawPrompt || typeof rawPrompt !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Parameter prompt (string) wajib diisi',
      });
      return;
    }

    const sanitizedPrompt = sanitizeInput(rawPrompt).slice(0, 500); // batasi panjang prompt
    const width = typeof req.body?.width === 'number' ? Math.min(Math.max(req.body.width, 256), 1024) : 1024;
    const height = typeof req.body?.height === 'number' ? Math.min(Math.max(req.body.height, 256), 1024) : 1024;

    logger.info(`[ImageGen] Request diterima: "${sanitizedPrompt.substring(0, 50)}..."`);

    const result = await imageGenerationService.generateImage({
      prompt: sanitizedPrompt,
      width,
      height,
    });

    res.status(200).json({
      success: true,
      imageUrl: result.imageUrl,
      provider: result.provider,
      prompt: sanitizedPrompt,
    });
  } catch (error: any) {
    logger.error(`[ImageGen] Error saat generate gambar: ${error?.message || error}`);
    res.status(500).json({
      success: false,
      error: error?.message || 'Gagal memproses pembuatan gambar',
    });
  }
});
