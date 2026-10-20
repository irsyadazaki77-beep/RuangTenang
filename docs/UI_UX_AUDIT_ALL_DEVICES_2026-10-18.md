# Audit UI/UX RuangTenang — seluruh area produk dan kelas device

Tanggal: 18 Oktober 2026 (Asia/Jakarta). Objek: source workspace saat audit, melalui Vite lokal `127.0.0.1:5173`.

## Keputusan

**Belum layak dinyatakan siap untuk semua device.** Fondasi layout mahasiswa sudah responsif: pada 112 kombinasi halaman, ukuran/orientasi, dan tema Chromium, lebar dokumen tidak melebihi viewport. Namun, tidak adanya scrollbar horizontal belum membuktikan UI dapat dipakai: ada isi yang terpotong, popover keluar layar, fokus keyboard pada elemen tersembunyi, serta header konselor yang kehilangan kontrol.

Desktop dan tablet cukup baik untuk penggunaan dasar dengan mouse, tetapi kelayakan menyeluruh masih bersyarat. Ponsel kecil, layar pendek/landscape, dan portal konselor mobile memerlukan perbaikan sebelum direkomendasikan untuk penggunaan luas. Masalah data kosong, label, fokus, dan kontras berlaku lintas device.

Temuan dibagi menjadi **8 kelompok P1**, **7 kelompok P2**, dan **1 kelompok P3**. Ini jumlah kelompok masalah, bukan penjumlahan seluruh hasil axe. Tidak ada P0 yang terverifikasi dalam cakupan audit ini; pernyataan tersebut bukan jaminan seluruh sistem bebas masalah kritis.

## Cara pemeriksaan dan batas bukti

- Membaca routing, shell, komponen, CSS, dan pengaturan pengujian yang ada.
- Membuka dan mengoperasikan UI dengan Playwright. Pemeriksaan utama: 8 halaman × 11 viewport/orientasi dalam tema terang, ditambah 8 halaman × 3 viewport dalam tema gelap = **112 kombinasi**.
- Memeriksa 8 halaman tambahan pada Firefox dan WebKit, masing-masing di 390×844 dan 1440×900. Ini pemeriksaan engine desktop dengan viewport representatif, **bukan pengujian perangkat iPhone/Safari fisik**.
- Menjalankan axe pada halaman/state terpilih, memeriksa hasil terhadap screenshot dan source, serta merekam ukuran dan posisi kontrol.
- Menelusuri Tab pada sidebar tertutup/terbuka dan beberapa modal; mencoba form, PIN, onboarding, profil konselor, pengaturan, editor Canvas, dan state API gagal.
- Menambahkan enam pemeriksaan percakapan terisi pada 320, 390, dan 1440 px: RuangTenang dan RuangKerja dengan paragraf panjang, tabel Markdown, kode panjang, serta tautan tanpa spasi. Tidak ditemukan overflow dokumen pada enam state tersebut; temuan kontras, heading, dan area scroll tetap muncul.
- Menggunakan respons API sintetis yang diintersep di browser untuk tampilan tamu, mahasiswa, konselor, dan admin kampus. Tidak mengubah akun, database, jadwal, atau catatan pengguna. Hasil audit ini menilai **UI dan state presentasi**, bukan validasi integrasi backend produksi.
- Mengecilkan tinggi viewport untuk memeriksa layout pendek. Ini **proxy**, bukan simulasi lengkap keyboard virtual, browser toolbar dinamis, atau safe area hardware.
- Scanner geometris juga mencatat bentuk dekoratif di luar viewport serta item dalam scroller horizontal yang memang disengaja. Keduanya tidak otomatis dinyatakan bug. Temuan di bawah dipilih setelah pemeriksaan konteks.
- Axe tidak menggantikan audit aksesibilitas manual penuh. Tidak diberikan sertifikasi WCAG, skor usability numerik, atau skor performa dari dev server.

Belum diuji pada hardware nyata: VoiceOver/TalkBack/NVDA, pinch zoom dan pembesaran teks OS, keyboard iOS/Android, notch/safe area, stylus, split-screen OS, koneksi seluler nyata, CPU/perangkat lambat, serta browser lama. Belum divalidasi end-to-end: pengiriman AI/streaming produksi, OTP/email, pemesanan dan pembatalan nyata, notifikasi push, panggilan video, ekspor seluruh format, serta setiap varian dokumen/file dan data sangat besar. Area tersebut masuk gerbang QA akhir, bukan dianggap lulus.

## Penilaian per device

“Bersyarat” berarti layout dasar bisa digunakan pada state yang diperiksa, tetapi masalah lintas perangkat masih perlu ditutup.

