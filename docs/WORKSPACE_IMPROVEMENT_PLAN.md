# Rencana Penyempurnaan RuangKerja

Tanggal audit: 2026-10-17

Dasar audit: kode dan perubahan lokal pada `codex/fase26-multimodal-intelligence`, tes yang tercatat di `WORKSPACE_IMPROVEMENT_EXECUTION.md`, serta probe di `WORKSPACE_PERFORMANCE_BASELINE.md`.

## 1. Tujuan

Membuat RuangKerja mudah dipahami oleh mahasiswa sejak pertama dibuka, menjaga konteks dan berkas tetap aman, membuat alur percakapan–file–Canvas–agen bisa ditelusuri, dan menjaga respons tetap baik saat data bertambah. Penyempurnaan harus didukung bukti: keberhasilan tugas, isolasi data, ketepatan state, ukuran bundle, latency, long task, dan perilaku pada perangkat yang representatif.

Rencana ini bukan klaim bahwa semua fase sudah selesai. Fase 0 dan 2–6 telah mempunyai validasi lokal pada working tree saat audit; fase 1, 7, dan 8 masih mempunyai gerbang terbuka.

## 2. Hasil audit mendalam

### 2.1 Temuan struktural

- Alur dasar sudah memisahkan percakapan, panel inspector, file, sumber, Canvas, memori, dan workflow agen. Persetujuan AI serta tinjauan manusia sebelum agen menjalankan rencana sudah tersedia.
- Persistensi draft, streaming, artifact, versi Canvas, pencarian, paginasi daftar, konteks file, dan sitasi mempunyai layanan/hook terpisah. `StudentWorkspace.tsx` masih mengoordinasikan banyak state dan side effect lintas domain, sehingga perubahan besar di sana berisiko menimbulkan regresi silang.
- Canvas, Compare, dan preview file telah dipisahkan dari jalur awal dengan lazy loading. Bundle terakhir menempatkan route Workspace pada 406,81 kB raw / 83,48 kB gzip dan editor Canvas pada 539,00 kB / 167,31 kB gzip. Vite masih memperingatkan beberapa dependensi di atas 500 kB.
- Riwayat percakapan sekarang mendukung cursor serta menjaga posisi anchor saat halaman lama dimuat. Stress fixture 500 pesan Markdown tetap menghasilkan long task median sekitar 287 ms pada percobaan anchor terakhir dan butuh 4,47–4,66 detik untuk menambah sembilan halaman pada preview lokal. Virtualisasi belum diimplementasikan.
- Pengeditan dokumen Canvas 50 KB melalui Playwright `fill` menghasilkan long task sekitar 1,25–1,50 detik. Eksperimen textarea tidak terkontrol tidak menunjukkan keuntungan yang meyakinkan; keputusan editor perlu didasarkan pada profiling per event di perangkat yang lebih lemah.
- Diff versi besar sebelumnya menghitung seluruh baris sekaligus. Algoritme kini memberi batas 250.000 sel untuk LCS exact, menggunakan anchor, memberi label perkiraan ketika alignment ambigu, dan membatasi DOM menjadi 250 baris per halaman. Pada fixture 3.600 perubahan di Vite dev, median commit turun 108,1 → 42,7 ms dan median long task maksimum 151 → 58 ms. Angka ini belum mewakili build production atau perangkat mahasiswa.
- Preview file kini memulai ulang state internal saat attachment berganti. Regresi pergantian dua file lulus; throughput saat membuka banyak attachment belum diukur.
- Retrieval cache miss baru pernah diukur sebagai kontrol CPU in-memory dengan DB/enkripsi di-mock. Query database, dekripsi, cache dingin, konkurensi server, dan kondisi staging belum terwakili.

### 2.2 Temuan pengalaman pengguna

- Audit layar sempit menemukan judul Workspace dan deskripsi starter terpotong pada 320 px. Perbaikannya sudah dicek lewat screenshot baru; consent AI juga diringkas dan diuji secara lokal.
- Alur lokal mencakup navigasi Canvas, composer 320/375 px, pemulihan draft, persetujuan AI, pencarian bertahap, sitasi, file, versi Canvas, ekspor, dan persetujuan plan agen.
- Belum ada sesi tugas dengan mahasiswa nyata. Karena itu, label yang jelas bagi tim belum tentu jelas bagi mahasiswa, dan tingkat keberhasilan tugas belum diketahui.

