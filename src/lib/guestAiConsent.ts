import { safeSessionStorage } from './storage';

export const GUEST_AI_CONSENT_SESSION_KEY = 'rt_guest_ai_consent';
export const GUEST_AI_CONSENT_CHANGED_EVENT = 'rt-guest-ai-consent-changed';

export function readGuestAiConsent(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = safeSessionStorage.getItem(GUEST_AI_CONSENT_SESSION_KEY);
    if (stored === null) return true;
    return stored === 'true';
  } catch {
    return true;
  }
}

export function writeGuestAiConsent(granted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    safeSessionStorage.setItem(GUEST_AI_CONSENT_SESSION_KEY, granted ? 'true' : 'false');
  } catch {
    // Callers keep the current choice in memory via safeSessionStorage.
  }
  window.dispatchEvent(new Event(GUEST_AI_CONSENT_CHANGED_EVENT));
}

