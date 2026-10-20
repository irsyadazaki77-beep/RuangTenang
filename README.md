# RuangTenang Kampus 🌿

**Ekosistem Kesehatan Mental, Pendamping AI Reflektif & Rujukan Konseling Mahasiswa**

RuangTenang Kampus adalah platform digital kesehatan emosional dan pendampingan psikologis untuk sivitas akademika perguruan tinggi. Platform ini menggabungkan AI pendamping reflektif, skrining mandiri, rujukan ke konselor kampus, dan manajemen jadwal konseling. Skrining bukan diagnosis, dan kesiapan pilot/produksi tetap memerlukan persetujuan klinis, kampus, privasi, dan operasional.

---

## 🚀 Fitur Utama

1. **Teman RuangTenang (Asisten AI Reflektif & Server Proxy)**
   - Pendampingan emosional awal berbasis pendekatan *Reflective Listening* dan CBT melalui provider AI server-side yang dikonfigurasi (termasuk Ollama).
   - Penyaringan pola untuk beberapa jenis informasi pribadi sebelum pemrosesan AI; mekanisme ini bukan anonimisasi yang terjamin.
   - Pemeriksaan bahasa berlapis untuk membantu mengenali pesan berisiko; hasilnya bukan penilaian klinis dan tidak menjamin deteksi semua keadaan darurat.
   - Akses ke Pusat Bantuan Krisis dan kontak bantuan yang dikonfigurasi kampus.

2. **Sistem Penjadwalan Konseling Real-Time**
   - Pemilihan konselor, tanggal, jam, dan zona waktu (WIB / WITA / WIT).
   - Transaksi database server dengan pencegahan *double-booking* otomatis.
   - Siklus persetujuan konselor (`PENDING` -> `CONFIRMED` -> `COMPLETED`) dan integrasi kalender.

3. **Skrining Mandiri & Pelacak Tren Emosi**
   - Instrumen skrining mandiri PHQ-9 (gejala depresi) & GAD-7 (gejala kecemasan), bukan alat diagnosis.
   - Penyimpanan riwayat terenkripsi dan arahan tindak lanjut profesional untuk jawaban tertentu.

4. **Keamanan Data & Enkripsi (Privacy by Design)**
   - **Enkripsi AES-256-GCM** pada field sensitif (catatan konseling & log jurnal) menggunakan kunci terderivasi server.
   - Akses berbasis peran (`mahasiswa`, `konselor`, `admin`) dengan isolasi data yang ketat.
   - Audit trail transaksi backend dan alur penghapusan akun/data sesuai cakupan aplikasi dan kebijakan retensi.

5. **Fondasi Multi-Kampus**
   - Tenant kampus dengan pemetaan akun yang dikendalikan admin platform; data lama tidak diberi tenant secara otomatis.
   - Panel admin kampus untuk kontak rujukan, zona waktu, branding, status AI, pengaturan operasional konselor, dan analitik agregat dengan minimum kelompok.
   - Lihat [`docs/MULTI_CAMPUS_OPERATIONS.md`](docs/MULTI_CAMPUS_OPERATIONS.md) untuk langkah provisioning, isolasi tenant, dan gerbang pilot.

---

## 🛠️ Arsitektur & Teknologi

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion Animation, Code Splitting (React Lazy).
- **Backend Service:** Express.js 4, Node.js TypeScript Runtime.
- **Database Engine:** SQLite / PostgreSQL didukung **Prisma ORM** (Singleton Client, Server-Side Pagination, Database Indexing).
- **AI Integration:** Gemini, OpenAI, DeepSeek, Groq, OpenRouter, dan Ollama melalui adapter server-side, dengan rate limiting dan SSE streaming.
- **Validation & Security:** Zod Schema Validation, Helmet CSP/HSTS, Rate Limiters, `no-store` No-Cache Header Rules untuk data sensitif.
- **PWA Status:** Aplikasi web murni berkinerja tinggi (Non-PWA / Tidak ada Service Worker offline yang menyimpan data mental health sensitif di browser).

---

## ⚡ Cara Menjalankan & Setup Database Lokal

1. **Install Dependensi:**
   ```bash
   npm ci
   ```

   Node.js 22 adalah runtime CI yang didukung. Setiap perubahan dependensi harus memperbarui dan menyertakan `package-lock.json` bersama `package.json` menggunakan npm 10. Pastikan `npm ci` berhasil sebelum mengirim perubahan; CI selalu menggunakan `npm ci`.

