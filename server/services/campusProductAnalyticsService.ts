import { createHmac, randomUUID } from 'node:crypto';
import { prisma } from '../database.js';
import { consentService } from './consentService.js';

export const CAMPUS_PRODUCT_EVENT_TYPES = [
  'activation_completed',
  'repeat_visit',
  'referral_started',
  'referral_completed',
  'workflow_failed'
] as const;

export type CampusProductEventType = typeof CAMPUS_PRODUCT_EVENT_TYPES[number];

export function toSuppressedCampusMetric(eventType: CampusProductEventType, label: string, uniqueActors: number, eventCount: number, minimum = 10) {
  const suppressed = uniqueActors < minimum;
  return {
    eventType,
    label,
    uniqueActors: suppressed ? null : uniqueActors,
    eventCount: suppressed ? null : eventCount,
    suppressed
  };
}

export function createCampusAnalyticsActorHash(userId: string, campusId: string): string | null {
  const secret = process.env.BLIND_INDEX_SECRET;
  if (!secret || secret.length < 32) return null;
  const analyticsKey = createHmac('sha256', secret).update('ruangtenang:campus-analytics:v1').digest();
  return createHmac('sha256', analyticsKey).update(`${campusId}:${userId}`).digest('hex');
}

export async function recordCampusProductEvent(
  userId: string | undefined,
  campusId: string | undefined,
  eventType: CampusProductEventType
): Promise<void> {
  if (!userId || !campusId) return;
  try {
    const [consent, user, campus] = await Promise.all([
      consentService.getUserConsents(userId),
      prisma.users.findUnique({ where: { id: userId }, select: { campusId: true } }),
      prisma.campuses.findUnique({ where: { id: campusId }, select: { isActive: true } })
    ]);
    if (consent.consentForAnalytics !== true || user?.campusId !== campusId || !campus?.isActive) return;
    const actorHash = createCampusAnalyticsActorHash(userId, campusId);
    if (!actorHash) return;
    await prisma.productAnalyticsEvents.create({
      data: { id: randomUUID(), campusId, actorHash, eventType }
    });
  } catch {
    console.warn('[CAMPUS_ANALYTICS] EVENT_WRITE_FAILED');
  }
}