### 2.3 Batas bukti

- Working tree telah memiliki perubahan lokal sebelum audit. Semua pekerjaan berikutnya harus mempertahankan perubahan tersebut dan tidak memakai reset/checkout massal.
- Pengukuran browser saat ini berasal dari fixture lokal dan mesin pengembangan. Tidak ada klaim tentang provider AI, autentikasi, DB, jaringan, atau server deployment yang tidak diukur langsung.
- Tes tidak dapat menggantikan pilot. Pengujian dengan mahasiswa memerlukan peserta, persetujuan, skenario yang disetujui, dan lingkungan yang tidak memakai data pribadi nyata.

## 3. Urutan prioritas

| Prioritas | Fokus | Alasan urutan |
|---|---|---|
| P0 | Isolasi data, persetujuan AI/agen, penyimpanan, recovery, dan regresi | Salah tampil atau salah simpan dapat berdampak pada privasi dan kehilangan pekerjaan. Pertahankan gerbang ini setiap fase. |
| P1 | Validasi mahasiswa, riwayat 500 pesan, Canvas 50 KB, retrieval nyata, preview banyak file | Audit menemukan bukti belum cukup atau beban lokal tinggi pada alur yang dapat menghambat tugas utama. |
| P2 | Compare tiga model, pemisahan orkestrator, aksesibilitas dan polish lanjutan | Dikerjakan setelah alur dan hot path stabil agar refactor tidak menambah beban debugging atau merusak hasil pengukuran. |
| P3 | Rilis terbatas dan pemantauan | Hanya setelah gerbang lokal dan staging lulus serta temuan pilot kritis ditutup. |

## 4. Rencana fase

### Fase 0 — Audit, risiko, dan baseline (selesai untuk pass ini)

**Pekerjaan**

1. Catat status repository, perubahan lokal, arsitektur, dan batas data.
2. Buat baseline untuk tes, typecheck, lint, bundle, ukuran riwayat, Canvas, streaming, diff, dan retrieval.
3. Pisahkan hasil terukur, hasil fixture, perkiraan, dan pertanyaan terbuka.

**Kriteria keluar**

- Ada baseline yang dapat diulang beserta perintah, fixture, lingkungan, dan jumlah sampel.
- Tidak ada hasil dev/fixture yang diberi label sebagai hasil production atau hasil perangkat mahasiswa.

### Fase 1 — Validasi tugas mahasiswa (parsial)

**Pekerjaan**

1. Rekrut 5–8 mahasiswa secara sukarela untuk sesi formatif; lakukan persetujuan dan anonimisasi catatan.
2. Berikan tugas tanpa tutorial langkah demi langkah: membuat Workspace, memulai bantuan AI setelah membaca consent, melampirkan sumber, meminta jawaban bersitasi, membuat/edit/menyimpan artifact di Canvas, membuka versi lama, mengekspor, membuat plan agen, lalu meninjau atau menolak proposal.
3. Catat keberhasilan tanpa bantuan, waktu, salah klik, istilah yang membingungkan, titik kehilangan konteks, serta pemahaman atas tindakan AI dan penyimpanan.
4. Kelompokkan hambatan sebagai blocker privasi/data, blocker alur, atau polish; perbaiki blocker sebelum mengulang tugas.

**Kriteria keluar yang diusulkan**

- Tidak ada blocker keselamatan, privasi, atau kehilangan data yang terbuka.
- Sedikitnya 80% peserta formatif (minimal 4 dari 5) dapat menyelesaikan setiap alur kritis tanpa bantuan moderator; bila target gagal, perbaiki alur dan ulangi sesi.
- Peserta dapat membedakan draft lokal, simpan server, dan persetujuan menjalankan AI/agen.

**Ketergantungan**: fasilitator, persetujuan, skenario, dan build staging yang memakai data uji.

### Fase 2 — Pengalaman awal, consent, responsif (implementasi selesai; validasi aksesibilitas lanjut)

**Pekerjaan yang sudah tercatat**: consent AI, starter, dan respons layar 320/375 px.

**Pekerjaan lanjutan**