2. **Setup Database Lokal (SQLite):**
   *Aplikasi secara otomatis membuat file database SQLite dan mensinkronisasikan tabel skema saat pertama kali dijalankan via `npm run dev`.*
   
   Jika ingin melakukan inisialisasi / push skema secara manual:
   ```bash
   npm run db:push:sqlite
   ```

   *(Opsional)* Mengisi data demo konselor dan pengguna uji coba:
   ```bash
   # Pastikan password telah diset di .env sebelum menjalankan seed:
   npm run seed:demo
   ```

3. **Jalankan Development Server:**
   ```bash
   npm run dev
   ```

### Mode model Ollama

Untuk membatasi katalog model ke provider Ollama, set nilai berikut di `.env`:

```env
LOCAL_AI_ONLY=true
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

`127.0.0.1` menunjuk ke mesin tempat server RuangTenang berjalan. Jika Ollama ada di host lain, isi alamat host tersebut dan pastikan jaringan serta aksesnya memang dikelola. Mode ini membatasi provider model AI; database, unggahan, dan analitik aplikasi tetap mengikuti konfigurasi deployment. Pencarian web Tavily untuk task riset kini nonaktif secara default dan hanya tersedia setelah pengguna mengaktifkannya di panel plan. Pencarian metadata sitasi Crossref tetap merupakan layanan eksternal terpisah saat pengguna memilih fitur tersebut. Gunakan label “lokal” hanya jika endpoint Ollama benar-benar berjalan pada perangkat yang dimaksud.

4. **Menjalankan Quality Gate (CI Stages):**
   ```bash
   npm run typecheck        # 1. Typechecking
   npm run lint             # 2. ESLint & Security Linter
   npm run test:unit        # 3. Frontend Component Unit Tests
   npm run test:integration # 4. Backend Integration Tests
   npm run test:security    # 5. Security, Auth, CORS, CSRF, Rate Limit Tests
   npm run build            # 6. Production Build
   ```

---

## 🗄️ Database, Git Hygiene & Migration Safety Guide

RuangTenang Kampus menggunakan **Prisma ORM** yang mendukung arsitektur multi-engine untuk **SQLite** (pengembangan lokal & pengujian integrasi) dan **PostgreSQL** (skala produksi di Cloud SQL / container).

### 1. Kebijakan Git Hygiene (Pemisahan Data Runtime)
- **Zero Runtime Data in Git:** File runtime database (`*.db`, `*.sqlite`, `*.sqlite3`), runtime JSON data (`data/*.json`), backup database (`backups/`, `*.backup`, `*.dump`), report exports (`reports/*.xlsx`), serta file environment (`.env`) **diabaikan secara ketat oleh `.gitignore`** dan tidak pernah di-commit ke repositori.
- **Fresh Clone Readiness:** Pengembang baru dapat langsung melakukan `git clone` -> `npm ci` -> `npm run dev`. Sistem akan otomatis menginisialisasi database SQLite kosong yang siap digunakan tanpa ketergantungan pada artefak database lama.

### 2. Sinkronisasi SQLite & PostgreSQL
- **Development (SQLite):** Menggunakan `prisma/schema.sqlite.prisma` dan database lokal `prisma/ruangtenang_sqlite.db`.
- **Production (PostgreSQL):** Menggunakan `prisma/schema.postgres.prisma` dengan koneksi `DATABASE_URL` PostgreSQL:
  ```bash
  # Generate client untuk PostgreSQL
  npm run db:generate:postgres
  # Terapkan migrasi ke PostgreSQL
  npm run db:migrate:postgres
  ```

---

### 2. Panduan Migrasi Aman (Migration Safety)

#### ⚠️ Larangan Keras Produksi
* **JANGAN** pernah menjalankan `npx prisma db push --force-reset` atau `npx prisma migrate reset` di lingkungan produksi karena akan menghapus seluruh data pengguna secara permanen.
* Modifikasi skema harus dirancang secara **backward-compatible** (contoh: buat kolom baru sebagai *nullable* terlebih dahulu sebelum menjadikannya wajib lewat migrasi data bertahap).

#### Latihan Pengamanan Rutin (Runbook Migrasi)
Sebelum melakukan migrasi skema baru ke produksi, selalu lakukan langkah-langkah pertahanan berikut:

1. **Pencadangan Data (Database Backup):**
   * **SQLite:** Salin file database lokal ke folder cadangan terpisah:
     ```bash
     mkdir -p ./prisma/backups
     cp prisma/ruangtenang_sqlite.db ./prisma/backups/ruangtenang_backup_$(date +%Y%m%d_%H%M%S).db
     ```
   * **PostgreSQL:** Gunakan utilitas standar `pg_dump` untuk mengekspor data:
     ```bash
     pg_dump -h <HOST> -U <USER> -d <DB_NAME> -F c -b -v -f ./backups/prod_backup_$(date +%Y%m%d_%H%M%S).dump
     ```

2. **Eksekusi Migrasi Skema (Schema Deployment):**
   * Di lingkungan pengembangan (SQLite), gunakan `db push` untuk sinkronisasi cepat:
     ```bash
     npx prisma db push
     ```
   * Di lingkungan produksi (PostgreSQL), selalu gunakan migrasi terlacak untuk menjamin integritas transaksional skema:
     ```bash
     npx prisma migrate deploy
     ```

3. **Strategi Pemulihan (Rollback Strategy):**
   * **Rollback SQLite:**
     Jika migrasi merusak data atau mengalami kegagalan sistem:
     1. Matikan server Node.js.
     2. Ganti file database aktif dengan file cadangan:
        ```bash
        mv ./prisma/backups/ruangtenang_backup_target.db prisma/ruangtenang_sqlite.db
        ```
     3. Restart server.
   * **Rollback PostgreSQL:**
     1. Pulihkan data menggunakan cadangan dump terakhir:
        ```bash
        pg_restore -h <HOST> -U <USER> -d <DB_NAME> -v ./backups/prod_backup_target.dump
        ```
     2. Tandai migrasi yang gagal sebagai dibatalkan jika perlu menggunakan perintah mitigasi:
        ```bash
        npx prisma migrate resolve --rolled-back <NAMA_MIGRASI>
        ```

---

## 🐳 Panduan Deployment Produksi (Docker & Hardened Nginx)

RuangTenang & RuangKerja telah dilengkapi arsitektur produksi berbasis **Multi-Stage Docker**, **Docker Compose Isolated Network**, dan **Hardened Nginx Reverse Proxy**.

### 1. Struktur Stack Produksi
- **Proxy:** Nginx 1.27 Alpine (Gzip/Brotli, CSP, HSTS, Rate Limiting Auth/SOS, WebSocket Pass-through)
- **Web App:** Node.js 22 Alpine (Non-root `USER node`, dumb-init, Prisma Client SSOT)
- **Database:** PostgreSQL 16 Alpine (Network Internal Terisolasi - Port tidak diekspos ke publik)
- **Cache:** Redis 7 Alpine (Auth Protected, Persistent Append-Only File)

### 2. Langkah Cepat Deployment Produksi

1. **Siapkan Berkas Konfigurasi Produksi:**
   ```bash
   cp .env.production.example .env.production
   chmod 600 .env.production
   # Buka dan isi rahasia (JWT_SECRET, ENCRYPTION_KEY, POSTGRES_PASSWORD, REDIS_PASSWORD)
   nano .env.production
   ```

2. **Jalankan Skrip Otomasi Deployment:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

   *Skrip `deploy.sh` secara otomatis menjalankan: validasi pre-flight, backup database snapshot, build multi-stage, eksekusi migrasi Prisma PostgreSQL, rolling container rollout, dan verifikasi healthcheck API.*

3. **Perintah Manajemen Operasional:**
   - Cek status container: `docker compose -f docker-compose.prod.yml ps`
   - Pantau live log aplikasi: `docker compose -f docker-compose.prod.yml logs -f web`
   - Pantau live log Nginx proxy: `docker compose -f docker-compose.prod.yml logs -f proxy`
   - Matikan stack produksi: `docker compose -f docker-compose.prod.yml down`

---

## 🔒 Kebijakan Privasi & Disclaimer Medis

- **Bukan Layanan Diagnosis Klinis:** Asisten AI RuangTenang adalah pendamping reflektif emosional awal dan **BUKAN** psikolog, psikiater, atau pengganti penanganan medis darurat.
- **Kerahasiaan Data:** Data pengguna tidak pernah diperjualbelikan. Respons mental health sensitif tidak pernah disimpan di cache publik maupun browser cache.
