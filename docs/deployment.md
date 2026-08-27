# RuangTenang - Deployment & Hardening Documentation (FASE 9)

## 1. Skema Infrastruktur
- **Database**: PostgreSQL (Via Prisma ORM) sebagai single source of truth yang tangguh untuk multi-instance scaling. (Fallback ke SQLite diizinkan di dev).
- **Backend**: Express Server yang berjalan pada Node.js, dibundel menggunakan Esbuild ke dalam `dist/server.cjs`.
- **Frontend**: Vite + React + TailwindCSS (Client-side single page app fallback).
- **State Terdistribusi**: Menggunakan *Lease-backed Lock* di PostgreSQL (tabel `DistributedLock`) untuk sinkronisasi Background Job dan membatasi rate limit seperti tombol Darurat SOS (`DistributedStateService`). Ini memastikan bahwa menjalankan beberapa container server tidak akan memicu race-conditions atau redundansi notifikasi yang fatal.

## 2. Proses Backup & Restore

**Backup:**
Sistem dilengkapi dengan skrip Node khusus untuk backup aman yang tersentralisasi di `/server/scripts/backupTool.ts`. Skrip ini secara otomatis mendeteksi provider database yang digunakan (PostgreSQL/SQLite) melalui string koneksi.
```bash
# Menjalankan backup manual
npx tsx server/scripts/backupTool.ts
```
Hasil backup akan diletakkan di dalam folder `/backups` (format `postgres-backup-*.sql` atau `sqlite-backup-*.db`).
*Catatan: Pastikan command `pg_dump` tersedia di mesin tempat script dijalankan jika menggunakan PostgreSQL.*

**Restore:**
- **PostgreSQL**: Gunakan `pg_restore` ke database.
```bash
pg_restore -d <DATABASE_URL> -1 backups/postgres-backup-TIMESTAMP.sql
```
- **SQLite**: Copy dan timpa file ke `prisma/ruangtenang.db`.
```bash
cp backups/sqlite-backup-TIMESTAMP.db prisma/ruangtenang.db
```

## 3. CI/CD Workflow Untuk Update Schema yang Aman
Pengelolaan schema dilakukan melalui Prisma Migrate, memastikan integritas dan safe state.

1. **Pull Request Validation**: 
   - CI memeriksa *Type-checking* dan *Linting*.
   - CI memicu tes dengan SQLite in-memory / temporary DB.
2. **Schema Diff & CI Check**:
   Jika terdapat perubahan model di `schema.prisma`, developer harus membuat file migrasi secara lokal (`npx prisma migrate dev --name <nama-migrasi>`) yang kemudian direview melalui PR.
3. **Deployment**:
   Saat code digabung ke branch `main`:
   - Proses Build: `npm run build`
   - Migrasi Database (*PRE-LAUNCH*): Sebelum server `server.cjs` dinyalakan, proses CI/CD harus menjalankan command migrasi *non-interaktif*:
     ```bash
     npx prisma migrate deploy
     ```
   - Server Startup: `npm run start`

## 4. Perkiraan Maximum Scaling Dengan Container Saat Ini
Berdasarkan optimasi yang telah dilakukan:
- **Stateless HTTP Server**: Instance dapat ditingkatkan hingga puluhan node secara horizontal berkat *DistributedStateService* yang mengatasi collision Cron Job & SOS Cooldown.
- **Connection Pooling**: PostgreSQL dengan Prisma Connection Pooler menjadi bottleneck pertama. Prisma default menyokong maksimal `(num_physical_cpus * 2 + 1)` koneksi per instance. Untuk 10 instances Cloud Run, bisa memakan ~50-100 koneksi bersamaan ke Postgres.
- **Max Throughput**: 
  - API biasa dan view pagination (dibantu oleh index optimal) mampu menangani +1,000 requests/second.
  - Telemetri & Log massal ditangani dengan insert performant dan rotasi periodik otomatis oleh *Retention Job* (aman berjalan di 1 instance berkat distributed lock).
  - Skala aman optimal dengan *database instance kelas menengah (seperti 2-4 vCPU Cloud SQL)* adalah ~10-20 App Container (sekitar 500 - 1000 Concurent Users). Jika butuh lebih besar disarankan menggunakan alat sinkronisasi in-memory mandiri seperti Redis / Memorystore untuk *rate limiting* dan pindah dari database lock.
