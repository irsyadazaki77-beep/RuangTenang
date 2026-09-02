import { prisma } from '../database.js';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { encryptionService } from '../services/encryptionService.js';
import { generateStudentProgressPdf } from '../services/reportGenerator.js';
import { CreateMoodSchema, UpdateMoodSchema } from '../../shared/contracts/mood.js';
import crypto from 'crypto';

const router = Router();

const sendError = (res: Response, code: string, message: string, status = 500) => {
  res.status(status).json({ success: false, code, message });
};

// --- MOOD LOGS ---
router.get('/mood', requireAuth, async (req: Request, res: Response) => {
  try {
    const logs = await prisma.moodLogs.findMany({
      where: { userId: req.user!.userId },
      orderBy: { timestamp: 'desc' }
    });

    const decryptedLogs = logs.map(log => {
      let decryptedNotes = '';
      if (log.notes) {
        decryptedNotes = encryptionService.decryptSensitive(log.notes) || '';
      }
      
      let factors: string[] = [];
      if (log.factors) {
        if (encryptionService.isEncrypted(log.factors)) {
          const decryptedFactorsStr = encryptionService.decryptSensitive(log.factors);
          if (decryptedFactorsStr) {
            try { factors = JSON.parse(decryptedFactorsStr); } catch { factors = [decryptedFactorsStr]; }
          }
        } else {
          try { factors = JSON.parse(log.factors); } catch { factors = [log.factors]; }
        }
      }

      let emotions: string[] = [];
      if (log.emotions) {
        if (encryptionService.isEncrypted(log.emotions)) {
          const decryptedEmotionsStr = encryptionService.decryptSensitive(log.emotions);
          if (decryptedEmotionsStr) {
            try { emotions = JSON.parse(decryptedEmotionsStr); } catch { emotions = [decryptedEmotionsStr]; }
          }
        } else {
          try { emotions = JSON.parse(log.emotions); } catch { emotions = [log.emotions]; }
        }
      }

      return {
        ...log,
        notes: decryptedNotes,
        factors,
        emotions,
        sleepHours: log.sleepHours,
        sleepQuality: log.sleepQuality
      };
    });
    res.json(decryptedLogs);
  } catch (e) {
    sendError(res, 'FETCH_MOOD_FAILED', 'Gagal mengambil data mood');
  }
});

router.post('/mood', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = CreateMoodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.issues });
    }

    const { mood, notes, emotions, factors, sleepHours, sleepQuality } = parsed.data;
    const moodStr = String(mood);

    let encryptedNotes: string | null = null;
    if (notes) {
      const enc = encryptionService.encryptSensitive(notes);
      if (!enc) {
        return res.status(500).json({ success: false, code: 'ENCRYPTION_FAILED', message: 'Gagal mengenkripsi catatan mood.' });
      }
      encryptedNotes = enc;
    }

    let encryptedFactors: string | null = null;
    if (factors && factors.length > 0) {
      const enc = encryptionService.encryptSensitive(JSON.stringify(factors));
      if (!enc) return res.status(500).json({ success: false, code: 'ENCRYPTION_FAILED', message: 'Gagal mengenkripsi faktor mood.' });
      encryptedFactors = enc;
    }

    let encryptedEmotions: string | null = null;
    if (emotions && emotions.length > 0) {
      const enc = encryptionService.encryptSensitive(JSON.stringify(emotions));
      if (!enc) return res.status(500).json({ success: false, code: 'ENCRYPTION_FAILED', message: 'Gagal mengenkripsi emosi.' });
      encryptedEmotions = enc;
    }

    const log = await prisma.moodLogs.create({
      data: {
        id: `mood_${crypto.randomUUID()}`,
        userId: req.user!.userId,
        mood: moodStr,
        notes: encryptedNotes,
        factors: encryptedFactors,
        emotions: encryptedEmotions,
        sleepHours: sleepHours ?? null,
        sleepQuality: sleepQuality ?? null
      }
    });

    res.json({ success: true, log: { ...log, notes: notes || '', factors: factors || [], emotions: emotions || [] } });
  } catch (e: any) {
    console.error('[MOOD] Error:', e.message);
    sendError(res, 'CREATE_MOOD_FAILED', 'Gagal menyimpan data mood');
  }
});

// Update Mood Log
router.put('/mood/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.moodLogs.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Catatan mood tidak ditemukan' });
    }
    if (existing.userId !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Akses ditolak. Catatan ini bukan milik Anda.' });
    }

    const parsed = UpdateMoodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.issues });
    }

    const updates: any = {};
    if (parsed.data.mood !== undefined) updates.mood = String(parsed.data.mood);
    if (parsed.data.notes !== undefined) {
      if (parsed.data.notes) {
        const enc = encryptionService.encryptSensitive(parsed.data.notes);
        if (!enc) return res.status(500).json({ success: false, code: 'ENCRYPTION_FAILED', message: 'Error' });
        updates.notes = enc;
      } else {
        updates.notes = null;
      }
    }
    if (parsed.data.sleepHours !== undefined) updates.sleepHours = parsed.data.sleepHours;
    if (parsed.data.sleepQuality !== undefined) updates.sleepQuality = parsed.data.sleepQuality;
    
    if (parsed.data.factors !== undefined) {
      if (parsed.data.factors && parsed.data.factors.length > 0) {
        const enc = encryptionService.encryptSensitive(JSON.stringify(parsed.data.factors));
        if (!enc) return res.status(500).json({ success: false, code: 'ENCRYPTION_FAILED', message: 'Error' });
        updates.factors = enc;
      } else {
        updates.factors = null;
      }
    }
    
    if (parsed.data.emotions !== undefined) {
      if (parsed.data.emotions && parsed.data.emotions.length > 0) {
        const enc = encryptionService.encryptSensitive(JSON.stringify(parsed.data.emotions));
        if (!enc) return res.status(500).json({ success: false, code: 'ENCRYPTION_FAILED', message: 'Error' });
        updates.emotions = enc;
      } else {
        updates.emotions = null;
      }
    }

    const updated = await prisma.moodLogs.update({
      where: { id },
      data: updates
    });
    res.json({
      success: true,
      log: {
        ...updated,
        notes: parsed.data.notes !== undefined ? parsed.data.notes : (encryptionService.decryptSensitive(updated.notes) || updated.notes || '')
      }
    });
  } catch (e: any) {
    console.error('[MOOD UPDATE] Error:', e.message);
    sendError(res, 'UPDATE_MOOD_FAILED', 'Gagal memperbarui data mood');
  }
});

