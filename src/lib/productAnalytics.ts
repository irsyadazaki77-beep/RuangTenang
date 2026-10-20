import { apiClient } from './apiClient';

export type ProductEventType = 'activation_completed' | 'repeat_visit' | 'referral_started' | 'workflow_failed';

/** Sends only an allow-listed event code; the server drops it without explicit analytics consent. */
export function trackProductEvent(eventType: ProductEventType): void {
  void apiClient.post('/api/v1/analytics/events', { eventType }).catch(() => undefined);
}
