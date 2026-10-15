# Audit UI/UX dan Rencana Perbaikan RuangKerja

**Status:** perbaikan visual tahap pertama sudah diterapkan; validasi kegunaan langsung masih perlu dilakukan  
**Cakupan:** Beranda RuangKerja, percakapan, composer, panel samping, Canvas, dan layar sempit.

## Ringkasan

RuangKerja sudah memuat kemampuan yang lengkap, tetapi susunan visualnya belum membantu pengguna memahami mana alur utama dan mana alat tambahan. Beranda percakapan awal terasa kosong di tengah latar aurora yang kuat. Ketika Canvas atau panel konteks dibuka, layar dibagi ke beberapa kolom dan fungsi tersebar di header, composer, serta tab panel. Pada ponsel, kontrol composer menjadi sangat rapat dan labelnya terpotong.

Rencana ini memprioritaskan pengurangan beban visual dan penyederhanaan navigasi sebelum perubahan kosmetik. Alur inti tetap: mulai pekerjaan, bertanya atau memberi instruksi, menambahkan konteks bila perlu, lalu meninjau hasil di Canvas.

### Perbaikan yang sudah diterapkan

- Area beranda dan percakapan memakai latar netral yang konsisten supaya isi tidak bersaing dengan aurora.
- Opsi awal percakapan kini punya hierarki yang jelas dan kartu aksi yang konsisten.
- Area percakapan melebar pada desktop tanpa split view, sementara split chat–Canvas tetap mempertahankan dua panel terpisah.
- Empty state Canvas dan panel inspector memakai permukaan solid agar status dan isi mudah dibaca.
- File dan Sumber digabungkan di bawah tab utama Referensi, dengan pemilih yang ringkas di dalam panel.
- Beranda menampilkan deskripsi ringkas pada tiap starter task, dan label mode berulang di header sidebar dihilangkan agar nama merek tidak terpotong.
- Composer mobile mempertahankan kontrol berbentuk ikon dengan nama aksesibel dan indikator saat konteks aktif.

Perubahan ini menangani fokus visual dan pemindaian awal. Uji tugas dengan mahasiswa tetap diperlukan untuk mengonfirmasi apakah struktur navigasi dan istilah panel sudah mudah dipahami.

## Dasar audit

Audit awal dilakukan dengan membaca implementasi `WorkspaceHome`, `StudentWorkspace`, komponen header, composer, percakapan, panel inspector dan Canvas, serta dokumen interaction model. Pemeriksaan visual menggunakan screenshot yang tersedia di `test-artifacts/workspace-layout/after/` pada lebar 1280 px, 375 px, dan desktop dengan Canvas terbuka. Ini adalah audit heuristik berbasis artefak dan kode, bukan sesi uji kegunaan langsung dengan mahasiswa.

## Temuan dan prioritas

| Prioritas | Temuan | Dampak bagi pengguna | Arah perbaikan |
|---|---|---|---|
| P0 | Beranda percakapan awal punya area kosong sangat besar; aurora biru/toska menjadi elemen paling dominan. | Fokus tersedot ke latar, sementara langkah pertama terasa kecil dan tidak jelas. | Netralisasi latar pada area kerja, kuatkan judul dan aksi utama, dan beri isi beranda yang membantu tanpa membuatnya padat. |
| P0 | Navigasi dan alat terbagi antara sidebar, header, composer, dan panel kanan. | Pengguna perlu menebak lokasi fitur seperti konteks, Canvas, sumber, memori, rencana, dan opsi AI. | Tetapkan hierarki: navigasi pekerjaan, area kerja utama, dan satu titik masuk alat pendukung yang konsisten. |
| P0 | Tampilan split chat–Canvas mengurangi lebar kedua area; panel lain memiliki tab Konteks, File, Sumber, Memori, dan Rencana. | Membaca dan membandingkan hasil menjadi sulit, terutama saat dua panel aktif atau layar sedang. | Tentukan aturan layout berdasarkan lebar layar dan tugas; sediakan fokus satu panel serta split view hanya saat ruang cukup. |
| P1 | Composer menggabungkan lampiran, profil/model, konteks, opsi AI, dan kirim dalam satu strip. Pada 375 px, label model dan konteks terpotong. | Aksi utama kurang menonjol dan kontrol sulit dipindai atau diketuk. | Pisahkan input dari kontrol lanjutan; pertahankan aksi lampiran dan kirim, pindahkan pengaturan lain ke menu ringkas dengan label yang tetap terbaca. |
| P1 | Header workspace memakai ikon dan label singkat untuk beberapa panel, sedangkan konteks halaman dan judul workspace mengambil ruang tipis. | Fungsi kontrol tidak langsung jelas, terutama bagi pengguna baru dan pengguna keyboard/pembaca layar. | Beri nama yang konsisten, status aktif yang jelas, dan kelompokkan aksi berdasarkan frekuensi. |
| P1 | Empat starter action ditampilkan di beranda dan ada aksi tambahan tersembunyi di bawah “Lihat aktivitas lainnya”; daftar belum memberi petunjuk berdasarkan maksud pengguna. | Pilihan tetap terasa seperti kumpulan fitur, bukan langkah kerja yang terarah. | Susun starter berdasarkan pekerjaan yang ingin diselesaikan (menulis, membaca sumber, menganalisis, membuat kode) dan ringkas aktivitas sekunder. |
| P1 | Mode desktop dan mobile memakai pola kontrol berbeda; pada mobile navigasi tiga ikon di header dan composer sempit harus bekerja dalam ruang yang terbatas. | Perpindahan perangkat terasa tidak konsisten dan label tindakan lebih mudah hilang. | Definisikan ulang navigasi responsif sebagai tab/panel bernama pada layar sempit dan uji alur sentuh dari awal sampai hasil. |
| P2 | Gaya visual masih mencampur gradien dekoratif, kartu, tombol kecil, border, dan warna aksen pada area yang sama. | Hirarki tindakan utama/sekunder kurang tegas dan tampilan terasa ramai meskipun banyak ruang kosong. | Tetapkan token tipografi, jarak, warna, radius, elevasi, dan aturan penggunaan aksen secara lintas komponen. |