| Kelas device | Viewport CSS yang diperiksa | Penilaian | Masalah utama / keputusan layout |
|---|---|---|---|
| Ponsel sangat kecil | 320×568 | **Belum layak** | Hero chat terpotong; popover model melewati kanan layar; filter konselor terdesak; ruang form sempit. |
| Android kecil | 360×800 | **Bersyarat** | Alur dasar muat; tetap terkena fokus tersembunyi, label dan kontras; navigasi horizontal memerlukan petunjuk. |
| Ponsel standar | 390×844 | **Bersyarat** | Drawer dan input dasar cukup baik; modal, keterbacaan, dan portal konselor perlu diperbaiki. |
| Ponsel besar | 430×932 | **Bersyarat** | Lebar cukup untuk halaman mahasiswa; masalah komponen bersama tetap berlaku. |
| Ponsel landscape / layar pendek | 844×390 | **Belum layak** | Judul dan bagian mood pembuka chat terpotong; elemen tetap mengambil proporsi tinggi layar besar. |
| Tablet portrait | 768×1024, 820×1180 | **Bersyarat** | Layout kolom masuk akal; breakpoint `sm` mengecilkan beberapa kontrol meski tablet masih disentuh dengan jari. |
| Tablet landscape / laptop kecil | 1024×768 | **Bersyarat** | Sidebar desktop mulai aktif dan memakai 256 px; kepadatan serta kontrol perlu ditinjau saat ruang kerja menyempit. Ini uji viewport, bukan semua mode tablet. |
| Laptop | 1280×800 | **Bersyarat; relatif paling siap** | Hierarki utama cukup stabil; data kosong, kontras, label dan fokus tetap menghalangi kelayakan penuh. |
| Desktop | 1440×900, 1920×1080 | **Bersyarat; relatif paling siap** | Tidak ditemukan overflow dokumen pada matriks; kontras beberapa teks kecil gagal. Perlu batas lebar baca dan konsistensi komponen. |

Mode gelap diperiksa pada 390, 768, dan 1440 px. Tema gelap memperbaiki sebagian pasangan warna, tetapi tidak memperbaiki label, fokus, popover, dan penyajian data kosong. Jangan menyamakan kelulusan satu tema dengan tema lainnya.

## Area produk yang ditinjau

| Area | Cakupan pemeriksaan | Penilaian |
|---|---|---|
| Navigasi global | Sidebar, perpindahan mode, header, tema, Tab, SOS entry | Struktur jelas; masalah fokus dan ukuran target. |
| RuangTenang | Empty state, percakapan terisi sintetis, pilihan mood, starter prompt, composer, pemilih model, viewport pendek | Baik di portrait standar; gagal pada beberapa state layar kecil/pendek. |
| Beranda RuangKerja | Pencarian, daftar kosong, starter tasks | Struktur sederhana; masih perlu landmark dan hierarki semantik. |
| RuangKerja | Percakapan kosong/terisi sintetis, perpindahan Canvas/Panel, split desktop, draf dokumen lokal | Adaptasi panel sudah baik; kontrol kecil dan QA dokumen kompleks masih perlu. |
| Mood & jurnal | Dashboard kosong, filter bagian, tren kosong, modal daily check-in | Kepadatan tinggi; data kosong menyesatkan; fokus modal dan label bermasalah. |
| Tenang Mandiri | Soundscape dan navigasi workshop | Muat; sebagian tab di luar area terlihat tanpa affordance kuat. |
| Skrining | Pengantar, PIN, pertanyaan pertama | Struktur bertahap baik; kontras CTA dan aksesibilitas PIN perlu perbaikan. Hasil seluruh jawaban tidak divalidasi dalam audit ini. |
| Direktori & konseling | Satu profil sintetis bernama panjang, filter, detail profil, pembuka booking | Filter compact bermasalah, modal perlu standardisasi, alur 3/4 langkah tidak konsisten. |
| Bantuan darurat | Hirarki tindakan dan form kontak | Aksi utama cukup menonjol; label relasi belum terhubung. Tidak mengaktifkan SOS atau memanggil layanan. |
| Autentikasi | Modal masuk dan registrasi | Form dasar menyesuaikan layar; semantik dialog perlu disatukan. OTP, SSO, reset, dan MFA belum dituntaskan end-to-end. |
| Onboarding | Empat tahap, navigasi, consent visual | Bisa dijalankan; kontras dan semantik overlay perlu diperbaiki. |
| Pengaturan | Akun, AI, notifikasi, privasi, memory, keamanan, langganan, versi | Pola daftar → detail pada mobile baik; kontras rendah tersebar dan target kembali kecil. |
| Bilik privasi | Setup PIN, unlock PIN | Alur berfungsi pada data lokal sintetis; tombol tutup tanpa nama aksesibel, semantik/fokus perlu disatukan. |
| Portal konselor | Dashboard, triase kosong, SOAP editor, riwayat/analitik terpilih | Desktop cukup tertata; header mobile tidak layak; label form perlu perbaikan. |
| Admin kampus | Data kosong, satu konselor sintetis, form pengaturan | Layout adaptif dan label dasar cukup baik; raw JSON/IANA/hex kurang sesuai untuk admin operasional. |

## Temuan dan perbaikan konkret

### F01 — P1 — Belum ada tes ditampilkan sebagai skor 0 dan kategori Minimal

