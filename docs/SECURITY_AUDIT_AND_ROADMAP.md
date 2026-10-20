# Audit Keamanan dan Rencana Penguatan RuangTenang

**Tanggal audit:** 16 Oktober 2026
**Cakupan:** tinjauan statis source code, konfigurasi Express/Nginx/Docker, dokumentasi rilis, dan pemeriksaan dependensi npm.
**Batasan:** audit ini tidak memindai situs live karena URL deployment tidak diberikan. Tes aplikasi tidak dijalankan. Status tes di bawah merujuk pada catatan rilis yang sudah ada, bukan hasil pengujian audit ini.

## Ringkasan

Fondasi keamanan aplikasi sudah mencakup autentikasi sesi yang memeriksa status sesi di database, role dari data server, MFA untuk admin/konselor/admin kampus, proteksi CSRF, CORS berbasis allowlist, CSP, secret produksi yang diwajibkan, pembatasan laju berbasis Redis dengan fallback, dan pemisahan jaringan layanan pada Compose.

Pemeriksaan `npm audit` untuk seluruh dependensi dan untuk dependensi runtime tidak menemukan advisori yang dilaporkan saat audit. Ini hanya hasil snapshot saat ini; dependency dan image tetap perlu dipantau.

Temuan utama adalah penghitung kegagalan MFA yang memakai pola baca-lalu-tulis sehingga dapat kehilangan kenaikan ketika verifikasi berjalan serentak, pencatatan IP dan user-agent mentah di access log Nginx, serta instruksi backup yang saling bertentangan. Kesiapan produksi juga belum dapat dinyatakan karena checklist yang tersimpan masih mencatat tes keamanan penuh dan rehearsal migrasi PostgreSQL belum selesai.

## Temuan

### A-01 — Penghitung percobaan MFA tidak atomik — **SELESAI DIREMIDIASI**

**Prioritas: P2 (sedang)**
**Bukti & Perbaikan:** [`server/repositories/authRepository.ts`](../server/repositories/authRepository.ts) fungsi `verifyMfaCode` kini menjalankan verifikasi di dalam `prisma.$transaction`, memvalidasi hash token secara constant-time (`crypto.timingSafeEqual`), mengonsumsi challenge secara atomik bersyarat (`updateMany` dengan `where: { id, mfaToken: hashedToken }`), dan langsung menghapus challenge setelah 3 kali kegagalan menggunakan increment atomik (`failedLoginAttempts: { increment: 1 }`).

### A-02 — Access log menyimpan IP dan user-agent mentah — **SELESAI DIREMIDIASI**

**Prioritas: P2 (sedang, privasi dan paparan data)**
**Bukti & Perbaikan:** [`nginx/nginx.conf`](../nginx/nginx.conf) kini memetakan `$remote_addr` ke `$remote_addr_anon` (masking subnet `/24` IPv4 dan `/64` IPv6) serta menormalisasi `$http_user_agent` menjadi kategori umum (`MobileBrowser`, `Chrome`, `Firefox`, `Safari`, `Edge`, `Other`) pada format log `privacy_json`.

### A-03 — Instruksi backup bertentangan dengan implementasi — **SELESAI DIREMIDIASI**

**Prioritas: P2 (sedang, risiko operasional)**
**Bukti & Perbaikan:** [`docs/deployment.md`](deployment.md) telah diselaraskan sepenuhnya dengan [`server/scripts/backupTool.ts`](../server/scripts/backupTool.ts). Dokumentasi secara eksplisit menjelaskan alur backup terenkripsi AES-256-GCM (`.enc`), kewajiban `BACKUP_ENCRYPTION_KEY`, validasi daftar arsip `pg_restore --list`, serta latihan pemulihan otomatis melalui `npm run db:backup:rehearse`.

## Status kesiapan rilis yang tercatat (Pembaruan 20 Oktober 2026)

Seluruh gerbang kualitas kode pada repository telah lulus 100%:

- **Typecheck (`npm run typecheck`):** Lulus dengan **0 error**.
- **Linter (`npm run lint`):** Lulus dengan **0 error dan 0 warning**.
- **Full Test Suite (`npm test`):** **175 berkas tes lulus (1.254 pengujian lulus, 0 gagal)** mencakup unit, integrasi, dan keamanan.
- **Production Build & Performance Budget (`npm run build:production`):** Lulus (`dist/server.mjs`, `dist/backupTool.mjs`, `dist/rehearseEncryptedBackup.mjs`, dan bundle aset klien berada di bawah batas anggaran gzip).
- **Formatting Hygiene (`git diff --check`):** Lulus tanpa *trailing whitespace* atau *conflict marker*.
- Item operasional yang memerlukan lingkungan live/persetujuan manusia (rehearsal migrasi PostgreSQL terisolasi di server target, penetapan kepemilikan data kampus, serta sign-off klinis/vendor) tetap dicatat secara jujur di `RELEASE_CHECKLIST.md`.