## Prinsip desain yang dituju

1. **Percakapan adalah pusat kerja.** Panel dan pengaturan membantu tugas, tetapi tidak bersaing dengan percakapan atau hasil.
2. **Tampilkan seperlunya.** File, sumber, memori, rencana, Canvas, dan pengaturan AI tersedia saat relevan; detail lanjutan tidak memenuhi layar awal.
3. **Satu bahasa navigasi.** Nama, ikon, status aktif, tombol kembali, dan cara menutup panel mengikuti pola yang sama.
4. **Tata letak mengikuti ruang.** Split view hanya dipakai ketika kedua area tetap nyaman dibaca; layar sempit memakai perpindahan fokus yang jelas.
5. **Status mudah dipahami.** Pengguna selalu tahu konteks yang akan dikirim, file yang siap, Canvas yang aktif, dan apakah draf tersimpan lokal atau di server.
6. **Tenang dan terbaca.** Latar tidak mengalahkan isi, kontras teks dan fokus keyboard konsisten, dan kontrol sentuh memiliki target yang cukup.

## Rencana pengerjaan

### Fase 0 — Validasi alur dan ukur kondisi awal

- Petakan 5 tugas utama: mulai pekerjaan, lanjutkan pekerjaan, lampirkan dan gunakan file, buka/edit Canvas, serta kelola rencana/tugas.
- Tinjau alur tersebut dengan 5–7 mahasiswa yang mewakili pemakaian desktop dan ponsel; catat kebingungan, salah klik, dan titik berhenti.
- Ukur waktu untuk memulai tugas, menemukan file/Canvas, dan mengirim permintaan dengan konteks yang benar.
- Hasil: daftar friksi tervalidasi, prioritas akhir, dan baseline metrik.

### Fase 1 — Rapikan hierarki dan navigasi

- Tetapkan struktur tetap: **Sidebar pekerjaan** (daftar/beranda), **area utama** (percakapan atau Canvas), **panel alat** (konteks, file, sumber, memori, rencana).
- Kurangi kontrol header menjadi tindakan primer yang jelas, dengan menu untuk tindakan jarang.
- Samakan istilah dan ikon di header, panel, sidebar, dan composer; tampilkan panel aktif dengan label dan state yang tegas.
- Buat aturan eksklusivitas dan perpindahan antara Canvas dan panel alat supaya pengguna tidak kehilangan konteks.
- Hasil: peta navigasi dan prototipe low-fidelity desktop/mobile untuk alur utama.

### Fase 2 — Bangun ulang beranda dan composer

