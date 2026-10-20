import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../database.js';
import { requireAuth, requireCampusAdmin, requireRole, normalizeRole } from '../middleware/auth.js';
import { redisService } from '../services/redisService.js';
import { CAMPUS_PRODUCT_EVENT_TYPES, recordCampusProductEvent, toSuppressedCampusMetric, type CampusProductEventType } from '../services/campusProductAnalyticsService.js';

const router = Router();
const MINIMUM_ANALYTICS_COHORT = 10;
const clientEventTypes = ['activation_completed', 'repeat_visit', 'referral_started', 'workflow_failed'] as const;
const INDONESIAN_WEEKDAY_NAMES = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'] as const;
const CANONICAL_WEEKDAY_NAME: Record<typeof INDONESIAN_WEEKDAY_NAMES[number], string> = {
  minggu: 'Minggu',
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu'
};

const validTimeZone = (value: string) => {
  try {
    new Intl.DateTimeFormat('id-ID', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const referralContactSchema = z.object({
  label: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional(),
  url: z.string().trim().url().refine(value => value.startsWith('https://'), 'Tautan rujukan harus menggunakan HTTPS.').optional()
}).strict();

const brandingSchema = z.object({
  brandName: z.string().trim().min(1).max(80).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
}).strict();

const createCampusSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64),
  name: z.string().trim().min(2).max(120),
  timeZone: z.string().trim().min(1).max(64).refine(validTimeZone, 'Zona waktu tidak dikenal.'),
  referralContacts: z.array(referralContactSchema).max(10).default([]),
  branding: brandingSchema.default({}),
  aiEnabled: z.boolean().default(true)
}).strict();

const updateCampusSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  timeZone: z.string().trim().min(1).max(64).refine(validTimeZone, 'Zona waktu tidak dikenal.').optional(),
  referralContacts: z.array(referralContactSchema).max(10).optional(),
  branding: brandingSchema.optional(),
  aiEnabled: z.boolean().optional(),
  isActive: z.boolean().optional()
}).strict().refine(value => Object.keys(value).length > 0, 'Setidaknya satu perubahan harus diberikan.');

const campusAdminSettingsSchema = z.object({
  timeZone: z.string().trim().min(1).max(64).refine(validTimeZone, 'Zona waktu tidak dikenal.').optional(),
  referralContacts: z.array(referralContactSchema).max(10).optional(),
  branding: brandingSchema.optional(),
  aiEnabled: z.boolean().optional()
}).strict().refine(value => Object.keys(value).length > 0, 'Setidaknya satu perubahan harus diberikan.');

const assignUserSchema = z.object({ campusId: z.string().min(1) }).strict();
const clientEventSchema = z.object({ eventType: z.enum(clientEventTypes) }).strict();
const updateCounselorSchema = z.object({
  availability: z.array(z.string().trim().min(1).max(80))
    .max(7)
    .refine(values => values.every(value => INDONESIAN_WEEKDAY_NAMES.includes(value.toLocaleLowerCase('id-ID') as typeof INDONESIAN_WEEKDAY_NAMES[number])), 'Jadwal harus menggunakan nama hari Indonesia (Minggu sampai Sabtu).')
    .optional(),
  specialties: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  isFreeForStudents: z.boolean().optional(),
  price: z.number().int().min(0).max(100000000).optional()
}).strict().refine(value => Object.keys(value).length > 0, 'Setidaknya satu perubahan harus diberikan.');

function parseJsonObject<T extends Record<string, unknown>>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as T : fallback;
  } catch {
    return fallback;
  }
}

function parseJsonArray<T>(raw: string | null | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch {
    return fallback;
  }
}

function publicCampus(campus: {
  id: string; slug: string; name: string; timeZone: string; referralContacts: string;
  branding: string; aiSettings: string; retentionDays: number; isActive: boolean;
}) {
  return {
    id: campus.id,
    slug: campus.slug,
    name: campus.name,
    timeZone: campus.timeZone,
    referralContacts: parseJsonArray(campus.referralContacts, []),
    branding: parseJsonObject(campus.branding, {}),
    aiEnabled: parseJsonObject(campus.aiSettings, { enabled: true }).enabled !== false,
    retentionDays: campus.retentionDays,
    isActive: campus.isActive
  };
}