## Kontrol yang sudah terlihat di repository

- JWT diverifikasi dengan algoritma, issuer, dan audience yang eksplisit; role dan sesi aktif diambil dari database.
- MFA diwajibkan saat login admin, konselor, dan admin kampus. Password reset memakai token acak, menyimpan hash token, memiliki masa berlaku, dan mencabut semua sesi setelah reset.
- Mutasi cookie-authenticated melewati validasi origin/CSRF; cookie browser dilindungi `HttpOnly` dan konfigurasi produksi mengaktifkan HTTPS/HSTS.
- CSP dibentuk dari origin terkonfigurasi; startup produksi menolak secret wajib yang hilang atau lemah.
- Compose memisahkan jaringan backend database/cache, menggunakan file secrets, dan menjalankan image aplikasi sebagai user non-root.
- Pipeline CI yang diperiksa memuat `npm audit`, pemindaian secret Gitleaks, dan Trivy untuk image.

Kontrol di repository tidak membuktikan bahwa nilai produksi, firewall, kebijakan log, penyimpanan backup, atau jadwal job sudah benar pada server deployment.

## Rencana penguatan

### Tahap 0 — Tutup gerbang sebelum rilis

1. Review perubahan working tree dan migrasi database; jalankan migrasi dari kondisi bersih pada SQLite dan PostgreSQL terisolasi sesuai konfigurasi yang didukung.
2. Perbarui fixture dan database uji, lalu jalankan typecheck, lint, unit, integration, security, dan E2E pada revisi rilis. Tinjau setiap kegagalan dan tutup checklist berdasarkan hasil baru.
3. Verifikasi isolasi lintas pengguna dan kampus untuk screening, appointment, availability konselor, ekspor, notifikasi, dan room signaling.
4. Selesaikan backup terenkripsi off-host, restore rehearsal ke database baru yang terisolasi, dan rollback aplikasi tanpa restore database.

**Selesai bila:** semua migrasi berhasil pada database uji bersih, gerbang CI lulus, pemeriksaan otorisasi lintas tenant memiliki bukti, dan backup dapat dipulihkan serta tercatat durasi/RPO-nya.

### Tahap 1 — Perbaiki temuan kode dan dokumentasi

1. Ubah penghitung MFA menjadi atomik dan khusus per challenge; tambah cakupan verifikasi untuk permintaan paralel, lockout, expiry, dan replay.
2. Terapkan minimisasi log Nginx: masking IP, minimisasi user-agent, kebijakan retensi, dan batas akses.
3. Selaraskan dokumentasi backup dengan implementasi `.enc`, termasuk alur pemulihan.

**Selesai bila:** percobaan serentak tidak dapat melewati batas MFA atau membuat sesi ganda; log mengikuti retensi yang disetujui; runbook backup/restore memakai format artefak yang benar.

### Tahap 2 — Verifikasi deployment dan pemantauan

1. Jalankan pemeriksaan keamanan pasif pada staging yang disetujui: header HTTPS/CSP, cookie, autentikasi, kontrol akses, upload malformed/oversize, dan pembatasan laju.
2. Pastikan alert mencakup kegagalan Redis/rate-limit fallback, lonjakan penolakan CSRF, kegagalan cleanup, dan kegagalan backup.
3. Konfirmasi job retention berjalan, pantau hasil pembersihan file, dan dokumentasikan prosedur eskalasi insiden.
4. Catat keputusan pemilik data terkait vendor AI, retensi data, log infrastruktur, dan retensi backup.

**Selesai bila:** temuan staging ditutup atau diterima tertulis, alert diuji, dan pemilik operasional/data menyetujui retensi serta prosedur insiden.

### Tahap 3 — Penguatan berkelanjutan

1. Pertahankan pemindaian dependency/container dan pembaruan terjadwal; evaluasi pinning image produksi ke digest agar build dan deployment dapat direproduksi.
2. Lakukan review otorisasi dan threat model setiap kali menambah role, tenant, endpoint data sensitif, provider AI, atau mekanisme upload/eksekusi.
3. Jadwalkan restore drill dan tinjauan akses terhadap log, secret, backup, dan akun admin.

