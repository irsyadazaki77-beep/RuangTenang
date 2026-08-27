import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { serverDb } from '../database.js';
import { requireAuth } from '../middleware/auth.js';
import { consentService } from '../services/consentService.js';
import { canAccessHealthData } from '../services/healthDataAuth.js';
import { validatePagination } from '../apiV1Helpers.js';

const router = Router();

export const createScreeningSchema = z.object({
  phq9Score: z.number().int().min(0).max(27),
  gad7Score: z.number().int().min(0).max(21),
  phq9Severity: z.string().optional(),
  gad7Severity: z.string().optional(),
  item9Score: z.number().int().min(0).max(3).optional(),
  hasSelfHarmRisk: z.boolean().optional(),
  riskIndicators: z.object({
    item9Score: z.number().int().min(0).max(3),
    hasSelfHarmRisk: z.boolean(),
    immediateDanger: z.boolean().optional(),
    planOrIntent: z.boolean().optional(),
    contactedTrustedPerson: z.boolean().optional(),
    riskCategory: z.string().optional(),
    flaggedAt: z.string().optional(),
  }).optional(),
  userId: z.string().optional(),
}).strict();

export interface ScreeningResponseDTO {
  id: string;
  phq9Score: number;
  gad7Score: number;
  phq9Severity: string;
  gad7Severity: string;
  item9Score?: number;
  hasSelfHarmRisk?: boolean;
  riskLevel?: string;
  status?: string;
  riskIndicators?: any;
  timestamp: string;
  userId: string;
}

export function calculatePhq9Severity(score: number): 'Minimal' | 'Ringan' | 'Sedang' | 'Berat' {
  if (score <= 4) return 'Minimal';
  if (score <= 9) return 'Ringan';
  if (score <= 14) return 'Sedang';
  return 'Berat';
}

export function calculateGad7Severity(score: number): 'Minimal' | 'Ringan' | 'Sedang' | 'Berat' {
  if (score <= 4) return 'Minimal';
  if (score <= 9) return 'Ringan';
  if (score <= 14) return 'Sedang';
  return 'Berat';
}

export function mapScreeningToResponse(scr: any): ScreeningResponseDTO {
  return {
    id: scr.id,
    phq9Score: scr.phq9Score,
    gad7Score: scr.gad7Score,
    phq9Severity: scr.phq9Severity,
    gad7Severity: scr.gad7Severity,
    item9Score: scr.item9Score ?? 0,
    hasSelfHarmRisk: scr.hasSelfHarmRisk ?? (scr.item9Score ? scr.item9Score > 0 : false),
    riskLevel: scr.riskLevel || 'Rendah',
    status: scr.status || 'Menunggu Penanganan',
    riskIndicators: scr.riskIndicators || null,
    timestamp: scr.timestamp,
    userId: scr.userId || ''
  };
}

// Get Screenings
router.get(['/', '/db/screenings'], requireAuth, async (req: Request, res: Response) => {
  try {
    await serverDb.logAudit(
      'READ_SCREENINGS',
      `User ${req.user!.name} (${req.user!.email}) dengan role ${req.user!.role} membaca riwayat skrining.`,
      req.user!.role
    );

    const targetUserId = req.query.userId as string;

    const hasAccess = await canAccessHealthData(req.user!, targetUserId, 'VIEW_SCREENING');
    if (!hasAccess) {
      if (req.user!.role === 'konselor' && !targetUserId) {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: 'Konselor tidak diizinkan mengambil seluruh data skrining.'
        });
      }
      return res.status(403).json({
        error: 'CONSENT_DENIED',
        message: 'Akses ditolak atau mahasiswa tidak memberikan izin persetujuan.'
      });
    }

    let queryUserId: string | undefined = undefined;
    if (targetUserId) {
      queryUserId = targetUserId;
    } else if (req.user!.role === 'mahasiswa') {
      queryUserId = req.user!.userId;
    }

    const { page, limit, offset } = validatePagination(req, 20);

    const [screenings, total] = await Promise.all([
      serverDb.getScreenings(limit, offset, queryUserId),
      serverDb.countScreenings(queryUserId)
    ]);

    if (req.user!.role === 'konselor' || req.user!.role === 'admin') {
      await serverDb.addStaffAccessLog({
        staffUserId: req.user!.userId,
        staffName: req.user!.name,
        staffRole: req.user!.role,
        targetUserId: targetUserId || 'semua_mahasiswa',
        accessType: 'VIEW_SCREENING',
        purpose: req.user!.role === 'konselor' ? 'Evaluasi Kesehatan Mental' : 'Audit Administratif Platform'
      });
    }

    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Page', page);
    res.setHeader('X-Limit', limit);
    res.setHeader('X-Total-Pages', Math.ceil(total / Math.max(limit, 1)));

    const responseData = screenings.map(mapScreeningToResponse);

    if (req.query.format === 'object') {
      return res.json({
        data: responseData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / Math.max(limit, 1))
      });
    }
    res.json(responseData);
  } catch (err: any) {
    console.error('Error fetching screenings:', err);
    res.status(500).json({ error: 'Gagal mengambil riwayat skrining.' });
  }
});

// Update Screening Status
router.put(['/:id', '/db/screenings/:id'], requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !['Menunggu Penanganan', 'Sedang Ditangani', 'Selesai'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid.' });
    }
    
    if (req.user!.role !== 'admin' && req.user!.role !== 'konselor') {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }

    const screening = await serverDb.findScreeningById(id);
    if (!screening) {
      return res.status(404).json({ error: 'Skrining tidak ditemukan.' });
    }

    const targetUserId = screening.userId;
    const hasAccess = await canAccessHealthData(req.user!, targetUserId, 'VIEW_SCREENING');
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Akses ditolak. Tidak ada izin.' });
    }

    await serverDb.updateScreeningStatus(id, status);
    await serverDb.logAudit('UPDATE_SCREENING_STATUS', `Status krisis ID ${id} diubah menjadi ${status} oleh ${req.user!.name}.`, req.user!.role);
    
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error updating screening status:', err);
    res.status(500).json({ error: 'Gagal memperbarui status.' });
  }
});

// Create Screening
router.post(['/', '/db/screenings'], requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createScreeningSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validasi gagal.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const validated = parsed.data;
    const phq9Severity = calculatePhq9Severity(validated.phq9Score);
    const gad7Severity = calculateGad7Severity(validated.gad7Score);
    const item9Score = validated.item9Score ?? 0;
    const hasSelfHarmRisk = validated.hasSelfHarmRisk ?? (item9Score > 0);

    const record = await serverDb.addScreening({
      phq9Score: validated.phq9Score,
      gad7Score: validated.gad7Score,
      phq9Severity,
      gad7Severity,
      item9Score,
      hasSelfHarmRisk,
      riskIndicators: validated.riskIndicators || {
        item9Score,
        hasSelfHarmRisk,
        riskCategory: hasSelfHarmRisk ? 'RISIKO_MENYAKITI_DIRI' : 'STANDAR',
        flaggedAt: new Date().toISOString()
      },
      userId: req.user!.userId
    });
    res.json({ success: true, record: mapScreeningToResponse(record) });
  } catch (err: any) {
    console.error('Error creating screening:', err);
    res.status(500).json({ error: 'Gagal menyimpan riwayat skrining.' });
  }
});

export default router;
