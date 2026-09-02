const fs = require('fs');
let file = fs.readFileSync('src/features/screening/ScreeningModal.tsx', 'utf8');

file = file.replace(
  /let storageNotice = 'Hasil tersimpan di perangkat ini.';\s*if \(persistenceStatus === 'saved'\) {\s*storageNotice = 'Hasil berhasil disimpan ke akun Anda \(Cloud Private\)';\s*} else if \(persistenceStatus === 'local-only'\) {\s*storageNotice = 'Hasil tersimpan di perangkat ini \(Mode Tamu\/Lokal\)';\s*} else if \(persistenceStatus === 'failed'\) {\s*storageNotice = 'Pengecekan selesai \(Penyimpanan ke server gagal, tersimpan lokal\)';\s*}/g,
  `let storageNotice = 'Hasil tersedia selama sesi ini.';
    if (persistenceStatus === 'saved') {
      storageNotice = 'Hasil berhasil disimpan ke akun Anda.';
    } else if (persistenceStatus === 'local-only') {
      storageNotice = 'Hasil tidak disimpan ke akun. Hasil hanya tersedia selama sesi ini.';
    } else if (persistenceStatus === 'failed') {
      storageNotice = 'Pengecekan selesai, tetapi penyimpanan ke akun mungkin gagal.';
    }`
);

file = file.replace(
  /<li><strong className="text-primary font-medium">Privasi:<\/strong> Hasil tersimpan di akun Anda untuk riwayat pribadi.<\/li>/g,
  `<li><strong className="text-primary font-medium">Privasi:</strong> {user && user.role !== 'guest' ? 'Hasil dapat disimpan ke akun Anda untuk membantu melihat riwayat.' : 'Hasil tidak disimpan ke akun. Hasil hanya tersedia selama sesi ini.'}</li>`
);

file = file.replace(
  /<span>Mode Tamu: Hasil tersimpan di perangkat ini. Masuk atau daftar akun untuk menyimpan riwayat skrining ke profil Anda.<\/span>/g,
  `<span>Mode Tamu: Hasil tidak disimpan ke akun. Hasil hanya tersedia selama sesi ini. Masuk atau daftar untuk menyimpan riwayat skrining ke profil Anda.</span>`
);

file = file.replace(
  /Tersimpan Privat/g,
  `Riwayat Pribadi`
);

fs.writeFileSync('src/features/screening/ScreeningModal.tsx', file);
