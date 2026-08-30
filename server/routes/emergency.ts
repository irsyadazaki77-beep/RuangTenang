import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { serverDb, prisma } from '../database.js';
import { optionalAuth } from '../middleware/auth.js';
import { sanitizeInput, safeLog } from '../security.js';
import { scanAndSanitizePII } from '../services/piiService.js';
import { aiGateway } from '../services/ai/aiGateway.js';
import { idempotencyMiddleware } from '../apiV1Helpers.js';
import { DistributedStateService } from '../services/distributedStateService.js';
import { TriggerSosSchema as sosTriggerSchema } from '../../shared/contracts/emergency.js';

export { sosTriggerSchema };

const router = Router();

// SOS Rate limiting tracker
const sosDispatchHistory = new Map<string, number[]>();
const COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes cooldown
const WINDOW_MS = 15 * 60 * 1000;   // 15 minutes window
const MAX_DISPATCHES_PER_WINDOW = 2;

export function clearSosHistoryForTesting() {
  sosDispatchHistory.clear();
  DistributedStateService.cleanExpired().catch(() => {});
}

export function maskPhoneNumber(phone: string): string {
  const clean = phone.trim();
  if (clean.length <= 4) return '****';
  const start = clean.slice(0, Math.min(4, Math.floor(clean.length / 3)));
  const end = clean.slice(-Math.min(3, Math.floor(clean.length / 3)));
  const middle = '*'.repeat(Math.max(3, clean.length - start.length - end.length));
  return `${start}${middle}${end}`;
}

export function maskPersonName(name: string): string {
  const clean = name.trim();
  if (!clean) return 'Kontak Darurat';
  if (clean.length <= 2) return clean.charAt(0) + '*';
  return `${clean.charAt(0)}***${clean.charAt(clean.length - 1)}`;
}

export const crisisClassifierSchema = z.object({
  text: z.string().min(1).max(1000),
}).strict();