1. Periksa tab order, nama/role tombol, fokus modal dan pemulihan fokus, kontras, zoom 200%, serta pembaca layar.
2. Ulangi walkthrough pada lebar 320, 375, 768, dan desktop, dalam tema terang/gelap.
3. Masukkan hambatan dari fase 1 ke prioritas perbaikan.

**Kriteria keluar**: tidak ada overflow horizontal pada ukuran target; semua aksi utama dapat dicapai dengan keyboard; dialog memindahkan dan mengembalikan fokus; teks consent dapat dipahami dan tidak membuat tindakan AI tersamarkan.

### Fase 3 — Manajemen Workspace dan pencarian (implementasi selesai; regresi berkelanjutan)

**Pekerjaan yang sudah tercatat**: daftar dan pencarian memakai paginasi/cursor serta cakupan per pengguna; pencarian bertahap tidak menganggap jendela awal sebagai seluruh hasil.

**Pemeriksaan lanjutan**

1. Uji halaman kosong, tepat pada batas halaman, halaman terakhir, penghapusan, dan perubahan query saat cursor lama masih ada.
2. Uji isolasi pemilik pada Workspace, pesan, artifact terenkripsi, nama file, dan attachment.
3. Pastikan loading/error/empty states menyebut cakupan pencarian dengan benar.

**Kriteria keluar**: cursor dari query lama tidak bercampur dengan query baru; tidak ada data lintas pengguna; semua hasil bisa dicapai tanpa limit tersembunyi.

### Fase 4 — File, konteks, dan sitasi (implementasi utama selesai; jalur retrieval produksi terbuka)

**Pekerjaan yang sudah tercatat**: batas file/chunk dijaga, ekstraksi parsial ditandai, file besar dipindai terhadap instruksi berbahaya dengan jendela overlap, dan sitasi/sumber dapat ditinjau.

**Pekerjaan lanjutan**

1. Instrumentasikan waktu secara terpisah untuk load metadata, query DB, decrypt, cache hit/miss, chunk retrieval, sanitasi, dan perakitan konteks. Jangan catat isi dokumen atau rahasia.
2. Jalankan fixture sintetis 1, 4, dan 8 attachment; variasikan ukuran, tipe, jumlah chunk, file rusak, duplikat, dan cache dingin/hangat.
3. Uji pembatalan request, retry, penghapusan ketika ingest berjalan, dan scope `userId/chatId` pada staging.
4. Pastikan label ekstraksi parsial dan asal sitasi terlihat setelah refresh.

**Kriteria keluar**: tidak ada kebocoran antar pengguna/Workspace; hasil tidak memuat chunk dari file tak terpilih; profil latency cache miss dan decrypt nyata tersedia; batas parsial terlihat; ambang p95 disepakati pemilik produk setelah perangkat/server representatif dipilih.

### Fase 5 — Canvas, versi, ekspor (fitur utama selesai; input besar perlu profiling)

**Pekerjaan yang sudah tercatat**: draft, status simpan, versi, konflik versi, patch, penghapusan, dan ekspor.

**Pekerjaan lanjutan**

1. Buat probe production preview untuk dokumen 1 KB, 50 KB, dan ukuran realistis maksimum.
2. Pisahkan pengukuran open, mount editor, ketik satu karakter, paste clipboard, replace-all, format Markdown, autosave, dan buka versi.
3. Ulangi pada Chromium dengan CPU throttling dan pada satu laptop/ponsel kelas rendah; rekam profiler, long task, heap, dan jank.
4. Jika profiling menunjukkan render controlled-input sebagai hotspot, buat prototipe editor/draft terpisah dan bandingkan dengan versi saat ini.
5. Untuk setiap prototipe, uji selection AI, autosave, refresh/recovery, version conflict, undo/redo, dan perubahan Workspace saat simpan berjalan.

**Kriteria keluar**: tidak ada kehilangan karakter/draft; versi dan conflict guard tetap benar; metrik interaksi tercatat pada perangkat representatif; perubahan editor dipilih hanya jika A/B menunjukkan peningkatan tanpa regresi alur.

### Fase 6 — Plan dan eksekusi agen (fitur utama selesai; pertahankan gerbang manusia)

**Pemeriksaan lanjutan**

