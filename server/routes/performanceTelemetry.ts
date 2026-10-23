import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { consentService } from '../services/consentService.js';
import { metricsService } from '../services/metricsService.js';

const router = Router();

export const performanceSampleSchema = z.object({
  name: z.enum(['LCP', 'INP', 'CLS', 'AI_TTFT', 'AI_TOTAL']),
  value: z.number().finite().nonnegative().max(300_000),
  route: z.enum(['chat', 'workspace', 'mood', 'screening', 'counselors', 'other']),
  device: z.enum(['mobile', 'desktop']),
  navigationType: z.enum(['navigate', 'reload', 'back-forward', 'back-forward-cache', 'soft-navigation', 'other'])
}).strict().superRefine((sample, context) => {
  if (sample.name === 'CLS' && sample.value > 1) {
    context.addIssue({ code: 'custom', path: ['value'], message: 'CLS di luar rentang yang didukung.' });
  }
});

export const performanceTelemetrySchema = z.object({
  samples: z.array(performanceSampleSchema).min(1).max(20)
}).strict();

router.post('/', requireAuth, async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const parsed = performanceTelemetrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, code: 'INVALID_PERFORMANCE_TELEMETRY' });
  }

  try {
    if (!(await consentService.canUseTelemetry(req.user!.userId))) return res.status(204).end();
    for (const sample of parsed.data.samples) metricsService.recordClientPerformanceSample(sample);
    return res.status(202).json({ success: true, accepted: parsed.data.samples.length, requestId: req.requestId });
  } catch {
    return res.status(503).json({ success: false, code: 'PERFORMANCE_TELEMETRY_UNAVAILABLE' });
  }
});

export default router;
