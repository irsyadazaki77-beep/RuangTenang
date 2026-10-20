import { Router, Request, Response } from 'express';

import { serverDb } from '../database.js';
import { requireAuth, normalizeRole } from '../middleware/auth.js';

import { canAccessHealthData } from '../services/healthDataAuth.js';
import { buildAuthoritativeScreening, mapScreeningToResponse } from '../services/screeningSafetyService.js';
import { calculatePhq9Severity, calculateGad7Severity, ScreeningValidationError } from '../../shared/clinical/scoring.js';
import type { ScreeningResultDTO } from '../../shared/contracts/screening.js';
import { validatePagination } from '../apiV1Helpers.js';
import {
  ScreeningSubmissionSchema as createScreeningSchema,
  UpdateScreeningStatusSchema
} from '../../shared/contracts/screening.js';

export { createScreeningSchema, UpdateScreeningStatusSchema };

const router = Router();

// Single scoring engine: re-exported for existing importers; no thresholds live here.
export { calculatePhq9Severity, calculateGad7Severity };
export type ScreeningResponseDTO = ScreeningResultDTO;
export { mapScreeningToResponse };

// Get Screenings
router.get(['/', '/db/screenings'], requireAuth, async (req: Request, res: Response) => {
  try {
    await serverDb.logAudit(
      'READ_SCREENINGS',
      `User ${req.user!.name} (${req.user!.email}) dengan role ${req.user!.role} membaca riwayat skrining.`,
      req.user!.role
    );

    const targetUserId = req.query.userId as string;
    const role = normalizeRole(req.user!.role);

    const hasAccess = await canAccessHealthData(req.user!, targetUserId, 'VIEW_SCREENING');
    if (!hasAccess) {
      if (role === 'konselor' && !targetUserId) {
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
    } else if (role === 'mahasiswa') {
      queryUserId = req.user!.userId;
    }

    const { page, limit, offset } = validatePagination(req, 20);

    const [screenings, total] = await Promise.all([
      serverDb.getScreenings(limit, offset, queryUserId),
      serverDb.countScreenings(queryUserId)
    ]);

    if (role === 'konselor' || role === 'admin') {
      await serverDb.addStaffAccessLog({
        staffUserId: req.user!.userId,
        staffName: req.user!.name,
        staffRole: req.user!.role,
        targetUserId: targetUserId || 'semua_mahasiswa',
        accessType: 'VIEW_SCREENING',
        purpose: role === 'konselor' ? 'Evaluasi Kesehatan Mental' : 'Audit Administratif Platform'
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
    const parsed = UpdateScreeningStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Status tidak valid.', details: parsed.error.issues });
    }
    const { status } = parsed.data;
    
    const role = normalizeRole(req.user!.role);
    if (role !== 'admin' && role !== 'konselor') {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }

    const screening = await serverDb.findScreeningById(id);
    if (!screening) {
      return res.status(404).json({ error: 'Skrining tidak ditemukan.' });
    }

    const targetUserId = screening.userId;
    const hasAccess = await canAccessHealthData(req.user!, targetUserId, 'UPDATE_SCREENING');
    
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

    let authoritative;
    try {
      authoritative = buildAuthoritativeScreening(parsed.data);
    } catch (e) {
      if (e instanceof ScreeningValidationError) {
        return res.status(400).json({ error: 'Validasi gagal.', code: e.code, message: e.message });
      }
      throw e;
    }

    // Owner is always the authenticated user; any client-supplied userId is ignored.
    const record = await serverDb.addScreening({
      phq9Score: authoritative.phq9Score,
      gad7Score: authoritative.gad7Score,
      phq9Severity: authoritative.phq9Severity,
      gad7Severity: authoritative.gad7Severity,
      item9Score: authoritative.item9Score ?? undefined,
      hasSelfHarmRisk: authoritative.hasSelfHarmRisk,
      riskIndicators: authoritative.riskIndicators as any,
      userId: req.user!.userId
    }, parsed.data.clientSubmissionId);
    res.json({ success: true, record: mapScreeningToResponse(record) });
  } catch (err: any) {
    if (err?.message === 'SCREENING_IDEMPOTENCY_CONFLICT') {
      return res.status(409).json({ error: 'Kunci simpan ulang sudah dipakai untuk hasil skrining yang berbeda.' });
    }
    console.error('Error creating screening:', err);
    res.status(500).json({ error: 'Gagal menyimpan riwayat skrining.' });
  }
});

export default router;