// SOS Trigger Dispatch Endpoint
router.post(
  ['/sos/trigger', '/api/sos/trigger', '/trigger'],
  optionalAuth,
  idempotencyMiddleware,
  async (req: Request, res: Response) => {
    try {
      const parsed = sosTriggerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validasi gagal.',
          details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
        });
      }

      const dispatchId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const { location } = parsed.data;

      // 1. Unauthenticated requests MUST NOT trigger real outbound gateway dispatches
      if (!req.user?.userId) {
        await serverDb.logAudit(
          'SOS_TRIGGER_UNAUTHENTICATED',
          'Permintaan SOS dari pengguna belum terautentikasi (Sesi Tamu). Outbound dispatch diblokir.',
          'guest'
        );
        return res.status(200).json({
          success: false,
          dispatchId,
          status: 'GUEST_DIRECT_CALL_ONLY',
          timestamp,
          hasUserConsent: false,
          message: 'Sesi tamu (belum terautentikasi). Pengiriman SOS otomatis memerlukan akun terverifikasi dengan kontak darurat tersimpan di server. Silakan hubungi nomor hotline darurat resmi secara langsung.',
          hotlines: [
            { name: 'Hotline Kemenkes RI', phone: '119' },
            { name: 'LISA Suicide Prevention', phone: '0811-3855-472' },
            { name: 'Pusat Krisis Kampus', phone: '021-78880123' }
          ]
        });
      }

      const userId = req.user.userId;

      // 2. Fetch server-stored truth for emergency contacts and user consents
      const [serverContact, serverConsent] = await Promise.all([
        prisma.emergencyContacts.findUnique({ where: { userId } }),
        prisma.userConsents.findUnique({ where: { userId } })
      ]);

      // Verify server-stored contact exists
      if (!serverContact || !serverContact.phone) {
        return res.status(400).json({
          success: false,
          dispatchId,
          status: 'CONTACT_MISSING',
          timestamp,
          hasUserConsent: Boolean(serverConsent?.consentForEmergencySOS),
          message: 'Kontak darurat belum tersimpan pada server. Silakan daftarkan kontak darurat pada menu Pengaturan.'
        });
      }

      // Verify active server consent
      const hasContactConsent = Boolean(serverContact.hasConsent);
      const hasUserConsentSetting = Boolean(serverConsent?.consentForEmergencySOS);
      const isConsentActive = hasContactConsent && hasUserConsentSetting;

      if (!isConsentActive) {
        await serverDb.logAudit(
          'SOS_TRIGGER_BLOCKED',
          `Pemicuan SOS untuk user ${userId} ditolak karena belum ada izin eksplisit di server (ContactConsent: ${hasContactConsent}, UserConsent: ${hasUserConsentSetting}).`,
          req.user.role || 'mahasiswa'
        );
        return res.status(400).json({
          success: false,
          dispatchId,
          status: 'CONSENT_REQUIRED',
          timestamp,
          hasUserConsent: false,
          message: 'Persetujuan (consent) SOS darurat belum diaktifkan dalam akun Anda di server. Silakan beri persetujuan pada menu Pengaturan sebelum menggunakan pemicu SOS.'
        });
      }

      // 3. Rate limiting and cooldown enforcement per user (Multi-Instance & Local Distributed Safe)
      const now = Date.now();
      const userHistory = (sosDispatchHistory.get(userId) || []).filter(t => now - t < WINDOW_MS);
      const lastDispatchTime = userHistory[userHistory.length - 1];

      const distributedCooldown = await DistributedStateService.checkSosCooldown(userId, 180);

      if ((lastDispatchTime && (now - lastDispatchTime < COOLDOWN_MS)) || distributedCooldown.inCooldown) {
        await serverDb.logAudit(
          'SOS_TRIGGER_RATE_LIMITED',
          `Pemicuan SOS dibatasi cooldown (3 menit) untuk user ${userId}`,
          req.user.role || 'mahasiswa'
        );
        return res.status(429).json({
          success: false,
          dispatchId,
          status: 'COOLDOWN_ACTIVE',
          timestamp,
          message: 'Sinyal SOS baru saja dikirim. Harap tunggu 3 menit sebelum mengirim sinyal berikutnya.'
        });
      }

      if (userHistory.length >= MAX_DISPATCHES_PER_WINDOW) {
        await serverDb.logAudit(
          'SOS_TRIGGER_RATE_LIMITED',
          `Pemicuan SOS melebihi batas kuota (maksimal 2 kali per 15 menit) untuk user ${userId}`,
          req.user.role || 'mahasiswa'
        );
        return res.status(429).json({
          success: false,
          dispatchId,
          status: 'RATE_LIMIT_EXCEEDED',
          timestamp,
          message: 'Batas pemicuan SOS tercapai (maksimal 2 kali per 15 menit). Silakan hubungi hotline 119.'
        });
      }

      // 4. Decrypt server-stored contact info securely
      const { encryptionService } = await import('../services/encryptionService.js');
      const decryptedPhone = encryptionService.decryptSensitive(serverContact.phone) || serverContact.phone;
      const decryptedName = encryptionService.decryptSensitive(serverContact.name) || serverContact.name;

      const sosPayload = {
        studentName: req.user.name,
        emergencyContact: decryptedPhone,
        location,
        crisisSignal: 'Krisis Kesehatan Mental / Darurat Mahasiswa',
      };

      const { sendEmergencySOS } = await import('../services/sosGateway.js');
      const gatewayResult = await sendEmergencySOS(sosPayload);

      // Record dispatch timestamp both in-memory and persistent distributed state
      userHistory.push(now);
      sosDispatchHistory.set(userId, userHistory);
      await DistributedStateService.recordSosDispatch(userId, 180);

      const maskedPhone = maskPhoneNumber(decryptedPhone);
      const maskedName = maskPersonName(decryptedName);
      safeLog(`[SOS DISPATCH SECURED] ID: ${dispatchId} | User: ${userId} | Status: ${gatewayResult.status}`);
      await serverDb.logAudit(
        'SOS_DISPATCH_TRIGGER',
        `Sinyal SOS ID ${dispatchId} diproses menggunakan kontak terverifikasi server [REDACTED_CONTACT] (Gateway status: ${gatewayResult.status})`,
        req.user.role || 'mahasiswa'
      );

      let responseStatus: 'SENT' | 'SIMULATED' | 'FAILED' = 'SIMULATED';
      let statusMessage = '';

      if (gatewayResult.status === 'delivered') {
        responseStatus = 'SENT';
        statusMessage = `Sinyal SOS darurat terkirim via SMS/WhatsApp ke ${maskedName} (${maskedPhone}).`;
      } else if (gatewayResult.status === 'mock_mode' || gatewayResult.status === 'not_configured') {
        responseStatus = 'SIMULATED';
        statusMessage = `Mode Simulasi: Gateway SMS produksi belum dikonfigurasi. Sinyal SOS dicatat secara internal pada server (${maskedName}: ${maskedPhone}). Untuk bantuan nyata, hubungi nomor hotline 119 / LISA.`;
      } else {
        responseStatus = 'FAILED';
        statusMessage = `Pengiriman sinyal SOS gagal (${gatewayResult.error || 'kesalahan gateway'}). Segera hubungi hotline darurat 119 atau LISA.`;
      }

      return res.json({
        success: responseStatus === 'SENT' || responseStatus === 'SIMULATED',
        dispatchId,
        status: responseStatus,
        rawGatewayStatus: gatewayResult.status,
        timestamp,
        recipientName: maskedName,
        recipientPhone: maskedPhone,
        hasUserConsent: true,
        message: statusMessage
      });
    } catch (err: any) {
      console.error('Error in SOS trigger:', err);
      return res.status(500).json({ error: 'Gagal memproses pemicu darurat SOS.' });
    }
  }
);

// Crisis Classifier with AI & Local Clinical Rule Fallback
router.post(['/crisis-classifier', '/api/crisis-classifier'], optionalAuth, async (req: Request, res: Response) => {
  try {
    const parsed = crisisClassifierSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validasi gagal.',
        details: parsed.error.issues.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }

    const { text } = parsed.data;
    const cleanText = sanitizeInput(text, 500);
    const userId = req.user?.userId;

    const parsedJson = await aiGateway.analyzeEmergencyCrisis({
      userId,
      text: cleanText
    });

    await serverDb.logAudit(
      'CRISIS_CLASSIFIER_EXEC',
      `Hash: ${crypto.createHash('sha256').update(cleanText).digest('hex').substring(0,8)} | Severity: ${parsedJson.severity} | Negasi: ${parsedJson.isNegated} | Reasoning: ${parsedJson.reasoning}`,
      req.user?.role || 'mahasiswa'
    );

    return res.json(parsedJson);
  } catch (err: any) {
    console.error('Error in /api/crisis-classifier:', err);
    return res.status(500).json({ error: 'Gagal mengevaluasi tingkat krisis.' });
  }
});

export default router;
