# Operasi Multi-Kampus

## Status implementasi

RuangTenang sekarang memiliki dasar tenant bersama: entitas kampus, pengenal kampus pada akun/konselor/janji temu, peran `campus_admin`, API provisioning kampus, konfigurasi lokal, daftar dan pengaturan operasional konselor, analitik penggunaan agregat, dan sakelar AI per kampus.

Migrasi ini **tidak** menetapkan kampus untuk data lama. Baris `campusId` kosong tetap berada di luar dashboard dan akses tenant. Jangan membuka pilot sebelum pemilik data mengonfirmasi pemetaan akun dan janji temu lama.

## Provisioning dan pemetaan

1. Terapkan migrasi PostgreSQL `20261015000000_campus_tenants` setelah diuji pada salinan terisolasi.
2. Buat kampus melalui `POST /api/v1/admin/campuses` sebagai admin platform. Slug harus unik; konfigurasi awal memuat zona waktu, kontak rujukan, branding, dan status AI.
3. Provision akun `campus_admin` lewat `POST /api/v1/users/provision`, lalu petakan akun tersebut menggunakan `PATCH /api/v1/admin/campuses/:campusId/users/:userId`.
4. Peta akun konselor dengan endpoint yang sama setelah verifikasi identitas dan kampus. Akun konselor dan profil konselornya diperbarui dalam transaksi.
5. Peta mahasiswa hanya setelah sumber identitas kampus dikonfirmasi. Endpoint assignment tidak memindahkan data janji temu lama secara otomatis.
6. Perbarui sesi di klien setelah pemetaan akun agar konteks kampus terbaru terlihat pada UI.

## Batas akses dan konfigurasi

- `campus_admin` bukan admin platform dan tidak dapat memakai endpoint global admin. Akses panel kampus hanya memakai `campusId` yang dibaca dari akun server.
- Daftar konselor, ketersediaan, daftar janji temu, ruang konseling, dan data klinis harus cocok dengan kampus peserta. Janji temu tanpa pemetaan tetap tidak tersedia pada tenant.
- Admin kampus dapat mengubah zona waktu, kontak rujukan, branding, sakelar AI, jadwal/ketersediaan, spesialisasi, dan biaya konselor pada kampus sendiri. Verifikasi identitas konselor dan pemetaan akun tetap dikelola admin platform.
- Menonaktifkan AI menghasilkan respons lokal aman setelah pemeriksaan krisis lokal; konten tidak dikirim ke provider AI. Status kampus tidak menghapus data akun yang sudah tersimpan.
- Analitik hanya menerima kode event yang diizinkan saat pengguna mahasiswa memberi persetujuan analitik. Isi chat, catatan, dan hasil skrining tidak masuk ke event. Identitas diganti HMAC berkunci yang dibatasi pada kampus; event dihapus setelah 90 hari dan ikut dihapus saat aktivitas atau akun dihapus.
- Angka analitik per event disembunyikan jika jumlah pengguna unik kurang dari 10. Laporan ini mengukur pemakaian alur, bukan hasil klinis.
- Deployment tetap satu instance: SSE janji temu, signaling WebRTC, dan presence ruang konseling masih berada di memori proses. Jangan menambah replika sampai event dan state ruang dipindah ke infrastruktur bersama dan diuji lintas instance.

## Sebelum pilot dan ekspansi

- Jalankan quality gate lengkap, pengujian akses lintas tenant, serta rehearsal migrasi, restore, dan rollback pada PostgreSQL terisolasi.
- Pastikan tidak ada akun pengguna atau konselor yang belum dipetakan, atau setujui secara tertulis bahwa akun itu tetap berada di luar pilot.
- Minta persetujuan tenaga profesional dan pemilik kampus untuk skrining, triase, kontak darurat, serta alur eskalasi. Verifikasi juga vendor AI, retensi, dukungan, dan jadwal maintenance.
- Uji aksesibilitas manual dan perjalanan pengguna mobile. Konfirmasi bahwa state ruang konseling dan event real-time memakai penyimpanan bersama sebelum menambah replika server.
- Tetapkan baseline adopsi dan target pilot bersama kampus setelah data awal tersedia.

## Endpoint

| Endpoint | Akses | Fungsi |
| --- | --- | --- |
| `GET/POST /api/v1/admin/campuses` | Admin platform | Daftar atau buat kampus |
| `PATCH /api/v1/admin/campuses/:campusId` | Admin platform | Ubah konfigurasi dan status kampus |
| `PATCH /api/v1/admin/campuses/:campusId/users/:userId` | Admin platform | Petakan akun ke kampus |
| `GET /api/v1/campuses/me` | Anggota tenant | Baca konfigurasi kampus aman |
| `GET/PATCH /api/v1/campus-admin/settings` | Admin kampus | Baca/ubah konfigurasi lokal |
| `GET /api/v1/campus-admin/counselors` | Admin kampus | Lihat konselor kampus |
| `PATCH /api/v1/campus-admin/counselors/:counselorId` | Admin kampus | Ubah hari tersedia, spesialisasi, dan biaya konselor |
| `GET /api/v1/campus-admin/overview` | Admin kampus | Baca metrik agregat 30 hari |
| `POST /api/v1/analytics/events` | Mahasiswa terpetakan | Kirim kode event setelah consent |
