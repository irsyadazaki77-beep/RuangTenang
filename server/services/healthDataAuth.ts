import { prisma } from '../database.js';
import { consentService } from './consentService.js';

export async function canAccessHealthData(
  requestingUser: { userId: string; role: string; name: string; email: string },
  targetUserId: string | undefined,
  purpose = 'GENERAL_HEALTH_ACCESS'
): Promise<boolean> {
  let resolvedTargetUserId = targetUserId;
  if (!resolvedTargetUserId && requestingUser.role === 'mahasiswa') {
    resolvedTargetUserId = requestingUser.userId;
  }

  if (!resolvedTargetUserId) {
    // Deny-by-default if no specific target is provided
    if (requestingUser.role === 'admin') {
      return true;
    }
    return false;
  }

  if (requestingUser.role === 'admin') {
    // Admin access must be purpose-bound
    if (!purpose || purpose.trim() === '' || purpose === 'GENERAL_HEALTH_ACCESS') {
      return false;
    }
    return true;
  }

  if (requestingUser.role === 'mahasiswa') {
    return requestingUser.userId === resolvedTargetUserId;
  }

  if (requestingUser.role === 'konselor') {
    // 1. Check student sharing/summary consent
    const canShare = await consentService.canShareWithCounselor(resolvedTargetUserId);
    if (!canShare) {
      return false;
    }

    // 2. Check Active Counselor Assignment (appointment exists in database)
    const counselor = await prisma.counselors.findFirst({
      where: { userId: requestingUser.userId }
    });
    if (!counselor) {
      return false;
    }

    const appointment = await prisma.appointments.findFirst({
      where: {
        counselorId: counselor.id,
        userId: resolvedTargetUserId
      }
    });
    if (!appointment) {
      return false;
    }

    // 3. Authorized Purpose check
    const authorizedPurposes = [
      'VIEW_SCREENING',
      'VIEW_APPOINTMENT',
      'VIEW_CONSULTATION_NOTE',
      'Evaluasi Kesehatan Mental'
    ];
    if (!authorizedPurposes.includes(purpose)) {
      return false;
    }

    return true;
  }

  return false;
}