// Delete Mood Log
router.delete('/mood/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.moodLogs.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Catatan mood tidak ditemukan' });
    }
    if (existing.userId !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Akses ditolak. Catatan ini bukan milik Anda.' });
    }
    await prisma.moodLogs.delete({ where: { id } });
    res.json({ success: true, message: 'Catatan mood berhasil dihapus.' });
  } catch (e: any) {
    console.error('[MOOD DELETE] Error:', e.message);
    sendError(res, 'DELETE_MOOD_FAILED', 'Gagal menghapus data mood');
  }
});

// Delete all mood logs for current user
router.delete('/mood', requireAuth, async (req: Request, res: Response) => {
  try {
    const deleted = await prisma.moodLogs.deleteMany({
      where: { userId: req.user!.userId }
    });
    res.json({ success: true, count: deleted.count });
  } catch (e: any) {
    console.error('[MOOD DELETE ALL] Error:', e.message);
    sendError(res, 'DELETE_ALL_MOOD_FAILED', 'Gagal mengosongkan riwayat mood');
  }
});

// --- EMERGENCY CONTACT ---
router.get('/emergency-contact', requireAuth, async (req: Request, res: Response) => {
  try {
    const contact = await prisma.emergencyContacts.findUnique({
      where: { userId: req.user!.userId }
    });
    if (contact) {
      contact.name = encryptionService.decryptSensitive(contact.name) || contact.name;
      contact.phone = encryptionService.decryptSensitive(contact.phone) || contact.phone;
      if (contact.whatsapp) {
        contact.whatsapp = encryptionService.decryptSensitive(contact.whatsapp) || contact.whatsapp;
      }
      contact.relationship = encryptionService.decryptSensitive(contact.relationship) || contact.relationship;
    }
    res.json(contact || null);
  } catch (e) {
    sendError(res, 'FETCH_CONTACT_FAILED', 'Gagal mengambil kontak darurat');
  }
});

const emergencyContactSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  relationship: z.string().min(1, 'Hubungan wajib diisi'),
  phone: z.string().min(1, 'Nomor telepon wajib diisi'),
  whatsapp: z.string().optional(),
  hasConsent: z.boolean().optional(),
  consentDate: z.string().optional()
});

router.post('/emergency-contact', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = emergencyContactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.issues });
    }

    const { name, relationship, phone, whatsapp, hasConsent, consentDate } = parsed.data;
    
    let encryptedName: string;
    let encryptedPhone: string;
    let encryptedRelationship: string;
    let encryptedWhatsapp: string | null = null;

    try {
      encryptedName = encryptionService.encryptRequiredSensitive(name);
      encryptedPhone = encryptionService.encryptRequiredSensitive(phone);
      encryptedRelationship = encryptionService.encryptRequiredSensitive(relationship);
      if (whatsapp) {
        encryptedWhatsapp = encryptionService.encryptRequiredSensitive(whatsapp);
      }
    } catch (encErr: any) {
      console.error('[EMERGENCY_CONTACT] Fail-closed encryption failed:', encErr.message);
      return res.status(500).json({
        success: false,
        code: 'ENCRYPTION_FAILED',
        error: 'Gagal mengenkripsi kontak darurat secara aman. Transaksi dibatalkan.'
      });
    }

    const contact = await prisma.emergencyContacts.upsert({
      where: { userId: req.user!.userId },
      update: { name: encryptedName, relationship: encryptedRelationship, phone: encryptedPhone, whatsapp: encryptedWhatsapp, hasConsent, consentDate },
      create: { userId: req.user!.userId, name: encryptedName, relationship: encryptedRelationship, phone: encryptedPhone, whatsapp: encryptedWhatsapp, hasConsent, consentDate }
    });
    
    // Return decrypted representation
    res.json({ success: true, contact: { ...contact, name, phone, whatsapp, relationship } });
  } catch (e: any) {
    console.error('[EMERGENCY_CONTACT] Error:', e.message);
    sendError(res, 'UPDATE_CONTACT_FAILED', 'Gagal menyimpan kontak darurat');
  }
});

// --- PROFILE ---
router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, university: true, role: true, tier: true }
    });
    res.json(user);
  } catch(e) {
    sendError(res, 'FETCH_PROFILE_FAILED', 'Gagal mengambil profil');
  }
});

router.post('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, university } = req.body;
    await prisma.users.update({
      where: { id: req.user!.userId },
      data: { name, university }
    });
    res.json({ success: true });
  } catch(e) {
    sendError(res, 'UPDATE_PROFILE_FAILED', 'Gagal memperbarui profil');
  }
});

// --- EXPORT PDF ---
router.get('/export-progress-pdf', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.users.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan' });
    }
    const pdfBuffer = await generateStudentProgressPdf(user.id, user.name);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Progress_RuangTenang_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (e: any) {
    console.error('[EXPORT PDF] Error:', e);
    sendError(res, 'EXPORT_FAILED', 'Gagal menghasilkan PDF perkembangan');
  }
});

export default router;
