import { prisma } from '../database.js';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { encryptionService } from '../services/encryptionService.js';

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
      let factors: string[] = [];
      if (log.factors) {
        try {
          factors = JSON.parse(log.factors);
        } catch {
          factors = [log.factors];
        }
      }
      return {
        ...log,
        notes: encryptionService.decryptSensitive(log.notes) || log.notes || '',
        factors
      };
    });
    res.json(decryptedLogs);
  } catch (e) {
    sendError(res, 'FETCH_MOOD_FAILED', 'Gagal mengambil data mood');
  }
});

const moodSchema = z.object({
  mood: z.union([z.string(), z.number()]),
  notes: z.string().optional(),
  intensity: z.number().min(0).max(24).optional(),
  factors: z.array(z.string()).optional()
});

router.post('/mood', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = moodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.issues });
    }
    const { mood, notes, intensity, factors } = parsed.data;
    const moodStr = String(mood);
    const log = await prisma.moodLogs.create({
      data: {
        id: `mood_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        userId: req.user!.userId,
        mood: moodStr,
        notes: encryptionService.encryptSensitive(notes || '') || notes || '',
        intensity: intensity ?? 8,
        factors: factors ? JSON.stringify(factors) : null
      }
    });
    res.json({ success: true, log: { ...log, notes, factors: factors || [] } });
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

    const parsed = moodSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Validasi gagal', details: parsed.error.issues });
    }

    const updates: any = {};
    if (parsed.data.mood !== undefined) updates.mood = String(parsed.data.mood);
    if (parsed.data.notes !== undefined) {
      updates.notes = encryptionService.encryptSensitive(parsed.data.notes) || parsed.data.notes;
    }
    if (parsed.data.intensity !== undefined) updates.intensity = parsed.data.intensity;
    if (parsed.data.factors !== undefined) updates.factors = JSON.stringify(parsed.data.factors);

    const updated = await prisma.moodLogs.update({
      where: { id },
      data: updates
    });

    res.json({
      success: true,
      log: {
        ...updated,
        notes: parsed.data.notes !== undefined ? parsed.data.notes : (encryptionService.decryptSensitive(updated.notes) || updated.notes)
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
    
    const encryptedName = encryptionService.encryptSensitive(name) || name;
    const encryptedPhone = encryptionService.encryptSensitive(phone) || phone;
    const encryptedWhatsapp = whatsapp ? (encryptionService.encryptSensitive(whatsapp) || whatsapp) : null;
    const encryptedRelationship = encryptionService.encryptSensitive(relationship) || relationship;

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

export default router;
