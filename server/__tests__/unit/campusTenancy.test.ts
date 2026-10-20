import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    appointments: { findUnique: vi.fn() },
    users: { findUnique: vi.fn() },
    counselors: { findUnique: vi.fn() },
    campuses: { findUnique: vi.fn() },
    productAnalyticsEvents: { create: vi.fn() }
  },
  serverDb: {},
  consentService: { getUserConsents: vi.fn() }
}));

vi.mock('../../database.js', () => ({ prisma: mocks.prisma, serverDb: mocks.serverDb }));
vi.mock('../../services/consentService.js', () => ({ consentService: mocks.consentService }));

import { normalizeRole, requireCampusAdmin } from '../../middleware/auth.js';
import { canAccessAppointmentWithinCampus, campusesMatchForLegacyAccess, isCampusAiEnabledForUser } from '../../services/campusTenantService.js';
import { createCampusAnalyticsActorHash, recordCampusProductEvent, toSuppressedCampusMetric } from '../../services/campusProductAnalyticsService.js';

describe('campus tenant boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BLIND_INDEX_SECRET = 'test-campus-analytics-secret-which-is-long-enough-123';
  });

  it('keeps the campus administrator role separate from platform admin', () => {
    expect(normalizeRole('campus_admin')).toBe('campus_admin');
    expect(normalizeRole('campus-admin')).toBe('campus_admin');
    expect(normalizeRole('admin')).toBe('admin');

    const req = { user: { userId: 'platform-admin', role: 'admin', campusId: undefined } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any;
    const next = vi.fn();
    requireCampusAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();

    const scopedReq = { user: { userId: 'campus-admin', role: 'campus_admin', campusId: 'campus-a' } } as any;
    requireCampusAdmin(scopedReq, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('only treats two unassigned legacy records as a matching pair', () => {
    expect(campusesMatchForLegacyAccess(null, undefined)).toBe(true);
    expect(campusesMatchForLegacyAccess('campus-a', 'campus-a')).toBe(true);
    expect(campusesMatchForLegacyAccess('campus-a', null)).toBe(false);
    expect(campusesMatchForLegacyAccess('campus-a', 'campus-b')).toBe(false);
  });

  it('denies appointment access when the appointment or either participant belongs to another campus', async () => {
    mocks.prisma.appointments.findUnique.mockResolvedValue({ campusId: 'campus-a', userId: 'student-a', counselorId: 'counselor-a' });
    mocks.prisma.users.findUnique.mockResolvedValue({ campusId: 'campus-a' });
    mocks.prisma.counselors.findUnique.mockResolvedValue({ campusId: 'campus-a' });

    await expect(canAccessAppointmentWithinCampus('appointment-a', 'campus-a')).resolves.toBe(true);
    await expect(canAccessAppointmentWithinCampus('appointment-a', 'campus-b')).resolves.toBe(false);

    mocks.prisma.counselors.findUnique.mockResolvedValue({ campusId: 'campus-b' });
    await expect(canAccessAppointmentWithinCampus('appointment-a', 'campus-a')).resolves.toBe(false);
  });

  it('keeps unassigned legacy appointments outside tenant access', async () => {
    mocks.prisma.appointments.findUnique.mockResolvedValue({ campusId: null, userId: 'legacy-student', counselorId: 'legacy-counselor' });
    mocks.prisma.users.findUnique.mockResolvedValue({ campusId: null });
    mocks.prisma.counselors.findUnique.mockResolvedValue({ campusId: null });

    await expect(canAccessAppointmentWithinCampus('legacy-appointment')).resolves.toBe(true);
    await expect(canAccessAppointmentWithinCampus('legacy-appointment', 'campus-a')).resolves.toBe(false);
  });

  it('fails closed for inactive or disabled-campus AI while preserving unassigned accounts', async () => {
    mocks.prisma.users.findUnique.mockResolvedValue({ campusId: 'campus-a' });
    mocks.prisma.campuses.findUnique.mockResolvedValue({ isActive: true, aiSettings: '{"enabled":false}' });
    await expect(isCampusAiEnabledForUser('student-a')).resolves.toBe(false);

    mocks.prisma.campuses.findUnique.mockResolvedValue({ isActive: false, aiSettings: '{"enabled":true}' });
    await expect(isCampusAiEnabledForUser('student-a')).resolves.toBe(false);

    mocks.prisma.users.findUnique.mockResolvedValue({ campusId: null });
    await expect(isCampusAiEnabledForUser('legacy-student')).resolves.toBe(true);
  });

  it('records only opt-in pseudonymous events and suppresses small cohorts', async () => {
    mocks.consentService.getUserConsents.mockResolvedValue({ consentForAnalytics: false });
    mocks.prisma.users.findUnique.mockResolvedValue({ campusId: 'campus-a' });
    mocks.prisma.campuses.findUnique.mockResolvedValue({ isActive: true });
    await recordCampusProductEvent('student-a', 'campus-a', 'activation_completed');
    expect(mocks.prisma.productAnalyticsEvents.create).not.toHaveBeenCalled();

    mocks.consentService.getUserConsents.mockResolvedValue({ consentForAnalytics: true });
    await recordCampusProductEvent('student-a', 'campus-a', 'activation_completed');
    const write = mocks.prisma.productAnalyticsEvents.create.mock.calls[0][0].data;
    expect(write).toMatchObject({ campusId: 'campus-a', eventType: 'activation_completed' });
    expect(write.actorHash).toBe(createCampusAnalyticsActorHash('student-a', 'campus-a'));
    expect(write.actorHash).not.toContain('student-a');
    expect(write).not.toHaveProperty('userId');

    expect(toSuppressedCampusMetric('repeat_visit', 'Kunjungan kembali', 9, 40)).toMatchObject({ suppressed: true, uniqueActors: null, eventCount: null });
    expect(toSuppressedCampusMetric('repeat_visit', 'Kunjungan kembali', 10, 40)).toMatchObject({ suppressed: false, uniqueActors: 10, eventCount: 40 });
  });
});