**Terbukti:** pada `/mood`, kartu atas menyatakan “Belum pernah tes”, tetapi bagian tren menunjukkan PHQ-9 `0/27`, GAD-7 `0/21`, kategori Minimal, dan rekomendasi kondisi relatif stabil. Ini masalah representasi state kosong, terlepas dari penilaian klinis.

Sumber: [UserProgressTracker.tsx](../src/features/mood/UserProgressTracker.tsx) baris 239–241; [ScreeningTrend.tsx](../src/features/mood/ScreeningTrend.tsx) bagian kartu skor dan rekomendasi.

Bukti: [desktop dengan dua state yang bertentangan](../output/ui-ux-audit-2026-10-18/screenshots/1440-mood-empty-screening.png).

**Perbaikan:** gunakan `null`/state eksplisit untuk hasil yang belum ada. Tampilkan “Belum ada hasil skrining”; rekomendasi berbasis skor muncul hanya ketika ada hasil valid. Bedakan kosong, gagal dimuat, dan skor aktual nol.

**Lulus jika:** akun tanpa tes tidak memperoleh kategori atau rekomendasi hasil; hasil tes valid bernilai nol tetap ditampilkan sebagai hasil nyata.

### F02 — P1 — Sidebar tertutup tetap menerima fokus keyboard

**Terbukti:** Tab dapat menuju tombol Chat Baru, Tutup Sidebar, pilihan mode, pencarian, notifikasi, dan bantuan dengan koordinat x negatif. Sidebar dipindahkan menggunakan transform, tetapi elemen di dalamnya tetap berada dalam urutan fokus.

Sumber: [Sidebar.tsx](../src/components/layout/Sidebar.tsx), container `<aside>` sekitar baris 204.

Bukti: [rekaman fokus sidebar tertutup](../output/ui-ux-audit-2026-10-18/320-closed-sidebar-keyboard.json).

**Perbaikan:** saat drawer mobile tertutup, keluarkan isinya dari interaksi/fokus, misalnya dengan `inert` sesuai state breakpoint. Saat terbuka, kelola fokus dan latar; saat tutup, kembalikan fokus ke pemicu. Jangan menggunakan `aria-hidden` saja untuk elemen yang masih bisa difokuskan.

**Lulus jika:** pada viewport mobile, Tab tidak pernah masuk sidebar tertutup; Tab/Shift+Tab dalam drawer terbuka tetap terkelola dan Escape mengembalikan fokus.

### F03 — P1 — Perilaku modal belum konsisten; fokus dapat berjalan ke halaman belakang

**Terbukti:** sesudah membuka Daily Check-in, rangkaian Tab mencapai tombol laporan, filter, dan kontrol halaman belakang. Pada detail konselor, Tab juga melewati form/modal menuju konten dan sidebar tersembunyi. Daily Check-in memiliki `role="dialog"`, tetapi atribut tersebut sendiri tidak mengelola fokus. Beberapa overlay lain belum memakai semantik dialog yang seragam.

Sumber: [DailyCheckinModal.tsx](../src/features/mood/DailyCheckinModal.tsx), [CounselorDirectory.tsx](../src/features/counselors/CounselorDirectory.tsx), [VaultPinModal.tsx](../src/features/privacy/VaultPinModal.tsx), [BookingForm.tsx](../src/features/appointments/BookingForm.tsx).

Bukti: [Tab pada check-in](../output/ui-ux-audit-2026-10-18/320-mood-log-keyboard.json), [Tab pada profil konselor](../output/ui-ux-audit-2026-10-18/320-profile-keyboard.json), [screenshot modal](../output/ui-ux-audit-2026-10-18/screenshots/320-mood-log.png).

**Perbaikan:** gunakan satu primitive Dialog/Drawer dengan nama dialog, initial focus, focus containment, pemulihan fokus, Escape, penguncian scroll, dan latar inert. Ikuti penanganan modal bertumpuk yang disengaja. Pertahankan pola yang sudah lebih lengkap pada SafetyCheckModal sebagai referensi internal.

**Lulus jika:** semua modal utama dapat dioperasikan hanya dengan keyboard, fokus tidak keluar saat modal aktif, dan kembali ke pemicu setelah tutup.

### F04 — P1 — Kontrol penting tidak memiliki nama/label aksesibel

**Terbukti melalui axe dan source:** tombol Filter compact di direktori, select kebutuhan, select hubungan kontak darurat, tombol tutup PIN, sebagian input daily check-in, dan select risiko/rujukan pada SOAP. Label visual yang berdiri sendiri tidak selalu terhubung ke kontrol.

Bukti: [direktori](../output/ui-ux-audit-2026-10-18/390-844-light-counselors.json), [darurat](../output/ui-ux-audit-2026-10-18/390-844-light-emergency.json), [PIN](../output/ui-ux-audit-2026-10-18/390-vault-pin.json), [SOAP](../output/ui-ux-audit-2026-10-18/390-soap-editor.json).

**Perbaikan:** hubungkan `label htmlFor` dan `id`, atau wrapped label; beri `aria-label` pada tombol ikon. Cantumkan petunjuk dan error melalui `aria-describedby`, serta `aria-invalid` saat perlu. Placeholder tidak dijadikan satu-satunya label.

