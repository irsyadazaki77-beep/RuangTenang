# RuangTenang Kampus 🌿

**Ekosistem Kesehatan Mental, Pendamping AI Reflektif & Rujukan Konseling Mahasiswa**

RuangTenang Kampus adalah platform digital kesehatan emosional dan pendampingan psikologis berstandar produksi yang dirancang khusus untuk sivitas akademika perguruan tinggi. Platform ini menggabungkan AI pendamping reflektif berstandar keselamatan tinggi, instrumen skrining mandiri tervalidasi (PHQ-9 & GAD-7), rujukan langsung ke konselor kampus, serta manajemen jadwal konseling real-time.

---

## 🚀 Fitur Utama

1. **Teman RuangTenang (Asisten AI Reflektif & Server Proxy)**
   - Pendampingan emosional awal berbasis pendekatan *Reflective Listening* & CBT via server-side Gemini proxy.
   - **PII Scrubbing** otomatis (menghapus nama, NIM, email, nomor HP sebelum diproses AI).
   - **Deteksi Krisis Multi-Lapis** dengan penanganan negasi (*negation handling*) untuk mencegah false alarm.
   - Pintu darurat (*Emergency SOS*) langsung ke kontak terdaftar.

2. **Sistem Penjadwalan Konseling Real-Time**
   - Pemilihan konselor, tanggal, jam, dan zona waktu (WIB / WITA / WIT).
   - Transaksi database server dengan pencegahan *double-booking* otomatis.
   - Siklus persetujuan konselor (`PENDING` -> `CONFIRMED` -> `COMPLETED`) dan integrasi kalender.

3. **Skrining Mandiri & Pelacak Tren Emosi**
   - Kuesioner tervalidasi klinis PHQ-9 (Depresi) & GAD-7 (Kecemasan).
   - Penyimpanan riwayat terenkripsi dan indikator krisis item-9 otomatis.

4. **Keamanan Data & Enkripsi (Privacy by Design)**
   - **Enkripsi AES-256-GCM** pada field sensitif (catatan konseling & log jurnal) menggunakan kunci terderivasi server.
   - Akses berbasis peran (`mahasiswa`, `konselor`, `admin`) dengan isolasi data yang ketat.
   - Audit trail transaksi backend dan dukungan Hak Penghapusan Permanen (*Right to be Forgotten*).

---

## 🛠️ Arsitektur & Teknologi

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion Animation, Code Splitting (React Lazy).
- **Backend Service:** Express.js 4, Node.js TypeScript Runtime.
- **Database Engine:** SQLite / PostgreSQL didukung **Prisma ORM** (Singleton Client, Server-Side Pagination, Database Indexing).
- **AI Integration:** `@google/genai` (Gemini API - Server-Side Proxying, Rate-Limiting, SSE Streaming dengan Client Abort Handling).
- **Validation & Security:** Zod Schema Validation, Helmet CSP/HSTS, Rate Limiters, `no-store` No-Cache Header Rules untuk data sensitif.
- **PWA Status:** Aplikasi web murni berkinerja tinggi (Non-PWA / Tidak ada Service Worker offline yang menyimpan data mental health sensitif di browser).

---

## ⚡ Cara Menjalankan & Pipeline CI/CD

1. **Install Dependensi:**
   ```bash
   npm ci
   ```

2. **Inisialisasi Database:**
   ```bash
   npm run db:push
   ```

3. **Jalankan Development Server:**
   ```bash
   npm run dev
   ```

4. **Menjalankan Quality Gate (CI Stages):**
   ```bash
   npm run typecheck    # 1. Typechecking
   npm run lint         # 2. ESLint & Accessibility Audit
   npm run test:unit    # 3. Frontend Component Unit Tests
   npm run test:integration # 4. Backend Integration Tests
   npm run test:security # 5. Security & Encryption Tests
   npm run build        # 6. Production Build
   ```

---

## 🗄️ Database & Migration Safety Guide

RuangTenang Kampus menggunakan **Prisma ORM** yang mendukung arsitektur multi-engine untuk **SQLite** (default pengembangan lokal & pengujian integrasi) dan **PostgreSQL** (untuk kesiapan produksi skala penuh di Cloud SQL / serverless).

### 1. Sinkronisasi SQLite & PostgreSQL
Secara bawaan, schema dikonfigurasi untuk SQLite untuk mempermudah setup tanpa konfigurasi server database eksternal:
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./ruangtenang_sqlite.db"
}
```
Untuk bermigrasi ke **PostgreSQL** di lingkungan produksi:
1. Ubah `provider` di `prisma/schema.prisma` menjadi `"postgresql"`.
2. Ganti `url` untuk menggunakan variabel lingkungan, misalnya: `url = env("DATABASE_URL")`.
3. Jalankan `npx prisma generate` untuk memperbarui Prisma Client dengan tipe PostgreSQL yang sesuai.

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

## 🔒 Kebijakan Privasi & Disclaimer Medis

- **Bukan Layanan Diagnosis Klinis:** Asisten AI RuangTenang adalah pendamping reflektif emosional awal dan **BUKAN** psikolog, psikiater, atau pengganti penanganan medis darurat.
- **Kerahasiaan Data:** Data pengguna tidak pernah diperjualbelikan. Respons mental health sensitif tidak pernah disimpan di cache publik maupun browser cache.