/** Platform-admin-only campus provisioning and explicit account mapping. */
router.get('/admin/campuses', requireAuth, requireRole(['admin']), async (_req, res) => {
  const campuses = await prisma.campuses.findMany({ orderBy: { name: 'asc' } });
  return res.json({ success: true, campuses: campuses.map(publicCampus) });
});

router.post('/admin/campuses', requireAuth, requireRole(['admin']), async (req, res) => {
  const parsed = createCampusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', details: parsed.error.issues });
  const input = parsed.data;
  try {
    const campus = await prisma.campuses.create({
      data: {
        id: randomUUID(),
        slug: input.slug,
        name: input.name,
        timeZone: input.timeZone,
        referralContacts: JSON.stringify(input.referralContacts),
        branding: JSON.stringify(input.branding),
        aiSettings: JSON.stringify({ enabled: input.aiEnabled })
      }
    });
    await prisma.auditLogs.create({
      data: {
        id: randomUUID(),
        action: 'CAMPUS_CREATED',
        details: `Kampus ${campus.id} dibuat oleh administrator platform.`,
        userRole: 'admin'
      }
    });
    return res.status(201).json({ success: true, campus: publicCampus(campus) });
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(409).json({ success: false, error: 'CAMPUS_SLUG_EXISTS' });
    console.error('[CAMPUS] CREATE_FAILED');
    return res.status(500).json({ success: false, error: 'CAMPUS_CREATE_FAILED' });
  }
});

router.patch('/admin/campuses/:campusId', requireAuth, requireRole(['admin']), async (req, res) => {
  const parsed = updateCampusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', details: parsed.error.issues });
  const input = parsed.data;
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.timeZone !== undefined) data.timeZone = input.timeZone;
  if (input.referralContacts !== undefined) data.referralContacts = JSON.stringify(input.referralContacts);
  if (input.branding !== undefined) data.branding = JSON.stringify(input.branding);
  if (input.aiEnabled !== undefined) data.aiSettings = JSON.stringify({ enabled: input.aiEnabled });
  if (input.isActive !== undefined) data.isActive = input.isActive;
  try {
    const campus = await prisma.campuses.update({ where: { id: req.params.campusId }, data });
    await prisma.auditLogs.create({
      data: {
        id: randomUUID(),
        action: 'CAMPUS_SETTINGS_UPDATED',
        details: `Konfigurasi kampus ${campus.id} diperbarui oleh administrator platform.`,
        userRole: 'admin'
      }
    });
    return res.json({ success: true, campus: publicCampus(campus) });
  } catch (error: any) {
    if (error?.code === 'P2025') return res.status(404).json({ success: false, error: 'CAMPUS_NOT_FOUND' });
    console.error('[CAMPUS] UPDATE_FAILED');
    return res.status(500).json({ success: false, error: 'CAMPUS_UPDATE_FAILED' });
  }
});

router.patch('/admin/campuses/:campusId/users/:userId', requireAuth, requireRole(['admin']), async (req, res) => {
  const parsed = assignUserSchema.safeParse(req.body);
  if (!parsed.success || parsed.data.campusId !== req.params.campusId) {
    return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Kampus pada URL dan body harus sama.' });
  }
  const campus = await prisma.campuses.findUnique({ where: { id: req.params.campusId }, select: { id: true, isActive: true } });
  const user = await prisma.users.findUnique({ where: { id: req.params.userId }, select: { id: true, role: true, campusId: true } });
  if (!campus || !user) return res.status(404).json({ success: false, error: 'CAMPUS_OR_USER_NOT_FOUND' });
  if (!campus.isActive) return res.status(409).json({ success: false, error: 'CAMPUS_INACTIVE' });
  if (normalizeRole(user.role) === 'admin') return res.status(403).json({ success: false, error: 'PLATFORM_ADMIN_CANNOT_BE_TENANT_MEMBER' });

  try {
    await prisma.$transaction(async tx => {
      await tx.users.update({ where: { id: user.id }, data: { campusId: campus.id } });
      await tx.counselors.updateMany({ where: { userId: user.id }, data: { campusId: campus.id } });
      await tx.auditLogs.create({
        data: {
          id: randomUUID(),
          action: 'CAMPUS_USER_ASSIGNED',
          details: `Akun ${user.id} dipetakan ke kampus ${campus.id} oleh administrator platform.`,
          userRole: 'admin'
        }
      });
    });
    return res.json({ success: true, userId: user.id, campusId: campus.id });
  } catch {
    console.error('[CAMPUS] USER_ASSIGNMENT_FAILED');
    return res.status(500).json({ success: false, error: 'CAMPUS_ASSIGNMENT_FAILED' });
  }
});

