import { Router, Request, Response } from 'express';
import { prisma } from '../database.js';

const router = Router();

// Liveness probe
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness probe
router.get('/readiness', async (req: Request, res: Response) => {
  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Add other dependency checks if needed (Redis, AI Gateway, etc)

    res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: process.env.NODE_ENV === 'production' ? 'Service Unavailable' : error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
