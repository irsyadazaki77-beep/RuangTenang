import { Router, Request, Response } from 'express';
import { prisma } from '../database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/health/system-stats
 * GET /api/v1/health/system-stats
 * Returns aggregate clinical and operational counts to authenticated admins only.
 */
router.get(['/system-stats', '/stats'], requireAuth, requireRole(['admin']), async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const [userCount, screeningCount, apptCount, soapCount, moodCount] = await Promise.all([
      prisma.users.count(),
      prisma.screenings.count(),
      prisma.appointments.count(),
      prisma.clinicalSoapNotes.count(),
      prisma.moodLogs.count()
    ]);

    const [rendahCount, sedangCount, tinggiCount, krisisCount] = await Promise.all([
      prisma.screenings.count({
        where: {
          hasSelfHarmRisk: false,
          phq9Score: { lt: 10 }
        }
      }),
      prisma.screenings.count({
        where: {
          hasSelfHarmRisk: false,
          phq9Score: { gte: 10, lt: 15 }
        }
      }),
      prisma.screenings.count({
        where: {
          hasSelfHarmRisk: false,
          phq9Score: { gte: 15, lt: 20 }
        }
      }),
      prisma.screenings.count({
        where: {
          OR: [
            { hasSelfHarmRisk: true },
            { phq9Score: { gte: 20 } }
          ]
        }
      })
    ]);

    const triageDistribution = {
      rendah: rendahCount,
      sedang: sedangCount,
      tinggi: tinggiCount,
      krisis: krisisCount
    };

    const uptimeSeconds = Math.floor(process.uptime());
    const memUsage = process.memoryUsage();

    res.json({
      success: true,
      status: 'OPERATIONAL',
      timestamp: new Date().toISOString(),
      telemetry: {
        totalRegisteredUsers: userCount,
        totalScreeningsCompleted: screeningCount,
        totalConsultationSessions: apptCount,
        totalSoapClinicalNotes: soapCount,
        totalMoodTrackings: moodCount,
        triageDistribution
      },
      system: {
        uptimeSeconds,
        uptimeHuman: `${Math.floor(uptimeSeconds / 3600)}j ${Math.floor((uptimeSeconds % 3600) / 60)}m`,
        memoryRssMb: Math.round(memUsage.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memUsage.heapUsed / (1024 * 1024)),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      }
    });
  } catch (err: any) {
    console.error('Error computing system stats telemetry:', err);
    res.status(500).json({
      success: false,
      status: 'DEGRADED',
      error: 'Gagal mengambil metrik telemetri sistem.',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
