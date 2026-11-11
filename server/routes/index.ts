import { Router } from 'express';
import { csrfRouter } from '../middleware/csrf.js';
import { clientTelemetryLimiter } from '../middleware/rateLimiters.js';

import authRouter from './auth.js';
import appointmentsRouter from './appointments.js';
import screeningRouter from './screening.js';
import privacyRouter from './privacy.js';
import adminRouter from './admin.js';
import emergencyRouter from './emergency.js';
import usabilityRouter from './usability.js';
import counselorChatRouter from './counselorChat.js';
import chatRouter from './chat.js';
import workspaceComparisonRouter from './workspaceComparison.js';
import attachmentsRouter from './attachments.js';
import userDataRouter from './userData.js';
import counselorsRouter from './counselors.js';
import counselorPortalRouter from './counselorPortal.js';
import systemStatsRouter from './systemStats.js';
import workspaceArtifactsRouter from './workspaceArtifacts.js';
import workspaceProfileRouter from './workspaceProfile.js';
import workspaceRouter from './workspace.js';
import campusesRouter from './campuses.js';
import { imageGenerationRouter } from './imageGeneration.js';
import { quizRouter } from './quizGeneration.js';
import { defenseRouter } from './defense.js';
import performanceTelemetryRouter from './performanceTelemetry.js';
import coderRouter from './coder.js';

/**
 * Creates and registers all modular API routes on an Express router.
 * Can be mounted at both '/api/v1' and '/api' for seamless backward compatibility.
 */
export function createApiRouter(): Router {
  const router = Router();

  // CSRF token provider
  router.use(csrfRouter);

  // Core Authentication & Accounts
  router.use('/auth', authRouter);
  router.use('/appointments', appointmentsRouter);
  router.use('/screenings', screeningRouter);
  router.use('/privacy', privacyRouter);
  router.use('/telemetry/performance', clientTelemetryLimiter, performanceTelemetryRouter);

  // Multi-campus & Administration
  router.use(campusesRouter);
  router.use(adminRouter);
  router.use(emergencyRouter);
  router.use(usabilityRouter);

  // Counseling & Chat
  router.use(counselorChatRouter);
  router.use(chatRouter);

  // AI Generation, Quiz & Defense Simulation
  router.use('/ai', imageGenerationRouter);
  router.use('/ai', quizRouter);
  router.use('/ai', defenseRouter);
  router.use(workspaceComparisonRouter);

  // Attachments & User Data
  router.use(attachmentsRouter);
  router.use(userDataRouter);
  router.use(counselorsRouter);
  router.use('/counselor-portal', counselorPortalRouter);

  // System Stats
  router.use('/health', systemStatsRouter);

  // Academic Workspace & Coder IDE
  router.use('/workspace/artifacts', workspaceArtifactsRouter);
  router.use('/workspace/profile', workspaceProfileRouter);
  router.use('/workspace', workspaceRouter);
  router.use(coderRouter);

  return router;
}

export default createApiRouter;