router.get('/campuses/me', requireAuth, async (req, res) => {
  if (!req.user!.campusId) return res.status(404).json({ success: false, error: 'CAMPUS_NOT_ASSIGNED' });
  const campus = await prisma.campuses.findFirst({ where: { id: req.user!.campusId, isActive: true } });
  if (!campus) return res.status(404).json({ success: false, error: 'CAMPUS_NOT_FOUND' });
  return res.json({ success: true, campus: publicCampus(campus) });
});

router.get('/campus-admin/settings', requireAuth, requireCampusAdmin, async (req, res) => {
  const campus = await prisma.campuses.findFirst({ where: { id: req.user!.campusId!, isActive: true } });
  if (!campus) return res.status(404).json({ success: false, error: 'CAMPUS_NOT_FOUND' });
  return res.json({ success: true, campus: publicCampus(campus) });
});

router.patch('/campus-admin/settings', requireAuth, requireCampusAdmin, async (req, res) => {
  const parsed = campusAdminSettingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', details: parsed.error.issues });
  const input = parsed.data;
  const data: Record<string, unknown> = {};
  if (input.timeZone !== undefined) data.timeZone = input.timeZone;
  if (input.referralContacts !== undefined) data.referralContacts = JSON.stringify(input.referralContacts);
  if (input.branding !== undefined) data.branding = JSON.stringify(input.branding);
  if (input.aiEnabled !== undefined) data.aiSettings = JSON.stringify({ enabled: input.aiEnabled });
  try {
    const campus = await prisma.campuses.update({ where: { id: req.user!.campusId! }, data });
    await prisma.auditLogs.create({
      data: {
        id: randomUUID(),
        action: 'CAMPUS_SETTINGS_UPDATED',
        details: `Konfigurasi kampus ${campus.id} diperbarui administrator kampus ${req.user!.userId}.`,
        userRole: 'campus_admin'
      }
    });
    return res.json({ success: true, campus: publicCampus(campus) });
  } catch {
    console.error('[CAMPUS] ADMIN_SETTINGS_UPDATE_FAILED');
    return res.status(500).json({ success: false, error: 'CAMPUS_SETTINGS_UPDATE_FAILED' });
  }
});

router.get('/campus-admin/counselors', requireAuth, requireCampusAdmin, async (req, res) => {
  const counselors = await prisma.counselors.findMany({
    where: { campusId: req.user!.campusId!, isDemoData: false },
    select: { id: true, name: true, role: true, specialties: true, availability: true, isVerified: true, licenseNumber: true, isFreeForStudents: true, price: true }
  });
  return res.json({
    success: true,
    counselors: counselors.map(counselor => ({
      ...counselor,
      specialties: parseJsonArray(counselor.specialties, []),
      availability: parseJsonArray(counselor.availability, []),
      isVerified: Boolean(counselor.isVerified && counselor.licenseNumber)
    }))
  });
});

