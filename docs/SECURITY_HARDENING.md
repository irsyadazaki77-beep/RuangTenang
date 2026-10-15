# Penguatan Keamanan RuangTenang

## Hasil implementasi

- Browser login, registrasi, dan MFA memakai cookie `HttpOnly`; respons browser tidak menyertakan JWT. Klien tanpa metadata browser masih mendapat token lama sementara.
- Klien native baru memakai `/api/v1/auth/mobile/*`: access token berlaku 15 menit; refresh token acak berlaku 30 hari, hanya hash-nya disimpan, dan setiap pemakaian merotasi token. Pemakaian ulang token yang telah dipakai mencabut seluruh keluarga refresh beserta sesi.
- Endpoint native menolak Origin, Referer, Fetch Metadata, dan cookie browser. Kirim `X-Client-Version` agar adopsi versi dapat dipantau. Simpan refresh token menggunakan secure storage milik OS.
- Bootstrap HTML dimuat dari berkas JavaScript eksternal. CSP produksi tidak mengizinkan inline script. Express membentuk `frame-ancestors` dari `APP_ORIGIN` dan `CORS_ALLOWED_ORIGINS`; Nginx meneruskan CSP Express tanpa kebijakan kedua yang bertentangan.
- Rate limiter memakai counter Redis atomik untuk lintas proses. Saat Redis tidak tersedia, batas per proses tetap aktif; kondisi fallback memicu log alert dan metrik `ruangtenang_rate_limit_local_fallback_active` serta `ruangtenang_rate_limit_local_fallback_hits`.
- Image web hanya membawa dependensi runtime. Prisma CLI berada di target image migrasi terpisah. Secret produksi dibaca dari Docker Compose secret files.
- Backup PostgreSQL/SQLite disimpan sebagai `.enc` AES-256-GCM pada volume Docker khusus, memakai kunci 32-byte khusus `BACKUP_ENCRYPTION_KEY`. Data plaintext hanya melewati direktori sementara mode `0700`, lalu segera dihapus. File backup lokal dibersihkan setelah 7 hari.
- CI menjalankan `npm audit`, Gitleaks, Trivy pada image produksi, tes restore backup PostgreSQL terenkripsi, dan update Dependabot mingguan untuk npm, Docker, serta GitHub Actions.

## Kontrak autentikasi klien

| Klien | Endpoint | Kredensial yang dikembalikan |
| --- | --- | --- |
| Browser web | `/api/v1/auth/register`, `/login`, `/mfa/verify` | Cookie sesi `HttpOnly`; body tidak memuat `token` |
| Native baru | `/api/v1/auth/mobile/register`, `/login`, `/mfa/verify` | `accessToken`, `refreshToken`, dan expiry; tidak ada cookie |
| Native lama selama transisi | `/api/v1/auth/register`, `/login`, `/mfa/verify` tanpa Origin/Referer/Fetch Metadata | JWT legacy di body; tidak ada cookie |

Native mengirim access token melalui `Authorization: Bearer`. Refresh memakai `POST /api/v1/auth/mobile/refresh` dengan `{ "refreshToken": "..." }`; simpan token hasil rotasi sebelum menghapus token lama. Logout memakai `POST /api/v1/auth/mobile/logout` dengan token refresh terakhir. Jangan mengirim refresh token sebagai query parameter atau mencatatnya ke log.

Endpoint legacy baru boleh dinonaktifkan setelah `legacyBearerSessions` tidak lagi bertambah selama periode yang disepakati dan versi aplikasi native yang masih didukung telah bermigrasi. Metrik admin `/api/v1/metrics` menyediakan hitungan `browserCookieSessions`, `legacyBearerSessions`, `mobileSessions`, kegagalan/replay refresh, logout, serta agregat versi klien yang tervalidasi. Metrik tidak menyimpan ID pengguna, token, atau isi kesehatan.

## Menyiapkan produksi Compose

1. Salin `.env.example` menjadi `.env.production`. File itu hanya berisi konfigurasi publik dan path secret.
2. Buat secret di `./secrets/` dengan izin baca terbatas. Secret wajib: `jwt_secret`, `encryption_key`, `blind_index_secret`, `backup_encryption_key`, `database_url`, `postgres_password`, dan `redis_password`. Kunci backup harus 64 karakter hex dan berbeda dari secret aplikasi. Gunakan password Redis berupa hex agar aman ditulis ke konfigurasi Redis sementara. Nilai password database pada `database_url` harus sama dengan `postgres_password`.
3. Buat key integration tambahan hanya untuk provider yang digunakan. `bash scripts/initOptionalSecretFiles.sh` membuat file opsional kosong yang belum tersedia.
4. Jalankan `deploy.sh`. Script memeriksa file secret wajib, mengatur mode file, membangun image, membuat backup terenkripsi sebelum migrasi, menjalankan target migrasi, lalu melakukan health check.

Compose file secrets pada Docker host dipasang read-only ke container. Lindungi filesystem host dan jangan menyimpan direktori `secrets/` di repository atau image. Jangan mengirim file backup/key ke storage off-host sebelum kebijakan akses dan enkripsi tujuan dikonfirmasi.

## Backup dan restore rehearsal

Pembuatan backup manual di Compose dilakukan oleh deploy script sebelum migrasi. Hasilnya file `.dump.enc` pada volume Docker `ruangtenang_backups_prod_data`; alat menolak menulis backup apabila kunci khusus tidak tersedia. CI melakukan restore PostgreSQL ke database acak terisolasi, memverifikasi tabel `Users`, lalu menghapus database sementara dan artefak tes.

Untuk rehearsal pada **staging/disposable PostgreSQL saja**, jalankan image web dengan secret dan jaringan Compose yang sama:

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --no-deps \
  -e RESTORE_REHEARSAL_ALLOW_TARGET=isolated web node dist/rehearseEncryptedBackup.mjs
```

Perintah ini membuat database baru bernama `ruangtenang_restore_<random>`, memulihkannya dari backup terenkripsi, memeriksa tabel `Users`, kemudian menghapus database sementara. Jangan jalankan pada production. Salin backup terenkripsi ke media off-host terpisah setelah keberhasilan backup; retensi lokal default tujuh hari tidak menggantikan retensi off-host.

## Pemantauan rollout

- Bandingkan `legacyBearerSessions` dan `mobileSessions` tanpa mengumpulkan data pengguna.
- Pantau versi native, `mobileRefreshFailures`, `mobileRefreshReplays`, dan `mobileLogouts`.
- Pantau `csrfRejections`, `cspViolationReports`, `rateLimitExceeded`, serta status fallback Redis.
- Endpoint metrik dibatasi untuk admin dan menampilkan data agregat. CSP report endpoint hanya menghitung laporan; isi laporan mentah dibuang.
- Uji upload berkas malformed/berukuran besar, IDOR lintas pengguna/kampus, persetujuan data kesehatan, dan akses konselor di staging sebelum rollout.

Audit ini mencakup repository dan konfigurasi Compose/Nginx. Situs live tidak dipindai. Off-host backup destination dan rotasi versi aplikasi native merupakan langkah operasional yang masih harus dilakukan oleh pemilik deployment.
