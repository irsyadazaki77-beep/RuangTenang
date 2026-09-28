import { prisma } from '../database.js';
import { consentService } from './consentService.js';

export interface CanAccessHealthDataOptions {
  appointmentId?: string;
}

export async function canAccessHealthData(
  requestingUser: { userId: string; role: string; name?: string; email?: string },
  targetUserId: string | undefined,
  purpose = 'GENERAL_HEALTH_ACCESS',
  options?: CanAccessHealthDataOptions
): Promise<boolean> {
  const role = String(requestingUser?.role || '').toLowerCase();
  const isAdmin = ['admin', 'campus_admin'].includes(role);
  const isStudent = ['mahasiswa', 'student'].includes(role);
  const isCounselor = ['konselor', 'clinical_counselor', 'licensed_psychologist', 'peer_counselor'].includes(role);

  let resolvedTargetUserId = targetUserId;
  if (!resolvedTargetUserId && isStudent) {
    resolvedTargetUserId = requestingUser.userId;
  }

  if (!resolvedTargetUserId) {
    // Deny-by-default if no specific target is provided
    if (isAdmin) {
      return Boolean(purpose && purpose.trim() !== '');
    }
    return false;
  }

  if (isAdmin) {
    // Admin access must be purpose-bound
    if (!purpose || purpose.trim() === '') {
      return false;
    }
    return true;
  }

  if (isStudent) {
    return requestingUser.userId === resolvedTargetUserId;
  }

  if (isCounselor) {
    // 1. Check student sharing/summary consent (Strict Default-Deny)
    const canShare = await consentService.canShareWithCounselor(resolvedTargetUserId);
    if (!canShare) {
      return false;
    }

    // 2. Check Active Counselor Profile
    const counselor = await prisma.counselors.findFirst({
      where: {
        OR: [
          { userId: requestingUser.userId },
          { id: requestingUser.userId }
        ]
      }
    });
    if (!counselor) {
      return false;
    }

    // 3. Check Active Counselor Assignment / Care Relationship (appointment exists)
    const apptWhere: any = {
      counselorId: counselor.id,
      userId: resolvedTargetUserId
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
  const counselor = await prisma.counselors.findFirst({
    where: {
      OR: [
        { userId: counselorUserId },
        { id: counselorUserId }
      ]
    }
  });
  if (!counselor) return [];

  const appointments = await prisma.appointments.findMany({
    where: { counselorId: counselor.id },
    select: { userId: true }
  });

  const rawUserIds = Array.from(new Set(appointments.map(a => a.userId).filter(Boolean))) as string[];
  const validUserIds: string[] = [];

  for (const sId of rawUserIds) {
    const canShare = await consentService.canShareWithCounselor(sId);
    if (canShare) {
      validUserIds.push(sId);
    }
  }

  return validUserIds;
}

