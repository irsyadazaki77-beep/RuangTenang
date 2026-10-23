export const PERFORMANCE_TELEMETRY_CONSENT_EVENT = 'rt-performance-telemetry-consent';

export function notifyPerformanceTelemetryConsent(consented: boolean) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PERFORMANCE_TELEMETRY_CONSENT_EVENT, { detail: consented }));
}