**Lulus jika:** tidak ada pelanggaran `button-name`, `label`, atau `select-name` pada alur utama, dan nama kontrol masuk akal saat dibaca screen reader.

### F05 — P1 — Token warna menghasilkan kontras teks di bawah target

**Terbukti:** teks `text-muted` pada putih terukur **2,58:1**; putih pada beberapa tombol/badge `bg-teal-600` terukur **3,66:1**. Keduanya muncul pada teks kecil yang membutuhkan 4,5:1. Contoh: nama kampus, deskripsi pengaturan AI, badge dan CTA tertentu. Nilai berasal dari computed colors pada hasil axe, bukan estimasi screenshot.

Sumber: [index.css](../src/index.css) sekitar baris 280 dan pemakaian utility warna pada komponen.

Bukti: [preferensi AI tablet](../output/ui-ux-audit-2026-10-18/768-settings-PreferensiAI.json), [direktori desktop](../output/ui-ux-audit-2026-10-18/1440-900-light-counselors.json).

**Perbaikan:** pisahkan token teks informatif, teks sekunder, dekorasi, dan warna tombol. Gunakan warna CTA/foreground yang lolos pasangan aktual. Jaga permukaan baca cukup stabil di atas aurora. Verifikasi terang dan gelap secara terpisah.

**Lulus jika:** seluruh teks informatif normal memenuhi 4,5:1 dan teks besar yang memenuhi definisinya 3:1. Jangan memasukkan tombol disabled atau dekorasi sebagai kegagalan yang sama.

### F06 — P1 — Empty state chat kehilangan bagian atas di layar pendek

**Terbukti:** di 320×568 judul chat berada sebagian di bawah header; di 844×390 bagian judul dan mood di atas area terlihat. Empty state yang dipusatkan vertikal menjadi lebih tinggi dari ruang tersedia.

Sumber: [MainChat.tsx](../src/features/chat/components/MainChat.tsx) sekitar baris 738–758; [EmptyChatState.tsx](../src/features/chat/components/EmptyChatState.tsx).

Bukti: [320×568](../output/ui-ux-audit-2026-10-18/screenshots/320-568-light-chat.png), [844×390](../output/ui-ux-audit-2026-10-18/screenshots/844-390-light-chat.png).

**Perbaikan:** gunakan perataan ke atas saat konten tidak muat, padding atas yang jelas, scroller dengan `min-height: 0`, dan composer yang mendapat ruang sendiri. Kurangi elemen pembuka pada viewport pendek tanpa menyembunyikan kemampuan utamanya.

**Lulus jika:** judul, pilihan awal, dan composer dapat dijangkau penuh pada 320×568, landscape, dan perubahan tinggi saat keyboard fisik/virtual diuji.

### F07 — P1 — Popover model chat keluar layar 320 px

**Terbukti:** popover berlebar tetap `w-72` berawal di kanan tombol menu, sehingga sisi kanannya terpotong pada 320 px. Label dan indikator paling kanan melewati viewport.

Sumber: [ChatHeader.tsx](../src/features/chat/components/ChatHeader.tsx) baris 122.

Bukti: [popover 320 px](../output/ui-ux-audit-2026-10-18/screenshots/320-chat-model.png).

**Perbaikan:** pada layar kecil gunakan sheet atau popover yang dibatasi viewport dan diposisikan dengan collision detection. Tambahkan batas tinggi serta scroll internal untuk viewport pendek.

**Lulus jika:** seluruh opsi dan indikator aktif terlihat serta bisa dioperasikan pada 320 px, tanpa isi tertutup atau harus scroll halaman secara horizontal.

### F08 — P1 — Header konselor tidak responsif di mobile

**Terbukti:** di 390 px, header fixed-height membungkus label navigasi sampai y negatif; tombol Keluar mulai pada x≈386 dengan lebar 34 px dan sebagian besar berada di luar layar. Lebar dokumen tetap 390 px karena parent menggunting isi; test overflow dokumen saja tidak menangkap masalah ini.

Sumber: [CounselorShell.tsx](../src/components/CounselorShell.tsx) baris 52 dan area brand, switcher, quick actions.

Bukti: [SOAP mobile](../output/ui-ux-audit-2026-10-18/screenshots/390-soap-editor.png), [koordinat kontrol](../output/ui-ux-audit-2026-10-18/390-soap-editor.json).

**Perbaikan:** sediakan header mobile khusus: brand singkat dan menu akun di baris pertama; navigasi peran di baris kedua atau drawer. Gunakan `min-width: 0`, truncate hanya metadata yang aman, dan tinggi yang mengikuti konten. Akses keluar/pengaturan harus tetap jelas.

**Lulus jika:** pada 320–430 px semua kontrol utama berada di dalam layar; nama panjang tidak merusak header; navigasi tidak terpotong secara vertikal.

### F09 — P2 — Toolbar filter direktori terdesak pada 320 px