- Ubah empty state menjadi titik awal kerja: judul ringkas, satu aksi utama, beberapa template terkurasi, serta akses terlihat ke pekerjaan terakhir dan pencarian.
- Kurangi dominasi aurora; pertahankan warna merek sebagai aksen dan beri kontras lembut untuk area membaca.
- Sederhanakan composer menjadi input dan kirim sebagai fokus; letakkan lampiran dan konteks secara terlihat, sedangkan model dan opsi lanjutan masuk ke satu menu berlabel.
- Pada layar sempit, pastikan nama profil/konteks bisa ditemukan tanpa mengandalkan teks terpotong; gunakan drawer/menu berlabel jika perlu.
- Hasil: desain hi-fi untuk empty, loading, percakapan aktif, streaming, serta composer desktop dan mobile.

### Fase 3 — Susun ulang Canvas dan panel alat

- Tentukan ukuran minimum panel chat dan Canvas; bila lebar tidak cukup, gunakan mode fokus/switch panel alih-alih mengecilkan kedua area.
- Kelompokkan tab panel berdasarkan tujuan: konteks berkas/sumber dan pengelolaan rencana/memori. Validasi nama grup lewat uji tugas.
- Prioritaskan konten paling relevan di tiap tab; kurangi tab bar dan teks bantuan berulang.
- Perjelas indikator konteks aktif dan status simpan; jangan hanya bergantung pada toast atau label singkat.
- Hasil: prototipe Canvas, File/Sumber, Konteks, dan Rencana dengan state kosong, berisi, dan error.

### Fase 4 — Terapkan sistem visual dan aksesibilitas

- Definisikan token untuk tipografi, spacing, ukuran kontrol, warna, border, radius, elevasi, dan gerak.
- Terapkan ukuran teks minimum yang nyaman, target sentuh memadai, state hover/focus/pressed/disabled yang konsisten, serta kontras WCAG AA untuk teks.
- Verifikasi urutan keyboard, nama aksesibel, fokus saat panel dibuka/ditutup, zoom 200%, prefers-reduced-motion, dan mode terang/gelap.
- Hasil: pustaka pola UI RuangKerja dan implementasi yang konsisten pada seluruh breakpoint.

### Fase 5 — Validasi hasil dan iterasi

- Jalankan kembali 5 tugas prioritas pada desktop 1280/1440 px, tablet 768 px, dan ponsel 360/375/390 px.
- Sertakan keadaan kosong, riwayat panjang, file sedang diproses, streaming, Canvas terbuka, panel rencana aktif, dan error pemuatan.
- Bandingkan metrik terhadap baseline dan perbaiki hambatan P0 sebelum pekerjaan polish lanjutan.
- Hasil: catatan uji, daftar isu sisa, screenshot pembanding, dan keputusan rilis.

## Kriteria keberhasilan

- Pengguna uji dapat menemukan cara memulai dan melanjutkan pekerjaan tanpa bantuan.
- Waktu untuk memulai permintaan pertama turun setidaknya 25% dari baseline.
- Minimal 90% peserta uji berhasil membuka Canvas atau memilih file/konteks yang tepat pada percobaan pertama.
- Pada lebar 360 px, tidak ada kontrol primer yang hilang, bertumpuk, atau hanya dapat dipahami dari label terpotong.
- Saat Canvas dibuka, isi editor dan percakapan tetap dapat dibaca; perpindahan ke mode fokus tidak kehilangan draf atau posisi.
- Semua kontrol utama dapat dicapai dengan keyboard dan memiliki fokus yang terlihat; kontras teks memenuhi WCAG AA.

## Urutan prioritas untuk backlog

1. **P0:** kurangi dominasi latar; tetapkan navigasi utama/panel; aturan layout Canvas dan panel pada lebar terbatas.
2. **P1:** rapikan composer ponsel; perjelas header; susun ulang empty state dan starter tasks.
3. **P2:** satukan token visual, micro-interaction, dan polish setelah alur tervalidasi.

## Area implementasi yang kemungkinan terlibat

- `src/features/workspace/WorkspaceHome.tsx`
- `src/features/workspace/StudentWorkspace.tsx`
- `src/features/workspace/components/WorkspaceHeader.tsx`
- `src/features/workspace/components/WorkspaceComposer.tsx`
- `src/features/workspace/components/WorkspaceInspectorPanel.tsx`
- `src/features/workspace/components/WorkspaceCanvasPane.tsx`
- `src/features/workspace/components/WorkspaceConversation.tsx`
- `src/index.css`

Perubahan perilaku yang sudah dijelaskan di `docs/WORKSPACE_INTERACTION_MODEL.md`—termasuk penyimpanan draf, pemilihan konteks, aksesibilitas panel, dan batas state Workspace—perlu dipertahankan saat implementasi.
