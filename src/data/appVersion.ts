import { safeLocalStorage } from '../lib/storage';

export const CURRENT_APP_VERSION = 'v3.3.0';
export const LAST_UPDATED_DATE = '19 September 2026';

const STORAGE_LAST_SEEN_VERSION_KEY = 'ruangtenang_last_seen_version';

export function isNewUpdateAvailable(): boolean {
  try {
    const lastSeen = safeLocalStorage.getItem(STORAGE_LAST_SEEN_VERSION_KEY);
    return lastSeen !== CURRENT_APP_VERSION;
  } catch {
    return false;
  }
}

export function markUpdateAsSeen(): void {
  try {
    safeLocalStorage.setItem(STORAGE_LAST_SEEN_VERSION_KEY, CURRENT_APP_VERSION);
  } catch {
    // ignore
  }
}