**Terbukti:** tombol filter berada di x≈301 dengan lebar 36 px sehingga melampaui area 320 px. Lebar search/select/sibling dalam satu baris tidak menyisakan ruang yang memadai.

Sumber: [CounselorDirectory.tsx](../src/features/counselors/CounselorDirectory.tsx), bagian Filter Controls sekitar baris 94–120.

Bukti: [direktori 320](../output/ui-ux-audit-2026-10-18/screenshots/320-568-light-counselors.png).

**Perbaikan:** pindahkan filter menjadi baris tersendiri atau grid `minmax(0,1fr) auto`, kontrol full-width ketika perlu, dan beri label ikon.

**Lulus jika:** search, kebutuhan, dan Filter seluruhnya muat 320 px, termasuk ketika teks membesar atau nama kebutuhan panjang.

### F10 — P2 — Tablet mendapat ukuran kontrol yang terlalu berorientasi desktop

**Terbukti:** sejumlah kontrol menggunakan `sm:min-h-9` atau ukuran sekitar 26–36 px begitu lebar mencapai 640 px; tombol Kembali pada pengaturan tercatat sekitar 57×16 px di mobile. Ini mengurangi kenyamanan sentuh, meskipun tidak setiap ukuran di bawah 44 px otomatis merupakan pelanggaran WCAG.

Sumber: [ChatComposer.tsx](../src/features/chat/components/ChatComposer.tsx), [SidebarFooter.tsx](../src/components/layout/sidebar/SidebarFooter.tsx), [StudentShell.tsx](../src/components/StudentShell.tsx), [ArtifactCanvasToolbar.tsx](../src/features/workspace/components/ArtifactCanvasToolbar.tsx).

**Perbaikan:** buat token ukuran control touch dan compact; gunakan `pointer: coarse` untuk menjaga target sentuh utama sekitar 44×44 px, termasuk tablet. Tetap evaluasi minimum WCAG 24×24 beserta pengecualian jaraknya secara benar.

**Lulus jika:** tombol utama mudah disentuh pada 768–1024 px; hit area tidak bertumpuk; target kecil yang tersisa ditinjau beserta jarak dan pengecualiannya.

### F11 — P2 — Dashboard mood terlalu padat untuk tujuan harian mobile

**Observasi UX:** tab default “Semua Bagian” menumpuk ringkasan, metrik mood, heatmap, analisis, riwayat, tren skrining, checklist, kuota AI, dan izin. Banyak judul/CTA berulang. Ini membuat tujuan sederhana “catat mood hari ini” bersaing dengan informasi sekunder dan memperpanjang halaman.

Sumber: [UserProgressTracker.tsx](../src/features/mood/UserProgressTracker.tsx), [MoodTracker.tsx](../src/features/mood/MoodTracker.tsx), [ScreeningTrend.tsx](../src/features/mood/ScreeningTrend.tsx).

**Perbaikan:** default mobile ke ringkasan hari ini dan satu CTA check-in; tampilkan tren dan riwayat melalui bagian yang jelas. Satukan metrik/CTA duplikat. Body penting disarankan 14–16 px; metadata 12–13 px, dengan validasi desain aktual. Ini rekomendasi keterbacaan, bukan batas ukuran font WCAG.

**Lulus jika:** pengguna baru dapat menemukan check-in, hasil terakhir, dan langkah berikut tanpa menelusuri banyak blok analitik. Validasi dengan uji tugas pengguna, bukan penilaian estetika saja.

### F12 — P2 — Tab horizontal menyembunyikan kemampuan tanpa petunjuk kuat

**Terbukti:** pada mobile sebagian tab workshop dan SOAP berada di luar area terlihat; scrollbar disembunyikan. Scroller ini disengaja, sehingga bukan otomatis bug overflow. Masalah UX-nya adalah kemampuan lain mudah tidak ditemukan.

Sumber: [MindfulnessWorkshop.tsx](../src/features/mood/MindfulnessWorkshop.tsx) baris 342; [CounselorPortal.tsx](../src/features/counselor-portal/CounselorPortal.tsx) baris 248.

**Perbaikan:** beri petunjuk geser/tepi terpotong yang konsisten, menu pilihan bagian, atau tab yang dapat membungkus. Jika diperlakukan sebagai tab, lengkapkan tablist, selected state, hubungan panel, dan interaksi keyboard sesuai pola yang dipilih.

**Lulus jika:** semua bagian dapat ditemukan dan dijangkau melalui sentuhan serta keyboard, tanpa harus menebak adanya isi di kanan.

### F13 — P2 — Pemesanan menjanjikan tiga langkah, form memakai empat

**Terbukti:** banner direktori menjelaskan 1–2–3, tetapi booking membuka “Langkah 1 dari 4”. Setelah memilih konselor dari direktori, pengguna kembali melihat tahap pilih konselor meski sudah terpilih. Pemilihan dipertahankan, tetapi alurnya terasa berulang.

Sumber: [studentRoutes.tsx](../src/app/routes/studentRoutes.tsx), banner konselor; [BookingForm.tsx](../src/features/appointments/BookingForm.tsx) baris 118–120 dan stepper.

