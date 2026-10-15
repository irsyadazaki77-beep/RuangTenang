export const GUEST_AI_CONSENT_SESSION_KEY = 'rt_guest_ai_consent';
export const GUEST_AI_CONSENT_CHANGED_EVENT = 'rt-guest-ai-consent-changed';

export function readGuestAiConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(GUEST_AI_CONSENT_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeGuestAiConsent(granted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (granted) window.sessionStorage.setItem(GUEST_AI_CONSENT_SESSION_KEY, 'true');
    else window.sessionStorage.removeItem(GUEST_AI_CONSENT_SESSION_KEY);
  } catch {
    // Callers keep the current choice in memory; a later mount asks again.
  }
  window.dispatchEvent(new Event(GUEST_AI_CONSENT_CHANGED_EVENT));
}
