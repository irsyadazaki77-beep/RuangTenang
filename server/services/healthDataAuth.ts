import { prisma } from '../database.js';
import { consentService } from './consentService.js';
import { normalizeRole } from '../middleware/auth.js';

export interface CanAccessHealthDataOptions {
  appointmentId?: string;
  requireCounselorAssignment?: boolean;
}

export async function canAccessHealthData(
  requestingUser: { userId: string; role: string; name?: string; email?: string },
  targetUserId: string | undefined,
  purpose = 'GENERAL_HEALTH_ACCESS',
  options?: CanAccessHealthDataOptions
): Promise<boolean> {
  const role = normalizeRole(requestingUser?.role);
  const isStudent = role === 'mahasiswa';
  const isStaff = role === 'konselor' || role === 'peer_counselor';

  let resolvedTargetUserId = targetUserId;
  if (!resolvedTargetUserId && isStudent) {
    resolvedTargetUserId = requestingUser.userId;
  }

  if (!resolvedTargetUserId) {
    // Deny-by-default if no specific target is provided
    return false;
  }

  if (isStudent) {
    return requestingUser.userId === resolvedTargetUserId;
  }

  if (isStaff) {
    // Clinical details require the student's explicit sharing consent. Summary consent
    // does not authorize access to screening scores, risk indicators, or SOAP content.
    const consent = await consentService.getUserConsents(resolvedTargetUserId);
    const canShare = consent.consentForCounselorSharing;
    if (!canShare) {
      return false;
    }

    // 2. Check Active Counselor Profile
    const counselor = await prisma.counselors.findFirst({
      where: { userId: requestingUser.userId }
    });
    if (!counselor) {
      return false;
    }

    // 3. Check Active Counselor Assignment / Care Relationship (appointment exists)
    const apptWhere: { counselorId: string; userId: string; id?: string; status: { notIn: string[] } } = {
      counselorId: counselor.id,
      userId: resolvedTargetUserId,
      status: { notIn: ['CANCELLED', 'REJECTED'] }
    };
    if (options?.appointmentId) {
      apptWhere.id = options.appointmentId;
    }

    const appointment = await prisma.appointments.findFirst({
      where: apptWhere
    });
    if (!appointment) {
      return false;
    }

    // 4. Authorized Purpose check
    const authorizedPurposes = [
      'VIEW_SCREENING',
      'VIEW_APPOINTMENT',
      'VIEW_CONSULTATION_NOTE',
      'CREATE_SOAP_NOTE',
      'UPDATE_SOAP_NOTE',
      'DELETE_SOAP_NOTE',
      'UPDATE_SCREENING',
      'Evaluasi Kesehatan Mental',
      'GENERAL_HEALTH_ACCESS'
    ];
    if (!authorizedPurposes.includes(purpose)) {
      return false;
    }

    return true;
  }

  return false;
}

/**
 * Returns list of student userIds assigned to the counselor who have granted consent for health data sharing.
 */
export async function getAssignedStudentUserIds(counselorUserId: string): Promise<string[]> {
  const account = await prisma.users.findUnique({
    where: { id: counselorUserId },
    select: { role: true }
  });
  const role = normalizeRole(account?.role);
  if (role !== 'konselor' && role !== 'peer_counselor') return [];

  const counselor = await prisma.counselors.findFirst({
    where: { userId: counselorUserId }
  });
  if (!counselor) return [];

  const appointments = await prisma.appointments.findMany({
    where: {
      counselorId: counselor.id,
      status: { notIn: ['CANCELLED', 'REJECTED'] }
    },
    select: { userId: true }
  });

  const rawUserIds = Array.from(new Set(appointments.map(a => a.userId).filter(Boolean))) as string[];
  const validUserIds: string[] = [];

  for (const sId of rawUserIds) {
    const consent = await consentService.getUserConsents(sId);
    if (consent.consentForCounselorSharing) {
      validUserIds.push(sId);
    }
  }

  return validUserIds;
}