Bukti: [form booking](../output/ui-ux-audit-2026-10-18/screenshots/390-booking-form.png).

**Perbaikan:** sepakati satu model langkah. Bila konselor dipilih dari direktori, lanjutkan ke jadwal dengan ringkasan konselor dan opsi Ganti. Jelaskan kapan pengguna perlu masuk sebelum alur panjang dimulai.

**Lulus jika:** label jumlah langkah sama di semua titik, pilihan tidak perlu diulang, dan kembali ke tahap sebelumnya mempertahankan input.

### F14 — P2 — Admin kampus diminta mengisi JSON, zona IANA, dan kode hex

**Terbukti dari form:** pengaturan kontak darurat berupa textarea JSON; zona waktu dan warna berupa string teknis. Layoutnya menyesuaikan layar, tetapi operasinya memerlukan pengetahuan format yang sebaiknya tidak menjadi beban admin kampus.

Sumber: [CampusAdminPortal.tsx](../src/features/campus-admin/CampusAdminPortal.tsx) baris 216–239.

**Perbaikan:** gunakan daftar kontak dengan Tambah/Hapus, field nama/telepon/URL, validasi per baris; dropdown WIB/WITA/WIT dengan mapping internal; color picker dan preview branding. Metadata teknis cukup menjadi mode lanjutan bila masih diperlukan.

**Lulus jika:** admin dapat mengubah kontak, zona, dan warna tanpa menulis sintaks JSON/IANA/hex; error menunjuk field yang harus diperbaiki dan draf tidak hilang.

### F15 — P2 — Landmark, judul, dan semantik halaman belum seragam

**Terbukti:** axe melaporkan ketiadaan landmark main pada chat/beranda workspace/portal konselor, konten di luar landmark, serta judul utama yang belum tersedia pada state workspace tertentu. Beberapa heading melompati tingkat.

Bukti: [chat](../output/ui-ux-audit-2026-10-18/390-844-light-chat.json), [workspace](../output/ui-ux-audit-2026-10-18/390-844-light-workspace.json), [SOAP](../output/ui-ux-audit-2026-10-18/390-soap-editor.json).

**Perbaikan:** sediakan satu landmark main pada shell konten, heading utama yang masuk akal, skip link, serta navigasi yang diberi nama. Beri struktur pengaturan/portal yang konsisten. Hindari menambahkan banyak main bersarang pada layout yang sudah memiliki main.

**Lulus jika:** pembaca layar dapat melompat langsung ke konten dan mengenali halaman aktif; pemeriksaan landmark dan heading utama tidak lagi bermasalah pada state yang diaudit.

### F16 — P3 — Fallback gambar dan bahasa produk perlu dirapikan

**Terbukti pada state foto kosong sintetis:** direktori menampilkan ikon gambar rusak/alt yang membungkus. Selain itu terdapat campuran label seperti Daily Check-in, Memory, SOAP, dan istilah teknis enkripsi pada area yang tingkat kebutuhan bahasanya berbeda.

Sumber: [CounselorDirectory.tsx](../src/features/counselors/CounselorDirectory.tsx), `<img>` sekitar baris 212 dan 284; UI pengaturan/check-in/portal.

**Perbaikan:** gunakan Avatar dengan fallback inisial saat foto kosong/gagal; satukan istilah mahasiswa dalam bahasa Indonesia; istilah klinis tetap dapat dipakai pada portal konselor dengan penjelasan bila diperlukan. Detail implementasi enkripsi ditempatkan pada informasi bantuan yang relevan.

**Lulus jika:** tidak ada gambar rusak saat URL hilang/gagal; nama panjang dan istilah utama tetap jelas pada layar kecil.

## Hal yang sudah baik dan sebaiknya dipertahankan

- Pemisahan RuangTenang dan RuangKerja jelas serta dapat berpindah dari sidebar.
- Composer tetap dapat dijangkau pada ukuran portrait yang diperiksa; ukuran teks input mobile chat 16 px sudah tepat sebagai fondasi.
- Canvas/Panel berpindah menjadi tampilan mobile dan dapat terbuka berdampingan pada desktop; pengguna tidak dipaksa memakai tiga panel sempit sekaligus.
- Pengaturan mobile menggunakan pola daftar lalu detail, sementara desktop menggunakan navigasi samping.
- Banyak input/CTA utama sudah memiliki minimum tinggi 44 px pada mobile.
- Ada pengantar skrining, tahap persetujuan AI, PIN, dan jalur bantuan. Audit ini menilai kejelasan UI-nya, bukan mengesahkan keamanan atau kesesuaian klinis.
- Source memiliki dukungan reduced motion dan focus-visible. Perlu diterapkan konsisten pada semua komponen.
- State gagal direktori menyediakan pesan dan tindakan retry pada skenario API gagal yang disimulasikan.

## Rencana perbaikan yang disarankan