1. Uji plan kosong/tidak valid, tool gagal, timeout, pembatalan, recovery, duplikasi run, dan hasil parsial.
2. Pastikan side effect eksternal hanya terjadi setelah langkah persetujuan yang tepat.
3. Uji perubahan artifact/Workspace di tengah run, pemulihan state, dan review proposal sebelum menyimpan.

**Kriteria keluar**: semua transisi task mempunyai state yang dapat dijelaskan; kegagalan tidak membuat hasil ganda atau artifact diam-diam; pemilik tetap dapat menerima/menolak hasil secara eksplisit.

### Fase 7 — Performa browser dan pemisahan frontend (sedang berjalan)

#### 7.1 Riwayat percakapan dan Markdown

1. Ulangi baseline production pada 50, 100, 250, dan 500 pesan dengan distribusi teks, tabel, kode, gambar, dan panjang pesan realistis.
2. Catat initial ready, waktu memuat cursor, p50/p95, long task, jumlah node, heap, posisi anchor, dan input lag saat stream aktif.
3. Buat prototipe virtualisasi/Markdown on-demand. Jaga tinggi baris variabel, focus/accessibility, pencarian, anchor saat prepend, copy/select, streaming, dan tampilan pesan terbaru.
4. Bandingkan beberapa strategi dalam build production pada mesin normal dan lambat; pilih hanya setelah tidak ada regresi fungsional.

**Kriteria keluar**: seluruh halaman lama tetap dapat dicapai; anchor dan pencarian stabil; tidak ada input atau stream yang tertahan; angka sebelum/sesudah disertai fixture dan perangkat.

#### 7.2 Canvas dokumen besar

1. Profilkan jalur editor 50 KB dengan CPU throttling dan paste clipboard sebenarnya.
2. Temukan event/render mahal di profiler sebelum mengubah model state.
3. Uji prototype hanya pada jalur terukur; pertahankan konten terbaru untuk AI, preview, autosave, dan export.

**Kriteria keluar**: long task dan input latency membaik pada perangkat yang dipilih, tanpa mengorbankan draft atau sinkronisasi versi.

#### 7.3 Preview dan retrieval banyak file

1. Stress test 1/4/8 file, campuran PDF/DOCX/CSV/XLSX/TXT, ukuran kecil dan mendekati batas, cache dingin/hangat.
2. Uji perpindahan cepat A→B→C, tutup modal di tengah request, ubah sheet, pindah halaman, dan error/retry. Pastikan tidak ada hasil dari attachment sebelumnya yang muncul di file baru.
3. Ukur waktu hingga judul/preview awal dan tabel siap, jumlah request, heap puncak, DB/dekripsi, serta cache behavior.
4. Bataskan/virtualisasikan tabel hanya bila profil menunjukkan DOM atau payload menjadi bottleneck.

**Status saat ini**: state modal kini terisolasi berdasarkan attachment ID. Endpoint overview menggabungkan profil serta halaman awal sehingga membuka tabel tidak mem-parse ulang file untuk dua endpoint. Tes route/API/modal dan IDOR lulus. Probe browser tiga konteks × delapan file gagal mencapai startup Vite dalam 60 detik; throughput belum terukur. Retrieval nyata masih terbuka.

**Kriteria keluar**: tidak ada cross-file stale state; pembatalan dan error dapat dipulihkan; latency/heap pada 8 file diketahui pada staging dan perangkat representatif.

#### 7.4 Compare artefak

1. Pertahankan budget LCS exact, fallback yang diberi label perkiraan, halaman 250 baris, dan shortcut perubahan.
2. Uji versi identik, perubahan kecil/lokal, file besar tanpa anchor, banyak baris berulang, dan tiga model.
3. Ulangi browser probe pada production preview dan perangkat lambat; rekam commit/render/long task, bukan hanya microbenchmark helper.
4. Verifikasi pagination tetap mempertahankan total perubahan, navigation, screen reader labels, dan posisi scroll.

**Kriteria keluar**: seluruh diff dapat dijangkau; hasil ambigu disebut perkiraan; beban per halaman tetap dalam ambang yang disetujui; fixture dan fallback diberi regresi uji.

#### 7.5 Pemisahan orkestrator

