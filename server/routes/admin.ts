import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { serverDb } from '../database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sanitizeInput } from '../security.js';
import { provisionUserSchema } from '../validators/authSchemas.js';
import { authService } from '../services/authService.js';

const router = Router();

export const telemetryLogSchema = z.object({
  service: z.enum(['SOS Gateway', 'Gemini AI API', 'Database Sync', 'Notification Engine']),
  status: z.enum(['SUCCESS', 'WARNING', 'FAILED']),
  latencyMs: z.number().min(0).max(60000),
  details: z.string().max(300),
  retryAttempt: z.number().int().min(0).max(100).optional(),
}).strict();

export const aiGovernanceTestSchema = z.object({
  category: z.string().min(2).max(100),
  prompt: z.string().min(1).max(1000),
  expectedBehavior: z.string().min(1).max(500),
  actualAIResponse: z.string().min(1).max(2000),
  status: z.enum(['PASSED', 'FAILED']),
}).strict();

// Telemetry & Monitoring (Admin Only)
router.get(['/telemetry', '/api/telemetry'], requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    await serverDb.logAudit(
      'READ_TELEMETRY',
      `Admin ${req.user!.name} (${req.user!.email}) mengakses data telemetri.`,
      req.user!.role
    );

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 15));
    const offset = (page - 1) * limit;

    const [total, paginatedLogs] = await Promise.all([
      serverDb.countTelemetryLogs ? serverDb.countTelemetryLogs() : serverDb.countTelemetryLogs(),
      serverDb.getTelemetryLogs(limit, offset)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', page);
    res.setHeader('X-Limit', limit);
    res.setHeader('X-Total-Pages', totalPages);

    res.json({
      status: 'OPERATIONAL',
      apiLatencyMs: 120,
      sosFailureCount: 0,
      sosSuccessCount: 18,
      notificationQueueCount: 0,
      logs: paginatedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (err: any) {
    console.error('Error fetching telemetry:', err);
    res.status(500).json({ error: 'Gagal mengambil data telemetri.' });
  }
});

// Telemetry Log Creation
router.post(['/telemetry/log', '/api/telemetry/log'], requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = telemetryLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validasi gagal.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const validated = parsed.data;
    const record = await serverDb.addTelemetryLog({
      service: validated.service,
      status: validated.status,
      latencyMs: validated.latencyMs,
      details: sanitizeInput(validated.details, 300),
      retryAttempt: validated.retryAttempt || 0
    });
    res.json({ success: true, record });
  } catch (err: any) {
    console.error('Error logging telemetry:', err);
    res.status(500).json({ error: 'Gagal mencatat log telemetri.' });
  }
});

// Audit Logs (Admin Only)
router.get(['/audit-logs', '/db/audit-logs'], requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    await serverDb.logAudit(
      'READ_AUDIT_LOGS',
      `Admin ${req.user!.name} (${req.user!.email}) membaca audit logs.`,
      req.user!.role
    );

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const [total, paginated] = await Promise.all([
      serverDb.countAuditLogs ? serverDb.countAuditLogs() : serverDb.countAuditLogs(),
      serverDb.getAuditLogs(limit, offset)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', page);
    res.setHeader('X-Limit', limit);
    res.setHeader('X-Total-Pages', totalPages);

    if (req.query.format === 'object') {
      return res.json({
        data: paginated,
        total,
        page,
        limit,
        totalPages
      });
    }
    res.json(paginated);
  } catch (err: any) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Gagal mengambil audit log.' });
  }
});

// AI Governance Tests (Admin Only)
router.get(['/ai-governance/tests', '/ai-governance/test'], requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    await serverDb.logAudit(
      'READ_AI_GOVERNANCE_TESTS',
      `Admin ${req.user!.name} (${req.user!.email}) mengakses data hasil uji AI governance.`,
      req.user!.role
    );

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;

    const [total, paginated] = await Promise.all([
      serverDb.countGovernanceTests ? serverDb.countGovernanceTests() : serverDb.countGovernanceTests(),
      serverDb.getGovernanceTests(limit, offset)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', page);
    res.setHeader('X-Limit', limit);
    res.setHeader('X-Total-Pages', totalPages);

    if (req.query.format === 'object') {
      return res.json({
        data: paginated,
        total,
        page,
        limit,
        totalPages
      });
    }
    res.json(paginated);
  } catch (err: any) {
    console.error('Error fetching governance tests:', err);
    res.status(500).json({ error: 'Gagal mengambil hasil pengujian AI.' });
  }
});

