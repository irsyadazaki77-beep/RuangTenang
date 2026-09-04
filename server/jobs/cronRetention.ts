import cron from 'node-cron';
import { executeDailyMaintenance } from '../scripts/dailyMaintenance.js';
import { DistributedLockService } from '../services/distributedLockService.js';

// Jalankan otomatis setiap pukul 02:00 WIB
export function initRetentionCronJobs() {
  cron.schedule(
    '0 2 * * *',
    async () => {
      console.log('[CRON] Menjalankan pemeliharaan harian sistem & pembersihan retensi data (02:00 WIB)...');
      try {
        const lockRes = await DistributedLockService.withLock(
          'cron:daily-maintenance-job',
          3600, // 1 hour lease
          async () => {
            return await executeDailyMaintenance();
          }
        );

        if (!lockRes.executed) {
          console.log(`[CRON] Pemeliharaan harian dilewati pada instance ini: ${lockRes.reason}`);
          return;
        }

        const result = lockRes.result!;
        console.log(
          `[CRON] Pemeliharaan harian selesai (${result.status}): ${result.summary}`
        );
      } catch (error) {
        console.error('[CRON] Gagal menjalankan pemeliharaan harian:', error);
      }
    },
    {
      timezone: 'Asia/Jakarta'
    }
  );
  console.log('[CRON] Job Pemeliharaan Harian & Retensi Database telah diinisialisasi (Jadwal: 02:00 WIB, Multi-Instance Safe).');
}


