import { useEffect } from 'react';
import { apiClient } from '../../lib/apiClient';
import { clientDb } from '../../lib/clientDb';

type Toast = (message: string, type?: 'success' | 'error' | 'info' | 'warning', title?: string) => void;

export function useOfflineSync(userId: string | undefined, onSynced: () => void, showToast: Toast) {
  useEffect(() => {
    let isCancelled = false;
    const notifyOffline = () => {
      showToast('Koneksi terputus. Menggunakan Modus Offline / Hemat Data.', 'warning', 'Mode Offline');
    };
    const syncOutbox = async () => {
      try {
        const synced = await clientDb.processOutboxQueue(apiClient);
        if (synced > 0 && !isCancelled) {
          showToast(`Berhasil menyinkronkan ${synced} data offline ke server`, 'success', 'Sinkronisasi Selesai');
          onSynced();
        }
      } catch (error) {
        console.warn('Background sync error:', error);
      }
    };

    window.addEventListener('online', syncOutbox);
    window.addEventListener('offline', notifyOffline);
    if (navigator.onLine) void syncOutbox();
    return () => {
      isCancelled = true;
      window.removeEventListener('online', syncOutbox);
      window.removeEventListener('offline', notifyOffline);
    };
  }, [userId, onSynced, showToast]);
}