Estimasi berikut adalah estimasi awal effort, belum komitmen jadwal. Asumsi satu frontend engineer dengan dukungan review desain/QA. Total sekitar **12–18 hari kerja**, atau kurang lebih **3–4 minggu kalender** dengan review dan pengujian device. Pengujian integrasi/backend terpisah dapat menambah waktu bila menemukan masalah baru.

| Tahap | Urutan | Pekerjaan | Output yang dapat direview | Estimasi |
|---|---|---|---|---|
| 1. Hilangkan hambatan utama | F01, F02, F03, F04 | Bedakan data kosong; tutup akses fokus sidebar; primitive dialog/drawer; label kontrol | Alur keyboard benar, data kosong jujur, form bernama | 3–5 hari |
| 2. Stabilkan lintas device | F05, F06, F07, F08, F09, F10 | Token kontras, layout chat pendek, popover adaptif, header konselor mobile, toolbar filter, target touch tablet | Screenshot pembanding untuk 320, 390, 768, 1024, 1440 dan landscape | 3–4 hari |
| 3. Sederhanakan alur dan informasi | F11, F12, F13, F14, F15, F16 | Ringkasan mood mobile, navigasi bagian, booking konsisten, admin nonteknis, landmark, avatar/copy | Alur tugas lengkap dan konsistensi komponen | 4–6 hari |
| 4. Validasi kelayakan | Semua temuan | Regression browser, perangkat nyata, screen reader, keyboard virtual, zoom/teks besar, data panjang/error | Checklist lulus, bukti screenshot, daftar sisa risiko yang disepakati | 2–3 hari |

Untuk perbaikan cepat sebelum perubahan UX lebih besar, prioritaskan F01–F09. Jangan menunggu redesain menyeluruh untuk memperbaiki data kosong, label, fokus, dan elemen di luar layar.

### Fondasi implementasi

1. Satu primitive `Dialog/Drawer` untuk seluruh modal utama; satu kebijakan fokus dan lapisan overlay.
2. Token `Button/IconButton/Input` untuk ukuran compact dan touch, kontras, disabled, serta focus-visible.
3. Pola `Empty / Loading / Error / Populated` yang eksplisit untuk data mood, skrining, workspace, konselor, dan analitik.
4. Shell mahasiswa dan konselor dengan aturan lebar/tinggi yang diuji; jangan hanya menambahkan `overflow-hidden` untuk menghilangkan scrollbar.
5. Header/list/form yang dapat menghadapi nama panjang, data kosong, foto gagal, dan pesan validasi panjang.

### Gerbang penerimaan sebelum dinyatakan layak

- Semua F01–F08 selesai dan divalidasi ulang; pengecualian P2 dicatat dengan alasan dan pemilik tindak lanjut.
- Semua kontrol inti berada di dalam viewport serta dapat dijangkau di 320×568 dan 844×390. Uji bounds komponen selain `document.scrollWidth`.
- Tidak ada fokus pada sidebar tertutup; modal mengelola fokus dan pemulihannya.
- Tidak ada `button-name`, `label`, `select-name`, atau kegagalan kontras pada alur utama yang diuji; lakukan verifikasi manual untuk hasil scanner yang memerlukan konteks.
- Empty state tidak mengarang skor/status/rekomendasi; error tidak menyamar sebagai data kosong.
- Input mobile, dropdown, dan tombol simpan/kirim tetap dapat digunakan saat keyboard nyata terbuka; draf terjaga saat berpindah panel, gagal jaringan, dan kembali dari form.
- Uji perangkat nyata minimal satu Android kecil, satu iPhone, satu tablet, dan satu desktop; gunakan Chrome, Safari, Firefox, dan Edge sesuai perangkat yang tersedia.
- Uji pembesaran teks 200%, reflow/zoom 400% yang relevan, sentuhan, keyboard, dan pembaca layar. Matriks viewport audit ini tidak menggantikan tes tersebut.
- Uji data panjang/ramai: daftar konselor, antrean konselor, riwayat chat, dokumen/table/code Canvas, dan pesan error panjang. Lengkapi integrasi booking, AI, dan video sebelum menilai kelayakan alur tersebut.
- Jalankan uji tugas dengan 5–8 mahasiswa dan beberapa konselor/admin: cari bantuan, catat mood, mulai skrining, pesan sesi, dan lanjutkan pekerjaan. Catat keberhasilan tugas, salah klik, hambatan, dan pemahaman label; tetapkan target berbasis baseline nyata.

## Artefak dan cara mengulang

- [Galeri bukti dan temuan](../output/ui-ux-audit-2026-10-18/index.html)
- [Ringkasan 112 kombinasi](../output/ui-ux-audit-2026-10-18/summary.json)
- [Hasil interaksi dan lintas engine](../output/ui-ux-audit-2026-10-18/interactions-summary.json)
- [Hasil pemeriksaan terarah](../output/ui-ux-audit-2026-10-18/focused-summary.json)
- [Hasil percakapan terisi](../output/ui-ux-audit-2026-10-18/populated-summary.json)
- Script: `output/ui-ux-audit-2026-10-18/audit.mjs`, `interactions.mjs`, `focused.mjs`, `populated.mjs`.
- Jalankan dari root repo, dengan dev server tersedia di `127.0.0.1:5173`: `node output/ui-ux-audit-2026-10-18/audit.mjs`, lalu dua script lainnya. `playwright`, `axe-core`, serta engine browser harus tersedia.

