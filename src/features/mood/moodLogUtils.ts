const UNSYNCED_MOOD_LOG_PREFIXES = ['offline-', 'pending-'];

export function isMoodLogPendingSync(id: string): boolean {
  return UNSYNCED_MOOD_LOG_PREFIXES.some(prefix => id.startsWith(prefix));
}

/** Only a request that was never sent because the browser was offline can be safely cancelled locally. */
export function getCancelableOfflineMoodKey(id: string): string | null {
  if (!id.startsWith('offline-')) return null;
  const key = id.slice('offline-'.length);
  return /^[A-Za-z0-9._:-]{1,100}$/.test(key) ? key : null;
}
