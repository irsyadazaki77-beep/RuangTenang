import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { authService } from '../services/authService.js';
import { consentService } from '../services/consentService.js';
import { retentionService } from '../services/retentionService.js';
import { serverDb } from '../database.js';

import { exportLimiter, accountDeletionLimiter } from '../middleware/rateLimiters.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../database.js';
import { emailService } from '../services/emailService.js';

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
  currentPassword: z.string().min(1).optional(),
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

// Correct User Data (Protected against unauthorized email changes & account takeover)
router.post('/correct-data', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = correctDataSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Validasi gagal.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const user = await serverDb.getUserById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', error: 'Pengguna tidak ditemukan.' });
    }

    const { name, university, email, currentPassword } = parsed.data;
    const requestedEmail = email ? email.trim().toLowerCase() : undefined;
    const isEmailChange = Boolean(requestedEmail && requestedEmail !== user.email.toLowerCase());

    if (isEmailChange) {
      // 1. Re-authenticate password for sensitive email modification
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          code: 'PASSWORD_REQUIRED',
          error: 'Kata sandi saat ini wajib diisi untuk mengubah alamat email.'
        });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_PASSWORD',
          error: 'Kata sandi saat ini tidak sesuai.'
        });
      }

      // 2. Prevent taking over an already registered email
      const existingUser = await serverDb.getUserByEmail(requestedEmail!);
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({
          success: false,
          code: 'EMAIL_ALREADY_REGISTERED',
          error: 'Alamat email baru sudah terdaftar pada akun lain.'
        });
      }
    }

    const updates: { name?: string; university?: string; email?: string; emailVerified?: boolean } = {};
    if (name !== undefined) updates.name = name.trim();
    if (university !== undefined) updates.university = university.trim();

    if (isEmailChange) {
      updates.email = requestedEmail;
      updates.emailVerified = false;
    }

    const updated = await serverDb.updateUserProfileDetails(user.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', error: 'Pengguna tidak ditemukan.' });
    }

    let verificationMessage = '';
    if (isEmailChange) {
      // 3. Issue new verification code for the new email
      const verificationCode = authService.generate6DigitCode();
      await serverDb.setEmailVerificationCode(user.id, verificationCode);
      await emailService.sendVerificationCode(requestedEmail!, verificationCode, updated.name);

      const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
      if (isDev) {
        console.info(`[DEV_ONLY_EMAIL_SINK] Verification code for ${requestedEmail}: ${verificationCode}`);
      }
      verificationMessage = ' Alamat email berhasil diubah. Kode verifikasi baru telah dikirim ke email tersebut.';
    }

    res.json({
      success: true,
      message: `Data pribadi berhasil diperbarui.${verificationMessage}`,
      emailVerificationRequired: isEmailChange,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        university: updated.university,
        role: updated.role,
        tier: updated.tier,
        emailVerified: updated.emailVerified
      }
    });
  } catch (err: any) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ success: false, code: 'UPDATE_PROFILE_FAILED', error: 'Gagal memperbarui data pribadi.' });
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

// Erasure Request / Right to be Forgotten (Self Account & Personal Records)
router.post(['/erasure-request', '/db/data-erasure'], requireAuth, accountDeletionLimiter, async (req: Request, res: Response) => {
  try {
    const targetUserId = req.user!.userId;

    // Confirmation check for self-erasure
    const { confirmText, confirmPassword, mfaCode } = req.body;
    const isConfirmedText = confirmText === 'HAPUS AKUN SAYA' || req.body.confirmDelete === true;

    if (!isConfirmedText) {
      return res.status(400).json({
        success: false,
        code: 'CONFIRMATION_REQUIRED',
        error: 'Penghapusan akun memerlukan konfirmasi frasa "HAPUS AKUN SAYA".'
      });
    }

    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        code: 'PASSWORD_REQUIRED',
        error: 'Penghapusan akun memerlukan konfirmasi kata sandi.'
      });
    }

    // We need the raw database user to access sensitive fields like mfaCode and mfaExpires
    const user = await prisma.users.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
       return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    const isValid = await bcrypt.compare(confirmPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_PASSWORD',
        error: 'Kata sandi konfirmasi tidak sesuai.'
      });
    }

    if (user.mfaEnabled) {
      let isRecentAuth = false;

      if (req.user!.sessionId) {
         const session = await prisma.userSession.findUnique({ where: { id: req.user!.sessionId } });
         if (session) {
            const ageMins = (new Date().getTime() - session.createdAt.getTime()) / (1000 * 60);
            if (ageMins <= 5) {
               isRecentAuth = true;
            }
         }
      }

      if (!isRecentAuth) {
        if (!mfaCode) {
           return res.status(403).json({
             success: false,
             code: 'MFA_REQUIRED',
             error: 'Akun Anda mengaktifkan MFA. Mohon masukkan kode MFA atau lakukan verifikasi terbaru (recent authentication).'
           });
        }

        const hashedCode = crypto.createHash('sha256').update(mfaCode.trim()).digest('hex');
        const isValidMfa = user.mfaCode === hashedCode && user.mfaExpires && user.mfaExpires > new Date();
        if (!isValidMfa) {
           return res.status(401).json({
             success: false,
             code: 'INVALID_MFA_CODE',
             error: 'Kode MFA tidak valid atau sudah kedaluwarsa.'
           });
        }
      }
    }

    const result = await retentionService.eraseUserData(targetUserId, req.user!.name);
    authService.clearSessionCookie(res);

    res.json({
      success: true,
      message: 'Akun dan catatan pengguna terkait telah dihapus dari database aktif. Catatan audit penghapusan tetap disimpan.',
      ...result
    });
  } catch (err: any) {
    console.error('Error processing data erasure:', err);
    res.status(500).json({ error: 'Gagal memproses penghapusan total data.' });
  }
});

export default router;
