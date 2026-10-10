import { useEffect } from 'react';
import { clientDb, OUTBOX_UPDATED_EVENT } from '../../lib/clientDb';
import { getAuthSessionSnapshot } from '../../lib/authSessionLifecycle';

type Toast = (message: string, type?: 'success' | 'error' | 'info' | 'warning', title?: string) => void;

export function useOfflineSync(
  userId: string | undefined,
  sessionGeneration: number,
  authReady: boolean,
  onSynced: () => void,
  showToast: Toast,
) {
  useEffect(() => {
    if (!authReady || !userId || userId === 'guest') return;
    const activeSnapshot = { userId, generation: sessionGeneration };
    const controller = new AbortController();
    let active = true;
    let running = false;
    let retryTimer: number | undefined;

    const notifyOffline = () => showToast('Koneksi terputus. Data offline tetap tersimpan pada akun ini.', 'warning', 'Mode Offline');
    const syncOutbox = async () => {
      if (!active || running || controller.signal.aborted) return;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      retryTimer = undefined;
      const current = getAuthSessionSnapshot();
      if (current.phase !== 'authenticated' || current.userId !== userId || current.generation !== sessionGeneration) return;
      running = true;
      try {
        const result = await clientDb.processOutboxQueue(activeSnapshot, controller.signal);
        if (!active || controller.signal.aborted) return;
        if (result.synced > 0) {
          showToast(`${result.synced} data offline berhasil dikonfirmasi dan disinkronkan.`, 'success', 'Sinkronisasi selesai');
          window.dispatchEvent(new Event('ruangtenang:offline-synced'));
          if (getAuthSessionSnapshot().userId === userId && getAuthSessionSnapshot().generation === sessionGeneration) onSynced();
        }
        if (result.needsAuthentication) {
          showToast('Sinkronisasi dijeda. Silakan pulihkan sesi akun ini lalu coba lagi.', 'warning', 'Sesi diperlukan');
        } else if (result.failed > 0) {
          showToast(`${result.failed} data belum tersinkron. Data tetap tersimpan untuk dicoba kembali.`, 'warning', 'Sinkronisasi tertunda');
        }
        if (result.nextWakeAt && active && !controller.signal.aborted) {
          const delay = Math.max(250, Math.min(result.nextWakeAt - Date.now(), 2_147_000_000));
          retryTimer = window.setTimeout(() => void syncOutbox(), delay);
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          const code = error instanceof Error ? error.message : '';
          if (code === 'OFFLINE_STORAGE_UNAVAILABLE' || code.startsWith('OFFLINE_AUTH_REQUIRED')) {
            showToast('Penyimpanan offline aman tidak tersedia. Data belum disimpan.', 'error', 'Tidak dapat menyimpan offline');
          } else {
            console.warn('Offline sync stopped safely:', code || 'OFFLINE_SYNC_FAILED');
          }
        }
      } finally {
        running = false;
      }
    };

    window.addEventListener('online', syncOutbox);
    window.addEventListener('offline', notifyOffline);
    window.addEventListener(OUTBOX_UPDATED_EVENT, syncOutbox);
    if (navigator.onLine) void syncOutbox();
    return () => {
      active = false;
      controller.abort();
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      window.removeEventListener('online', syncOutbox);
      window.removeEventListener('offline', notifyOffline);
      window.removeEventListener(OUTBOX_UPDATED_EVENT, syncOutbox);
    };
  }, [userId, sessionGeneration, authReady, onSynced, showToast]);
}
