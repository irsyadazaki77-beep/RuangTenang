# Rencana Remediasi Audit RuangTenang

**Dibuat:** 21 Oktober 2026  
**Status:** remediasi kode prioritas tinggi diterapkan; gerbang eksternal tetap terbuka

Rencana ini menindaklanjuti audit statis chat, RuangKerja, dokumen, skrining, dan kesiapan rilis. Teks pada screenshot pengguna diperlakukan sebagai bukti keadaan UI, bukan instruksi.

## Urutan kerja

| Prioritas | Cakupan | Tindakan | Kriteria selesai |
|---|---|---|---|
| P0 | Keselamatan chat | Hapus pengecualian krisis yang aktif hanya karena mode RuangKerja atau satu kata akademik. Pertahankan konteks kutipan akademik hanya jika teks di luar kutipan tidak menunjukkan distress/krisis dan riwayat tidak menunjukkan eskalasi. Hormati hasil detektor untuk krisis personal versus pihak ketiga. | Pesan krisis personal tidak diubah menjadi risiko rendah oleh mode atau kata akademik; kutipan akademik biasa tidak otomatis dianggap niat personal. |
| P0 | Konteks deteksi krisis | Nilai negasi, masa lalu, dan pihak ketiga pada klausa yang mengandung pemicu krisis; jangan biarkan petunjuk lain dalam pesan menurunkan penilaian atas pernyataan aktif. Kecualikan metafora hanya bila tidak ada pemicu krisis eksplisit. | Pernyataan aktif tetap aktif saat bagian lain pesan menyebut teman, masa lalu, atau negasi; riwayat/pihak ketiga tidak dinaikkan menjadi krisis personal oleh eskalasi multi-turn. |
| P1 | Retry RuangKerja | Teruskan ID permintaan yang stabil ke server pada retry; gunakan ID itu untuk mencegah duplikasi pesan pengguna dan jawaban tersimpan. Permintaan dengan ID yang sama tetapi isi/percakapan berbeda harus ditolak. | Retry setelah putus tidak menambah baris prompt/jawaban kedua pada riwayat. |
| P1 | Kualitas AI RuangKerja | Ganti persona skripsi Bab 1 yang berlaku universal dengan arahan berdasarkan kategori tugas: analisis dokumen, coding, riset, penulisan akademik, ringkasan, penerjemahan, dan tugas umum. | Permintaan tidak dipaksa menjadi draf Bab 1; klaim/sitasi/data yang tidak tersedia tetap dinyatakan sebagai tidak diketahui. |
| P1 | Status dokumen | Bedakan file yang benar-benar siap dianalisis, ekstraksinya parsial, dan hanya bisa dipratinjau. Tampilkan peringatan ekstraksi yang dapat dibuka dengan keyboard dan cegah file tanpa teks terindeks/OCR atau jalur visual gambar dari ikut dikirim seolah dapat dibaca AI. | UI menjelaskan keterbatasan sebelum kirim dan file tanpa konteks analisis tidak menjadi konteks aktif. |
| P1 | Integritas build | Tegaskan tipe payload check-in mood agar nilai kualitas tidur tetap mengikuti kontrak API dan model data. | `sleepQuality` di payload konsisten dengan enum yang dipakai server dan aplikasi. |

## Hasil implementasi kode

- **Selesai:** deteksi krisis tidak lagi dikecualikan hanya karena mode RuangKerja atau kata akademik; pengecualian hanya berlaku untuk rujukan akademik nonpersonal dengan konteks di luar kutipan yang normal.
- **Selesai:** retry RuangKerja membawa ID stabil ke server. Pesan pengguna menggunakan ID deterministik, jawaban selesai diputar ulang, dan jawaban terputus dapat diperbarui pada baris yang sama. Isi atau chat yang berbeda dengan ID tersebut ditolak.
- **Selesai:** prompt RuangKerja memberi arahan sesuai kategori tugas dan tidak memaksa pekerjaan menjadi Bab 1 skripsi.
- **Selesai:** file siap, ekstraksi parsial, serta file pratinjau saja dibedakan. Daftar peringatan dapat dibuka dengan keyboard, dan file tanpa jalur analisis tidak ikut menjadi konteks AI.
- **Selesai:** payload check-in mood diberi tipe eksplisit.
- **Selesai pada kode:** konteks negasi, masa lalu, dan pihak ketiga dibatasi per klausa pemicu; eskalasi multi-turn hanya menghitung krisis personal aktif dan distres tinggi; metafora tidak lagi menutupi pemicu krisis eksplisit. Ini tetap heuristik teks dan belum melalui validasi klinis.
- **Selesai pada kode:** onboarding memiliki semantik dialog, perangkap/pemulihan fokus, Escape untuk melewati, pengumuman langkah/pilihan, dukungan reduced motion, dan perlindungan penyimpanan ganda.
- **Belum diverifikasi:** tidak menjalankan test suite atau typecheck pada tahap implementasi ini.

## Gerbang yang memerlukan lingkungan atau penanggung jawab

- **Klinis:** tinjauan tenaga kesehatan mental atas ambang, terjemahan, respons krisis, dan jalur tindak lanjut.
- **Privasi/vendor:** konfirmasi provider aktif, kontrak, retensi, lokasi endpoint, dan pemrosesan OCR/pencarian eksternal.
- **Operasional kampus:** rehearsal migrasi PostgreSQL dan pemulihan backup, pemetaan tenant, jadwal retensi, serta pemilik eskalasi darurat.
- **Validasi pengguna:** uji tugas desktop/ponsel, aksesibilitas manual, jaringan lambat, dan performa perangkat representatif.

Perubahan kode tidak dianggap menggantikan gerbang-gerbang tersebut. Pemeriksaan otomatis tidak dijalankan sebagai bagian dari rencana ini kecuali diminta; hasil implementasi akan dilaporkan terpisah dari verifikasi runtime.