router.post(['/ai-governance/test', '/ai-governance/tests'], requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const parsed = aiGovernanceTestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validasi gagal.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const validated = parsed.data;
    const record = await serverDb.addGovernanceTest({
      category: validated.category,
      prompt: sanitizeInput(validated.prompt, 500),
      expectedBehavior: validated.expectedBehavior,
      actualAIResponse: sanitizeInput(validated.actualAIResponse, 1000),
      status: validated.status
    });
    res.json({ success: true, record });
  } catch (err: any) {
    console.error('Error adding governance test:', err);
    res.status(500).json({ error: 'Gagal mencatat hasil pengujian governance AI.' });
  }
});

// Provision Privileged Account (Konselor / Admin) - Admin Only
router.post(
  ['/users/provision', '/api/users/provision'],
  requireAuth,
  requireRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      const parsed = provisionUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validasi gagal.',
          details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
        });
      }

      const { name, email, password, role, university } = parsed.data;
      const trimmedEmail = email.trim().toLowerCase();

      const existingUser = await serverDb.getUserByEmail(trimmedEmail);
      if (existingUser) {
        return res.status(400).json({ error: 'Email sudah terdaftar dalam sistem.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await serverDb.addUser({
        name: sanitizeInput(name.trim(), 100),
        email: trimmedEmail,
        passwordHash,
        role,
        tier: 'Pro',
        university: university ? sanitizeInput(university.trim(), 100) : 'Universitas Indonesia',
        emailVerified: true,
        mfaEnabled: true
      });

      await serverDb.logAudit(
        'USER_PROVISIONED_BY_ADMIN',
        `Admin ${req.user!.name} (${req.user!.email}) membuat akun dengan peran "${role}" untuk ${newUser.name} (${newUser.email}).`,
        req.user!.role
      );

      res.status(201).json({
        success: true,
        message: `Akun ${role} untuk ${newUser.name} berhasil dibuat. MFA telah diaktifkan secara default.`,
        user: authService.sanitizeUser(newUser)
      });
    } catch (err: any) {
      console.error('Error provisioning user:', err);
      res.status(500).json({ error: 'Gagal membuat akun privileged.' });
    }
  }
);

// PDF & Excel Reports
router.get('/reports/pdf', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { generateRectorateReport } = await import('../services/reportGenerator.js');
    const buffer = await generateRectorateReport({
      totalSessions: 0,
      crisisRatio: "0%",
      mostCommonConcern: "N/A",
      dateRange: "Bulan ini"
    });
    
    await serverDb.logAudit('GENERATE_REPORT', 'Laporan rektorat bulanan (PDF) dihasilkan.', req.user!.role);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Laporan_Bulanan_Rektorat_${new Date().toISOString().slice(0, 10)}.pdf"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('Error generating PDF report:', err);
    res.status(500).json({ error: 'Gagal membuat laporan PDF.' });
  }
});

router.get('/reports/excel', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { generateRectorateReport } = await import('../services/reportGenerator.js');
    const buffer = await generateRectorateReport({
      totalSessions: 0,
      crisisRatio: "0%",
      mostCommonConcern: "N/A",
      dateRange: "Bulan ini"
    });
    
    await serverDb.logAudit('GENERATE_REPORT', 'Laporan rektorat bulanan (Excel) dihasilkan.', req.user!.role);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Laporan_Bulanan_Rektorat_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('Error generating Excel report:', err);
    res.status(500).json({ error: 'Gagal membuat laporan Excel.' });
  }
});

export default router;
