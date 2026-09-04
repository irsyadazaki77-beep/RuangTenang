# SOP & Dokumentasi Pemeliharaan Harian (Daily Maintenance SOP)

## 1. Ikhtisar (Overview)
Pemeliharaan harian (*Daily Maintenance*) pada sistem **RuangTenang** dirancang untuk menjamin stabilitas, ketersediaan, privasi data pengguna (*compliance* UU PDP), dan integritas kriptografi secara berkelanjutan.

Pemeliharaan harian dijalankan secara otomatis setiap hari pada pukul **02:00 WIB** melalui penjadwal Cron berbasis `DistributedLock` untuk memastikan keamanan eksekusi pada lingkungan multi-instance (Cloud Run / clustered pods). Pemeliharaan juga dapat dipicu secara manual baik melalui antarmuka perintah (CLI) maupun melalui API Admin yang terotentikasi.

---

## 2. Cakupan Pemeliharaan (Maintenance Scope)

Rutinitas pemeliharaan mencakup 6 pilar operasional:

### Pilar 1: Pemeriksaan Konektivitas & Latensi Basis Data (*Health Check*)
- Pengujian *ping* langsung ke basis data (`SELECT 1`) untuk memverifikasi kesiapan *connection pool*.
- Pencatatan metrik latensi kueri basis data.
- Pemeriksaan penggunaan memori proses Node.js (*Heap Memory Allocation*).

### Pilar 2: Verifikasi Integritas Kriptografi (*Cryptographic Verification*)
- Pengujian siklus simetris AES-256-GCM (*authenticated encryption & decryption*).
- Validasi versi kunci aktif (*Key Versioning*, default: `v1`).
- Pengujian integritas tag otentikasi cipher guna mendeteksi manipulasi data.

### Pilar 3: Pencadangan Terotomatisasi & Rotasi Berkas (*Automated Backup & Pruning*)
- Pembuatan *snapshot backup* instan basis data (PostgreSQL `pg_dump` atau berkas SQLite) ke direktori `backups/`.
- Rotasi berkas cadangan otomatis: berkas cadangan yang berusia lebih dari 7 hari (> 7 days) dipangkas (*pruned*) guna mencegah pemborosan ruang penyimpanan.

### Pilar 4: Pembersihan Retensi Data Sesuai Privasi (*Data Retention Cleanup*)
- Pembersihan rekaman catatan suasana hati (*Mood Logs*) yang melampaui batas retensi preferensi pengguna.
- Pembersihan berkas skrining krisis (*PHQ-9 & GAD-7*) yang telah diselesaikan dan melewati masa retensi.
- Pembersihan jadwal janji temu (*Appointments*) dengan status selesai atau dibatalkan yang melewati masa retensi.
- Pembersihan percakapan sesi tamu sementara (*Guest Chats*) yang berusia lebih dari 24 jam.

### Pilar 5: Pembersihan Sesi Kedaluwarsa & Kunci Idempotensi (*Hygiene Purge*)
- Penghapusan entri sesi login inaktif (*UserSession*) yang tidak aktif selama lebih dari 30 hari.
- Pembersihan catatan idempotensi kedaluwarsa (*IdempotencyRecord*) pada basis data.
- Pembersihan counter *rate-limiting* terdistribusi dan timer cooldown SOS (*DistributedState*) yang telah lewat waktu.
- Pembebasan kunci terdistribusi (*DistributedLock*) yang telah kedaluwarsa.

### Pilar 6: Pencatatan Audit & Telemetri (*Audit & Telemetry Logging*)
- Pencatatan seluruh hasil eksekusi ke dalam tabel `AuditLogs` dengan peran `system` atau `admin`.
- Pencatatan rekaman pemantauan ke dalam `TelemetryLogs` dengan status `SUCCESS` atau `WARNING` beserta latensi eksekusi.

---

## 3. Cara Menjalankan Pemeliharaan

### A. Melalui Perintah Terminal (CLI)
Gunakan skrip terdaftar pada `package.json`:
```bash
npm run maintenance:daily
```
Output konsol akan menampilkan laporan rinci per langkah dan ringkasan status akhir (`SUCCESS` / `WARNING` / `FAILED`).

### B. Melalui API Endpoint Admin
Administrator yang terotentikasi dapat memicu pemeliharaan secara programmatic:
```http
POST /api/v1/admin/maintenance/daily
Authorization: Bearer <ADMIN_JWT_TOKEN>
```
**Contoh Respons:**
```json
{
  "success": true,
  "message": "Pemeliharaan harian sistem telah selesai dilaksanakan.",
  "report": {
    "timestamp": "2026-09-04T08:46:09.377Z",
    "executionDurationMs": 54,
    "status": "SUCCESS",
    "systemHealth": {
      "database": "CONNECTED",
      "dbLatencyMs": 37,
      "memoryUsageMb": 142.5,
      "nodeVersion": "v22.x",
      "environment": "development"
    },
    "cryptography": {
      "activeKeyVersion": "v1",
      "testEncryptionOk": true
    },
    "backup": {
      "success": true,
      "provider": "sqlite",
      "backupPath": "/app/applet/backups/sqlite-backup-2026-09-04T08-46-09-418Z.db",
      "sizeBytes": 471040,
      "prunedOldBackupsCount": 0
    },
    "retention": {
      "success": true,
      "totalCleaned": 0,
      "moodLogsDeleted": 0,
      "screeningsDeleted": 0,
      "appointmentsDeleted": 0,
      "chatsDeleted": 0,
      "temporaryChatsDeleted": 0
    },
    "hygienePurge": {
      "expiredSessionsCleaned": 0,
      "expiredIdempotencyRecordsCleaned": 0,
      "expiredDistributedStatesCleaned": 0,
      "expiredLocksCleaned": 0
    },
    "summary": "Pemeliharaan harian selesai dengan status SUCCESS dalam 54ms."
  }
}
```

### C. Melalui Penjadwal Otomatis (Cron Job)
Terdaftar pada `server/jobs/cronRetention.ts` dan dieksekusi setiap hari pukul **02:00 WIB** dengan zona waktu `Asia/Jakarta`.
Multi-instance guard memastikan hanya 1 instance yang mengeksekusi tugas pada satu waktu dengan sewa kunci 3600 detik.

---

## 4. Rangkuman Verifikasi Pengujian (Test Verification)
- **Security Test Suite**: 9 berkas, 66 pengujian passed (100%).
- **Unit Test Suite**: 15 berkas, 45 pengujian passed (100%).
- **Integration Test Suite**: 17 berkas, 109 pengujian passed (100%).
- **Linting Codebase**: 0 error.
- **Vite & Server Compilation**: Berhasil dikompilasi ke `dist/server.cjs`.