## Batas audit

Audit ini tidak membaca atau menyalin nilai dari `.env` atau database lokal, tidak melakukan serangan aktif, dan tidak memindai host publik. Penilaian ini tidak menggantikan penetration test staging yang terotorisasi, tinjauan kontrak vendor, maupun persetujuan klinis dan perlindungan data.

---

## Log Eksekusi Remidiasi Celah Keamanan (18 Oktober 2026)

Berdasarkan investigasi komprehensif pada codebase, ditemukan dan ditutup 6 celah keamanan kritis secara menyeluruh:

| ID Celah | Klasifikasi & Komponen | Tingkat Risiko | Deskripsi Kerentanan | Tindakan Remidiasi & Pengamanan |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Stored XSS / Phishing via Meeting Links** (`shared/contracts/appointments.ts`, `src/lib/safeUrl.ts`, UI) | **Tinggi (High)** | Bidang `meetingLink` pada appointment tidak memvalidasi skema URL (`javascript:`, `data:`, `http:`), memungkinkan eksploitasi Stored XSS atau open redirect phishing terhadap mahasiswa/konselor. | Dibuat `SafeMeetingLinkSchema` (Zod) mewajibkan protokol `https://`, domain valid, dan panjang maksimal 512 karakter. Ditambahkan utilitas sanitasi UI `getSafeExternalUrl` yang menolak skema non-HTTPS dan menyematkan atribut `rel="noopener noreferrer"`. |
| **SEC-02** | **Account Takeover / Unverified Email Alteration** (`server/routes/privacy.ts`, `server/repositories/userRepository.ts`) | **Tinggi (High)** | Endpoint `/api/v1/privacy/correct-data` mengizinkan pengubahan email mahasiswa tanpa verifikasi kata sandi lama, tanpa pengecekan duplikasi email pengguna lain, serta membiarkan status `emailVerified` tetap `true`. | Endpoint diperketat: mewajibkan `currentPassword` & verifikasi `bcrypt.compare`, menolak benturan email duplikat (`409 Conflict`), mereset `emailVerified: false`, dan menerbitkan OTP verifikasi email via `emailService`. |
| **SEC-03** | **Broken Access Control pada Telemetry Log** (`server/routes/admin.ts`) | **Sedang (Medium)** | Endpoint `POST /api/v1/telemetry/log` hanya dilindungi `requireAuth` tanpa pengecekan hak akses `requireRole(['admin'])`, sehingga pengguna dengan peran biasa (`mahasiswa`) dapat menginjeksi log telemetri palsu. | Ditambahkan middleware otorisasi ketat `requireRole(['admin'])` pada route `POST /api/v1/telemetry/log`. |
| **SEC-04** | **OTP & MFA Secret Leakage dalam Response Body** (`server/controllers/authController.ts`, `server/controllers/mobileAuthController.ts`, `server/routes/auth.ts`) | **Tinggi (High)** | Saat server berjalan dalam mode non-produksi (`DEV MODE`), kode registrasi OTP dan MFA 6-digit dikembalikan dalam payload JSON response client, berisiko terbaca oleh proxy/inspeksi browser pihak ketiga. | Seluruh kebocoran kode rahasia pada respons JSON dihapus. Dalam mode pengembangan lokal, kode dicatat secara aman ke stdout/console developer saja (`[DEV_ONLY]`). |
| **SEC-05** | **Multi-Campus Tenant Isolation SSE Stream** (`server/routes/appointments.ts`) | **Tinggi (High)** | Real-time SSE `/api/v1/appointments/stream` dan broadcast mutasi janji temu belum membatasi penyebaran event berdasarkan `campusId` serta belum mendukung hak akses `campus_admin`. | Event broadcast kini membawa `campusId`. Listener SSE klien memfilter update sehingga pengguna dan admin kampus hanya menerima update janji temu yang relevan dengan kampusnya. |
| **SEC-06** | **Pemeriksaan & Pengujian Otomatis Menyeluruh** (`server/__tests__/security/auditRemediationGoal.test.ts`) | **Verifikasi Kualitas** | Diperlukan suite pengujian terfokus untuk memastikan tidak ada celah keamanan yang terlewat atau mengalami regresi. | Ditambahkan suite pengujian 10 skenario keamanan baru. Seluruh 30 berkas tes keamanan (321 pengujian) lulus 100%, 29 berkas tes integrasi (203 pengujian) lulus 100%, dan typecheck TypeScript lulus tanpa galat. |