1. Buat diagram event/state untuk pesan, stream, file, artifact, compare, task, inspector, dan Canvas.
2. Profilkan dependency graph dan rerender sebelum ekstraksi.
3. Ekstrak satu domain per perubahan kecil dengan API controller/hook yang teruji; pertahankan ownership state tunggal dan callback identity.
4. Jalankan tes feature terkait, typecheck, lint, browser regression, dan build setelah setiap ekstraksi.

**Kriteria keluar**: setiap ekstraksi mengurangi coupling/kompleksitas yang terukur dan tidak menaikkan rerender, bundle, atau latency secara tidak sengaja. Pengurangan jumlah baris saja bukan kriteria.

### Fase 8 — Rilis terbatas dan pilot (parsial)

1. Jalankan lint, typecheck, unit, integration, security, E2E, build, migrasi DB, dan review bundle dari kandidat rilis yang sama.
2. Deploy ke staging dengan data sintetis dan kredensial uji; verifikasi auth, provider AI, storage/dekripsi, jaringan, logging tanpa konten sensitif, dan rollback.
3. Lakukan smoke test di perangkat/browser yang disepakati dan skenario offline/timeout/provider failure.
4. Setelah pemilik produk menyetujui, jalankan pilot terbatas dengan mahasiswa, persetujuan jelas, data minim, kanal laporan, dan pemantauan.
5. Tinjau temuan pilot, perbaiki blocker, lalu putuskan lanjut/tunda rilis berdasarkan bukti dan rollback plan.

**Kriteria keluar**: tidak ada temuan P0/P1; backup/restore dan rollback teruji; metrik/error tidak membawa data sensitif; pilot menyelesaikan alur utama tanpa kehilangan data; semua isu yang diterima memiliki owner dan tenggat.

## 5. Protokol pengukuran

1. Gunakan build production dan fixture sintetis yang sama untuk perbandingan sebelum/sesudah.
2. Untuk setiap skenario, lakukan minimal 10 cold run dan 10 warm run; laporkan median, p95, rentang, ukuran sampel, browser, viewport, perangkat, CPU/network profile, dan commit/build yang diukur.
3. Rekam waktu sampai konten siap, interaksi utama, long task, heap, ukuran DOM, request count, dan error. Tambahkan React Profiler hanya pada jalur yang menunjukkan bottleneck.
4. Ulangi pengujian penting pada satu perangkat desktop referensi dan satu perangkat kelas rendah setelah tersedia; jangan mengubah fixture atau browser di tengah A/B.
5. Tentukan ambang rilis bersama pemilik produk setelah baseline perangkat nyata ada. Sebelum itu, sebut nilai sebagai baseline/target usulan, bukan SLA.
6. Jangan mengirim isi pesan, nama file, prompt, token, atau dokumen ke log performa. Gunakan ID sintetis dan agregat.

## 6. Gerbang dan urutan pengerjaan berikutnya

1. **P1 — Selesaikan bukti preview/retrieval**: stress 8 file, rapid switching, cold DB/decrypt di staging. Ini menutup gap file yang paling dekat dengan perubahan preview baru.
2. **P1 — Profil Canvas**: ulangi 50 KB dengan CPU throttling dan clipboard paste, lalu putuskan apakah perlu prototype editor state.
3. **P1 — Riwayat besar**: production preview untuk 500 pesan Markdown bervariasi; prototipe virtualisasi/on-demand hanya setelah profiling.
4. **P2 — Compare production**: ukur diff 3.600 baris dan tiga model pada bundle production/perangkat lemah.
5. **P2 — Ekstraksi orchestrator**: satu boundary per patch, setelah hot path dipahami.
6. **Gate rilis**: staging/provider + perangkat, lalu sesi mahasiswa dan pilot terbatas.

Fase bergantung pada data nyata hanya maju ketika lingkungan tersedia. Hasil simulasi tidak menggantikan DB, provider, jaringan, perangkat, maupun peserta yang sebenarnya.

## 7. Referensi audit dan perubahan

- [Catatan eksekusi dan status fase](WORKSPACE_IMPROVEMENT_EXECUTION.md)
- [Baseline dan hasil pengukuran performa](WORKSPACE_PERFORMANCE_BASELINE.md)
- [Audit keamanan dan roadmap penguatan](SECURITY_AUDIT_AND_ROADMAP.md)
