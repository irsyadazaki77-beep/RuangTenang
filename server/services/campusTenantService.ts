import { prisma } from '../database.js';

/** Keep pre-tenant records usable together while preventing a tenant-bound record
 * from being paired with an unassigned or differently assigned account. */
export function campusesMatchForLegacyAccess(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left && !right) return true;
  return Boolean(left && right && left === right);
}

export async function isCampusAiEnabledForUser(userId: string | undefined): Promise<boolean> {
  if (!userId || userId === 'guest') return true;
  const user = await prisma.users.findUnique({ where: { id: userId }, select: { campusId: true } });
  if (!user?.campusId) return true;
  const campus = await prisma.campuses.findUnique({ where: { id: user.campusId }, select: { isActive: true, aiSettings: true } });
  if (!campus?.isActive) return false;
  try {
    const settings = JSON.parse(campus.aiSettings) as { enabled?: boolean };
    return settings.enabled !== false;
  } catch {
    return false;
  }
}

export async function canAccessAppointmentWithinCampus(appointmentId: string, campusId?: string): Promise<boolean> {
  const appointment = await prisma.appointments.findUnique({
    where: { id: appointmentId },
    select: { campusId: true, userId: true, counselorId: true }
  });
  if (!appointment) return false;

  const [student, counselor] = await Promise.all([
    appointment.userId
      ? prisma.users.findUnique({ where: { id: appointment.userId }, select: { campusId: true } })
      : Promise.resolve(null),
    prisma.counselors.findUnique({ where: { id: appointment.counselorId }, select: { campusId: true } })
  ]);
  const studentCampus = student?.campusId;
  const counselorCampus = counselor?.campusId;
  if (!campusesMatchForLegacyAccess(studentCampus, counselorCampus)) return false;

  if (campusId && appointment.campusId !== campusId) return false;
  if (!campusId && (appointment.campusId || studentCampus || counselorCampus)) return false;
  return true;
}