File JSON setiap screenshot berisi state teks, viewport, posisi kontrol, dan hasil axe bila dijalankan. Data fixture sintetis dapat dilihat pada script audit. Error API pada screenshot `390-counselors-error` sengaja disimulasikan dan tidak menunjukkan adanya gangguan layanan produksi.

## Acuan

- [W3C — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): 4,5:1 untuk teks normal, 3:1 untuk teks besar sesuai definisi.
- [W3C — Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): 24×24 CSS px dengan pengecualian yang dijelaskan standar; 44×44 pada rencana ini adalah target kenyamanan sentuh produk.
- [W3C — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): konten harus tetap dapat digunakan ketika ruang tampilan menyempit, dengan pengecualian untuk konten yang memerlukan layout dua dimensi.
- [W3C APG — Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): pengelolaan fokus dan interaksi modal.

Audit menghasilkan dokumentasi dan bukti pemeriksaan awal.

---

## Log Eksekusi Remidiasi UI/UX (Tahap 1 – Tahap 3 Selesai)

Seluruh 16 kelompok temuan UI/UX dan aksesibilitas (`F01` s/d `F16`) telah diimplementasikan dan diverifikasi melalui suite pengujian unit dan komponen:

- **Tahap 1 (`F01`–`F04`) — [`src/__tests__/unit/auditTahap1.test.tsx`](../src/__tests__/unit/auditTahap1.test.tsx):**
  - `F01`: State kosong skrining (`currentPhq9: null`, `currentGad7: null`) menampilkan `—` dan status eksplisit `"Belum ada hasil skrining"` tanpa mengklaim skor `0` atau kategori `Minimal` palsu. Skor aktual `0` tetap menampilkan `0 / 27` dan kategori `Minimal`.
  - `F02`: Sidebar mobile yang tertutup dikecualikan dari urutan fokus keyboard (`inert`) sehingga navigasi `Tab` tidak masuk ke elemen di luar layar.
  - `F03`: Hook `useFocusTrap` dan `ModalShell` menyatukan pengelolaan fokus, penutupan via `Escape`, penguncian scroll latar, dan pemulihan fokus saat dialog ditutup.
  - `F04`: Penambahan atribut `aria-label`, `htmlFor`/`id`, dan nama aksesibel pada kontrol filter direktori, kontak darurat, bilik privasi PIN, daily check-in, dan editor SOAP.
- **Tahap 2 (`F05`–`F10`) — [`src/__tests__/unit/auditTahap2.test.tsx`](../src/__tests__/unit/auditTahap2.test.tsx):**
  - `F05`: Perbaikan token warna kontras (`text-muted`, badge, dan tombol CTA) agar memenuhi rasio kontras WCAG AA pada mode terang maupun gelap.
  - `F06`: `EmptyChatState` menggunakan `my-0 sm:my-auto` agar judul dan pilihan mood pembuka tidak terpotong di layar pendek (`320×568`) atau orientasi landscape (`844×390`).
  - `F07`: Popover pemilih model pada `ChatHeader` dibatasi dalam batas lebar viewport (`max-w-[calc(100vw-1.5rem)]`) agar tidak keluar layar pada lebar `320px`.
  - `F08`: `CounselorShell` menggunakan header mobile responsif dua baris dengan pemangkasan nama aman (`truncate`) dan tombol aksi (`Pengaturan`, `Keluar`) yang tetap berada di dalam viewport.
  - `F09` & `F10`: Tata letak filter `CounselorDirectory` adaptif untuk layar `320px` dan peningkatan ukuran target sentuh tablet/mobile.
- **Tahap 3 (`F11`–`F16`) — [`src/__tests__/unit/auditTahap3.test.tsx`](../src/__tests__/unit/auditTahap3.test.tsx):**
  - `F11` & `F12`: Penyederhanaan hierarki dashboard mood harian serta dukungan `role="tablist"` dan `aria-selected` pada tab horizontal `CounselorPortal` dan `MindfulnessWorkshop`.
  - `F13`: Konsistensi alur `BookingForm` (langsung membuka Langkah 2 Pemilihan Jadwal beserta ringkasan konselor dan tombol `Ganti` apabila konselor sudah dipilih dari direktori).
  - `F14`: Form terstruktur ramah pengguna di `CampusAdminPortal` (daftar kontak rujukan dengan tombol Tambah/Hapus dan pemilih zona waktu `WIB`/`WITA`/`WIT` tanpa mengharuskan pengetikan JSON mentah).
  - `F15`: Penambahan *skip link* (`"Lewati ke konten utama"`) dan landmark `<main id="main-content">` yang konsisten di seluruh shell aplikasi.
  - `F16`: Komponen `Avatar` dengan *fallback* inisial otomatis ketika URL gambar kosong atau gagal dimuat (`onError`).
