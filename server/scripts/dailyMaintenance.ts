/**
 * RuangTenang Kampus - Industrial Daily Maintenance Engine (Pemeliharaan Harian)
 *
 * Comprehensive operations routine including:
 * 1. Database Connectivity & Readiness Check (Ping & Latency)
 * 2. Automated Snapshot Backup (Postgres / SQLite) with retention pruning (> 7 days)
 * 3. Privacy & Data Retention Cleanup (Mood, Screenings, Appointments, Guest Chats)
 * 4. Stale Session, Expired Auth Token & Lock Purge
 * 5. Cryptographic Health & AES-256-GCM Verification
 * 6. Audit & Telemetry Logging
 */

import fs from 'fs';
import path from 'path';
import { prisma, serverDb } from '../database.js';
import { runBackup } from './backupTool.js';
import { retentionService, RetentionCleanupResult } from '../services/retentionService.js';
import { encryptionService } from '../services/encryptionService.js';
import { DistributedLockService } from '../services/distributedLockService.js';

export interface DailyMaintenanceReport {
  timestamp: string;
  executionDurationMs: number;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  systemHealth: {
    database: 'CONNECTED' | 'DISCONNECTED';
    dbLatencyMs: number;
    memoryUsageMb: number;
    nodeVersion: string;
    environment: string;
  };
  cryptography: {
    activeKeyVersion: string;
    testEncryptionOk: boolean;
  };
  backup: {
    success: boolean;
    provider: string;
    backupPath?: string;
    sizeBytes?: number;
    prunedOldBackupsCount: number;
    error?: string;
  };
  retention: RetentionCleanupResult & {
    error?: string;
  };
  hygienePurge: {
    expiredSessionsCleaned: number;
    expiredIdempotencyRecordsCleaned: number;
    expiredDistributedStatesCleaned: number;
    expiredLocksCleaned: number;
  };
  summary: string;
}

