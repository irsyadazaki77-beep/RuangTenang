import cron from 'node-cron';
import { retentionService } from '../services/retentionService.js';
import { DistributedLockService } from '../services/distributedLockService.js';

// Jalankan otomatis setiap pukul 02:00 WIB
export function initRetentionCronJobs() {
  cron.schedule(
    '0 2 * * *',
    async () => {
      console.log('[CRON] Menjalankan pembersihan data kedaluwarsa sesuai preferensi retensi...');
      try {
        const lockRes = await DistributedLockService.withLock(
          'cron:retention-cleanup-job',
          3600, // 1 hour lease
          async () => {
            return await retentionService.runRetentionCleanup();
          }
        );

        if (!lockRes.executed) {
          console.log(`[CRON] Pembersihan retensi dilewati pada instance ini: ${lockRes.reason}`);
          return;
        }

        const result = lockRes.result!;
        console.log(
          `[CRON] Pembersihan retensi selesai: ${result.totalCleaned} record dibersihkan (Mood: ${result.moodLogsDeleted}, Skrining: ${result.screeningsDeleted}, Janji: ${result.appointmentsDeleted}, Chat: ${result.chatsDeleted}).`
        );
      } catch (error) {
        console.error('[CRON] Gagal menjalankan pembersihan retensi data:', error);
      }
    },
    {
      timezone: 'Asia/Jakarta'
    }
  );
  console.log('[CRON] Job Retention Database telah diinisialisasi (Jadwal: 02:00 WIB, Multi-Instance Safe).');
}