router.patch('/campus-admin/counselors/:counselorId', requireAuth, requireCampusAdmin, async (req, res) => {
  const parsed = updateCounselorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', details: parsed.error.issues });
  const existing = await prisma.counselors.findFirst({
    where: { id: req.params.counselorId, campusId: req.user!.campusId!, isDemoData: false },
    select: { id: true }
  });
  if (!existing) return res.status(404).json({ success: false, error: 'COUNSELOR_NOT_FOUND' });
  const input = parsed.data;
  const data: Record<string, unknown> = {};
  if (input.availability !== undefined) {
    const canonicalDays = input.availability.map(value => CANONICAL_WEEKDAY_NAME[value.toLocaleLowerCase('id-ID') as typeof INDONESIAN_WEEKDAY_NAMES[number]]);
    data.availability = JSON.stringify([...new Set(canonicalDays)]);
  }
  if (input.specialties !== undefined) data.specialties = JSON.stringify([...new Set(input.specialties)]);
  if (input.isFreeForStudents !== undefined) data.isFreeForStudents = input.isFreeForStudents;
  if (input.price !== undefined) data.price = input.isFreeForStudents ? 0 : input.price;
  if (input.isFreeForStudents === true) data.price = 0;
  try {
    await prisma.counselors.update({ where: { id: existing.id }, data });
    await prisma.auditLogs.create({
      data: {
        id: randomUUID(),
        action: 'CAMPUS_COUNSELOR_SETTINGS_UPDATED',
        details: `Pengaturan operasional konselor ${existing.id} diperbarui administrator kampus ${req.user!.userId}.`,
        userRole: 'campus_admin'
      }
    });
    await redisService.delPattern('counselors:list:*');
    await redisService.delPattern(`availability:${existing.id}:*`);
    return res.json({ success: true });
  } catch {
    console.error('[CAMPUS] COUNSELOR_SETTINGS_UPDATE_FAILED');
    return res.status(500).json({ success: false, error: 'COUNSELOR_SETTINGS_UPDATE_FAILED' });
  }
});

router.get('/campus-admin/overview', requireAuth, requireCampusAdmin, async (req, res) => {
  const campusId = req.user!.campusId!;
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const groupedEvents = await prisma.productAnalyticsEvents.groupBy({
    by: ['eventType', 'actorHash'],
    where: { campusId, occurredAt: { gte: cutoff } },
    _count: { id: true },
    orderBy: [{ eventType: 'asc' }, { actorHash: 'asc' }],
    take: 10000
  });
  const metrics = new Map<string, { actors: Set<string>; eventCount: number }>();
  for (const row of groupedEvents) {
    if (!CAMPUS_PRODUCT_EVENT_TYPES.includes(row.eventType as CampusProductEventType)) continue;
    const current = metrics.get(row.eventType) || { actors: new Set<string>(), eventCount: 0 };
    current.actors.add(row.actorHash);
    current.eventCount += row._count.id;
    metrics.set(row.eventType, current);
  }

  const names: Record<CampusProductEventType, string> = {
    activation_completed: 'Onboarding selesai',
    repeat_visit: 'Kunjungan kembali',
    referral_started: 'Rujukan dimulai',
    referral_completed: 'Sesi konseling selesai',
    workflow_failed: 'Alur gagal'
  };
  const events = CAMPUS_PRODUCT_EVENT_TYPES.map(eventType => {
    const metric = metrics.get(eventType) || { actors: new Set<string>(), eventCount: 0 };
    return toSuppressedCampusMetric(eventType, names[eventType], metric.actors.size, metric.eventCount, MINIMUM_ANALYTICS_COHORT);
  });
  return res.json({
    success: true,
    periodDays: 30,
    minimumCohortSize: MINIMUM_ANALYTICS_COHORT,
    events,
    note: 'Angka disembunyikan jika kurang dari 10 pengguna unik. Data ini mengukur penggunaan, bukan tingkat kesehatan atau diagnosis.'
  });
});

router.post('/analytics/events', requireAuth, async (req, res) => {
  const parsed = clientEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'VALIDATION_ERROR' });
  if (normalizeRole(req.user!.role) !== 'mahasiswa' || !req.user!.campusId) {
    return res.status(204).end();
  }
  const campus = await prisma.campuses.findFirst({ where: { id: req.user!.campusId, isActive: true }, select: { id: true } });
  if (!campus) return res.status(204).end();
  await recordCampusProductEvent(req.user!.userId, campus.id, parsed.data.eventType);
  return res.status(202).json({ success: true });
});

export default router;
