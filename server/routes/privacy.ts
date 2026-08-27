import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { authService } from '../services/authService.js';
import { consentService } from '../services/consentService.js';
import { retentionService } from '../services/retentionService.js';
import { serverDb } from '../database.js';

import { exportLimiter } from '../middleware/rateLimiters.js';
import bcrypt from 'bcryptjs';

const router = Router();

export const saveConsentSchema = z.object({
  consentForAI: z.boolean().optional(),
  consentForAIMood: z.boolean().optional(),
  consentForAIScreening: z.boolean().optional(),
  consentForAIMemory: z.boolean().optional(),
  consentForAIJournal: z.boolean().optional(),
  consentForEmergencySOS: z.boolean().optional(),
  consentForCounselorSummary: z.boolean().optional(),
  consentForCounselorSharing: z.boolean().optional(),
  consentForTelemetry: z.boolean().optional(),
  consentForAnalytics: z.boolean().optional(),
  retentionDays: z.number().int().min(0).max(3650).optional(),
}).strict();

export const correctDataSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  university: z.string().min(2).max(150).optional(),
  email: z.string().email().optional(),
}).strict();

export const retentionPolicySchema = z.object({
  retentionDays: z.number().int().min(0).max(3650),
}).strict();

// Get User Consent (Strict Opt-In Source of Truth)
router.get(['/consent', '/db/consent'], requireAuth, async (req: Request, res: Response) => {
  try {
    const consent = await consentService.getUserConsents(req.user!.userId);
    res.json({ success: true, consent });
  } catch (err: any) {
    console.error('Error getting consent:', err);
    res.status(500).json({ error: 'Gagal mengambil status consent.' });
  }
});

// Save User Consent (Granular Opt-In)
router.post(['/consent', '/db/consent'], requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = saveConsentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validasi gagal.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const updated = await consentService.updateConsents(req.user!.userId, parsed.data);
    res.json({ success: true, record: updated, consent: updated });
  } catch (err: any) {
    console.error('Error saving consent:', err);
    res.status(500).json({ error: 'Gagal menyimpan preferensi consent.' });
  }
});

// Revoke All Consents
router.post('/consent/revoke', requireAuth, async (req: Request, res: Response) => {
  try {
    const revoked = await consentService.revokeAllConsents(req.user!.userId);
    res.json({
      success: true,
      message: 'Seluruh izin persetujuan data berhasil dicabut dan memori AI dibersihkan.',
      consent: revoked
    });
  } catch (err: any) {
    console.error('Error revoking consent:', err);
    res.status(500).json({ error: 'Gagal mencabut izin consent.' });
  }
});

// Download Complete User Data Export (JSON)
router.get(['/download-data', '/export'], requireAuth, exportLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const bundle = await retentionService.exportUserData(userId);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Content-Disposition', `attachment; filename="ruangtenang_data_export_${userId}.json"`);
    return res.json(bundle);
  } catch (err: any) {
    console.error('Error exporting data:', err);
    res.status(500).json({ error: 'Gagal mendownload ekspor data.' });
  }
});

// Correct User Data
router.post('/correct-data', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = correctDataSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validasi gagal.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const updated = await serverDb.updateUserProfileDetails(req.user!.userId, parsed.data);
    if (!updated) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    res.json({
      success: true,
      message: 'Data pribadi berhasil diperbarui.',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        university: updated.university,
        role: updated.role,
        tier: updated.tier
      }
    });
  } catch (err: any) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: 'Gagal memperbarui data pribadi.' });
  }
});

// Set Custom Data Retention Policy
router.post('/retention-policy', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = retentionPolicySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validasi gagal.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const updated = await consentService.updateConsents(req.user!.userId, {
      retentionDays: parsed.data.retentionDays
    });

    res.json({
      success: true,
      message: `Periode penyimpanan data diubah menjadi ${parsed.data.retentionDays === 0 ? 'Selamanya (Sesuai Aturan)' : parsed.data.retentionDays + ' Hari'}.`,
      record: updated,
      consent: updated
    });
  } catch (err: any) {
    console.error('Error updating retention policy:', err);
    res.status(500).json({ error: 'Gagal mengatur periode penyimpanan data.' });
  }
});

// Run Retention Cleanup manually (Admin or Service)
router.post('/retention/run-cleanup', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const result = await retentionService.runRetentionCleanup();
    res.json({ success: true, result });
  } catch (err: any) {
    console.error('Error running retention cleanup:', err);
    res.status(500).json({ error: 'Gagal menjalankan pembersihan retensi data.' });
  }
});

// Staff Access Logs
router.get('/staff-access-logs', requireAuth, async (req: Request, res: Response) => {
  try {
    const logs = await serverDb.getStaffAccessLogsForUser(req.user!.userId);
    res.json({ success: true, logs });
  } catch (err: any) {
    console.error('Error fetching staff access logs:', err);
    res.status(500).json({ error: 'Gagal mengambil log akses petugas.' });
  }
});

// Erasure Status
router.get('/erasure-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = await serverDb.getErasureStatus(req.user!.userId);
    res.json({ success: true, erasureRecord: status });
  } catch (err: any) {
    console.error('Error fetching erasure status:', err);
    res.status(500).json({ error: 'Gagal mengambil status penghapusan data.' });
  }
});

// Erase Activity Data Only (without deleting account)
router.delete(['/activity', '/data'], requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await retentionService.eraseUserActivityOnly(userId);
    res.json({
      success: true,
      message: 'Riwayat percakapan, catatan mood, dan skrining berhasil dibersihkan.',
      ...result
    });
  } catch (err: any) {
    console.error('Error erasing user activity data:', err);
    res.status(500).json({ error: 'Gagal membersihkan riwayat aktivitas.' });
  }
});

// Erasure Request / Right to be Forgotten (Full Account & Personal Records)
router.post(['/erasure-request', '/db/data-erasure'], requireAuth, async (req: Request, res: Response) => {
  try {
    let targetUserId = req.user!.userId;
    if (req.user!.role === 'admin' && req.body.userId) {
      targetUserId = req.body.userId;
    }

    // Confirmation check for self-erasure
    if (targetUserId === req.user!.userId) {
      const { confirmText, confirmPassword } = req.body;
      const isConfirmedText = confirmText === 'HAPUS AKUN SAYA' || req.body.confirmDelete === true;
      if (!isConfirmedText && !confirmPassword) {
        return res.status(400).json({
          success: false,
          code: 'CONFIRMATION_REQUIRED',
          error: 'Penghapusan akun memerlukan konfirmasi. Sertakan confirmText: "HAPUS AKUN SAYA" atau kata sandi Anda.'
        });
      }

      if (confirmPassword) {
        const user = await serverDb.getUserById(req.user!.userId);
        if (user) {
          const isValid = await bcrypt.compare(confirmPassword, user.passwordHash);
          if (!isValid) {
            return res.status(401).json({
              success: false,
              code: 'INVALID_PASSWORD',
              error: 'Kata sandi konfirmasi tidak sesuai.'
            });
          }
        }
      }
    }

    const result = await retentionService.eraseUserData(targetUserId, req.user!.name);

    if (targetUserId === req.user!.userId) {
      authService.clearSessionCookie(res);
    }

    res.json({
      success: true,
      message: 'Seluruh rekam jejak, akun, riwayat penggunaan, audit log, dan data lokal telah berhasil dibersihkan secara permanen (Right to be Forgotten).',
      ...result
    });
  } catch (err: any) {
    console.error('Error processing data erasure:', err);
    res.status(500).json({ error: 'Gagal memproses penghapusan total data.' });
  }
});

export default router;