export async function executeDailyMaintenance(): Promise<DailyMaintenanceReport> {
  const startTime = Date.now();
  const reportTimestamp = new Date().toISOString();
  console.log(`\n===============================================================`);
  console.log(`[PEMELIHARAAN HARIAN] Memulai Rutinitas Pemeliharaan: ${reportTimestamp}`);
  console.log(`===============================================================\n`);

  let dbStatus: 'CONNECTED' | 'DISCONNECTED' = 'DISCONNECTED';
  let dbLatencyMs = -1;

  // 1. Health & Database Connectivity Check
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
    dbStatus = 'CONNECTED';
    console.log(`[1/6 HEALTH CHECK] Database terkoneksi normal (Latensi: ${dbLatencyMs}ms).`);
  } catch (err: any) {
    console.error(`[1/6 HEALTH CHECK FAIL] Koneksi database bermasalah:`, err.message);
  }

  // 2. Cryptographic Health Check
  let testEncryptionOk = false;
  const currentKeyVersion = encryptionService.getCurrentKeyVersion();
  try {
    const testSecret = `health-check-probe-${Date.now()}`;
    const cipher = encryptionService.encryptSensitive(testSecret);
    const plain = encryptionService.decryptSensitive(cipher);
    if (plain === testSecret) {
      testEncryptionOk = true;
      console.log(`[2/6 CRYPTO VERIFICATION] AES-256-GCM & Key Version '${currentKeyVersion}' terverifikasi integritasnya.`);
    } else {
      console.error(`[2/6 CRYPTO FAIL] Enkripsi/Dekripsi menghasilkan nilai yang tidak konsisten.`);
    }
  } catch (cryptoErr: any) {
    console.error(`[2/6 CRYPTO FAIL] Pengujian cipher gagal:`, cryptoErr.message);
  }

  // 3. Automated Database Backup & Backup Pruning
  const backupResult: DailyMaintenanceReport['backup'] = {
    success: false,
    provider: 'unknown',
    prunedOldBackupsCount: 0
  };

  try {
    console.log(`[3/6 BACKUP ENGINE] Menjalankan pencadangan basis data...`);
    const backupData: any = await runBackup();
    backupResult.success = true;
    backupResult.provider = backupData?.provider || 'default';
    backupResult.backupPath = backupData?.backupPath;
    backupResult.sizeBytes = backupData?.sizeBytes;

    // Prune backups older than 7 days
    const backupDir = path.resolve(process.cwd(), 'backups');
    if (fs.existsSync(backupDir)) {
      const nowMs = Date.now();
      const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
      const files = fs.readdirSync(backupDir);
      for (const file of files) {
        const fullPath = path.join(backupDir, file);
        try {
          const stats = fs.statSync(fullPath);
          if (nowMs - stats.mtimeMs > maxAgeMs) {
            fs.unlinkSync(fullPath);
            backupResult.prunedOldBackupsCount++;
            console.log(`[3/6 BACKUP PRUNING] Menghapus cadangan lama (>7 hari): ${file}`);
          }
        } catch {
          // ignore file stat errors
        }
      }
    }
    console.log(`[3/6 BACKUP ENGINE] Pencadangan sukses (${backupResult.sizeBytes ?? 'N/A'} bytes). File lama dibersihkan: ${backupResult.prunedOldBackupsCount}.`);
  } catch (backupErr: any) {
    backupResult.error = backupErr.message;
    console.error(`[3/6 BACKUP FAIL] Kegagalan backup data:`, backupErr.message);
  }

  // 4. Data Retention Cleanup (Privacy & Compliance)
  let retentionResult: RetentionCleanupResult = {
    success: false,
    totalCleaned: 0,
    moodLogsDeleted: 0,
    screeningsDeleted: 0,
    appointmentsDeleted: 0,
    chatsDeleted: 0,
    temporaryChatsDeleted: 0,
    timestamp: reportTimestamp
  };

  try {
    console.log(`[4/6 DATA RETENTION] Menjalankan pembersihan retensi data pengguna dan chat tamu...`);
    retentionResult = await retentionService.runRetentionCleanup();
    console.log(
      `[4/6 DATA RETENTION] Selesai: ${retentionResult.totalCleaned} rekaman dibersihkan ` +
      `(Mood: ${retentionResult.moodLogsDeleted}, Skrining: ${retentionResult.screeningsDeleted}, ` +
      `Janji Temu: ${retentionResult.appointmentsDeleted}, Chat Tamu: ${retentionResult.temporaryChatsDeleted}).`
    );
  } catch (retErr: any) {
    console.error(`[4/6 DATA RETENTION FAIL] Pembersihan retensi data gagal:`, retErr.message);
  }

  // 5. Hygiene Purge (Expired Sessions, Idempotency Records, Distributed States & Locks)
  const hygiene = {
    expiredSessionsCleaned: 0,
    expiredIdempotencyRecordsCleaned: 0,
    expiredDistributedStatesCleaned: 0,
    expiredLocksCleaned: 0
  };

  try {
    console.log(`[5/6 HYGIENE PURGE] Membersihkan sesi kedaluwarsa, kunci idempotensi lama, dan status terdistribusi...`);
    const now = new Date();
    const sessionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days inactive

    // Clean inactive sessions
    const delSessions = await prisma.userSession.deleteMany({
      where: { lastActive: { lt: sessionCutoff } }
    });
    hygiene.expiredSessionsCleaned = delSessions.count;

    // Clean expired idempotency records
    const delIdempotency = await prisma.idempotencyRecord.deleteMany({
      where: { expiresAt: { lt: now } }
    });
    hygiene.expiredIdempotencyRecordsCleaned = delIdempotency.count;

    // Clean expired distributed states (rate limit counters, cooling timers)
    const delStates = await prisma.distributedState.deleteMany({
      where: { expiresAt: { lt: now } }
    });
    hygiene.expiredDistributedStatesCleaned = delStates.count;

    // Clean expired distributed locks
    const delLocks = await prisma.distributedLock.deleteMany({
      where: { expiresAt: { lt: now } }
    });
    hygiene.expiredLocksCleaned = delLocks.count;

    console.log(
      `[5/6 HYGIENE PURGE] Selesai: ` +
      `${hygiene.expiredSessionsCleaned} sesi inaktif, ` +
      `${hygiene.expiredIdempotencyRecordsCleaned} record idempotensi, ` +
      `${hygiene.expiredDistributedStatesCleaned} state terdistribusi, ` +
      `${hygiene.expiredLocksCleaned} lock lama dibersihkan.`
    );
  } catch (hygieneErr: any) {
    console.warn(`[5/6 HYGIENE PURGE NOTE] Beberapa pembersihan non-kritis dilewati:`, hygieneErr.message);
  }

  const durationMs = Date.now() - startTime;
  const memUsageMb = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;

  const isHealthy = dbStatus === 'CONNECTED' && testEncryptionOk && (backupResult.success || process.env.NODE_ENV !== 'production');
  const finalStatus: DailyMaintenanceReport['status'] = isHealthy ? 'SUCCESS' : 'WARNING';

  // 6. Audit & Telemetry Logging
  try {
    await serverDb.logAudit(
      'DAILY_MAINTENANCE_RUN',
      `Pemeliharaan harian sistem dieksekusi. Status: ${finalStatus}. Total dibersihkan: ${retentionResult.totalCleaned + hygiene.expiredSessionsCleaned + hygiene.expiredIdempotencyRecordsCleaned}. Latensi DB: ${dbLatencyMs}ms. Durasi: ${durationMs}ms.`,
      'system'
    );

    await serverDb.addTelemetryLog({
      service: 'Database Sync',
      status: finalStatus === 'SUCCESS' ? 'SUCCESS' : 'WARNING',
      latencyMs: Math.min(60000, durationMs),
      details: `Pemeliharaan harian: DB ${dbStatus} (${dbLatencyMs}ms), ${retentionResult.totalCleaned} record retensi dibersihkan.`,
      retryAttempt: 0
    });
  } catch (logErr) {
    console.warn('[6/6 LOGGING] Perekaman audit pemeliharaan non-fatal:', logErr);
  }

  const report: DailyMaintenanceReport = {
    timestamp: reportTimestamp,
    executionDurationMs: durationMs,
    status: finalStatus,
    systemHealth: {
      database: dbStatus,
      dbLatencyMs,
      memoryUsageMb: memUsageMb,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    },
    cryptography: {
      activeKeyVersion: currentKeyVersion,
      testEncryptionOk
    },
    backup: backupResult,
    retention: retentionResult,
    hygienePurge: hygiene,
    summary: `Pemeliharaan harian selesai dengan status ${finalStatus} dalam ${durationMs}ms. Database: ${dbStatus}, Backup: ${backupResult.success ? 'Berhasil' : 'Gagal'}, Retensi: ${retentionResult.totalCleaned} record dibersihkan.`
  };

  console.log(`\n===============================================================`);
  console.log(`[PEMELIHARAAN HARIAN SELESAI] Status: ${report.status} (${durationMs}ms)`);
  console.log(`Ringkasan: ${report.summary}`);
  console.log(`===============================================================\n`);

  return report;
}

// Standalone execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  executeDailyMaintenance()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[FATAL] Pemeliharaan harian mengalami error tidak terduga:', err);
      process.exit(1);
    });
}
