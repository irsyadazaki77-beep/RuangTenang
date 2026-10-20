# Eksekusi Penyempurnaan RuangKerja

Tanggal mulai: 2026-10-17

Branch: `codex/fase26-multimodal-intelligence`

Dokumen ini mencatat perubahan dan pemeriksaan fase penyempurnaan RuangKerja. Working tree sudah berisi perubahan lokal sebelum pekerjaan ini dimulai (termasuk frontend, backend, tes, konfigurasi, dan screenshot). Jangan reset, checkout, atau menimpa perubahan tersebut.

Rencana rinci berbasis audit: [`WORKSPACE_IMPROVEMENT_PLAN.md`](WORKSPACE_IMPROVEMENT_PLAN.md).

## Baseline audit

- Starter RuangKerja dan tampilan percakapan sudah memiliki hierarki dasar; panel inspector tunggal dipakai untuk konteks, file, sumber, memori, dan rencana.
- Draft, state percakapan, dan konteks dipisahkan per pengguna/Workspace. Persetujuan AI eksplisit dan status draf lokal dibedakan dari simpan server.
- Canvas memiliki status simpan, riwayat versi, konflik versi, dan kontrol penerimaan perubahan. Eksekusi agen memiliki persetujuan plan dan gerbang tinjauan manusia.
- Screenshot 320 px menunjukkan judul Workspace dan deskripsi starter terpotong; pemberitahuan persetujuan AI mengambil ruang vertikal yang besar.
- Perubahan lokal awal sudah menambah filter pencarian dan tombol tampilkan semua Workspace, tetapi filter tugas belum tersedia dan pencarian server masih dibatasi jendela data tetap.
- `StudentWorkspace.tsx` tetap menjadi orkestrator besar; pengukuran browser nyata dan uji tugas mahasiswa belum tersedia.

## Tahap dan status

- [x] Fase 0 — Audit ulang dan baseline perubahan lokal.
- [~] Fase 1 — Validasi alur kerja mahasiswa. Skenario lokal lulus; sesi dengan mahasiswa tetap perlu dilakukan bersama peserta nyata.
- [x] Fase 2 — Pengalaman awal, persetujuan AI, dan keterbacaan layar sempit.
- [x] Fase 3 — Pengelolaan Workspace dan pencarian. Daftar dan pencarian kini sama-sama berpaginasi dengan cakupan per pengguna; tidak ada batas tetap 200 Workspace atau 50 hasil yang menyamarkan pencarian belum selesai.
- [x] Fase 4 — File, konteks, dan sitasi.
- [x] Fase 5 — Canvas, versi, dan ekspor.
- [x] Fase 6 — Plan dan eksekusi agen.
- [~] Fase 7 — Performa browser dan pemisahan tanggung jawab frontend. Beban sintetis 10–500 pesan dan Markdown telah diukur, paginasi riwayat yang sebelumnya terputus sudah diperbaiki, dan preview build production telah diuji pada alur 60 pesan, akumulasi 500 pesan melalui cursor, Canvas 50 KB, serta stream 10.000 karakter. Pembanding versi kini membatasi exact LCS, memberi penanda perkiraan pada wilayah ambigu, dan menampilkan maksimal 250 baris diff per halaman dengan lompatan langsung ke perubahan berikutnya/sebelumnya. Probe browser 3.600 perubahan menghasilkan median commit 42,7 ms dan median long task 58 ms, dibanding 108,1 ms dan 151 ms sebelum pagination; halaman terakhir dan lompatan melewati bagian sama sudah diuji. Modal preview kini mereset state antar-attachment; profil tabular dan 25 baris awal juga dimuat bersama agar file hanya dibaca/dekripsi/parse sekali per pembukaan. Retrieval cache miss dengan database/dekripsi, stress/performa preview banyak file, input Canvas di perangkat lambat, pengujian production/device/network, dan ekstraksi lanjutan dari orkestrator frontend masih perlu pengerjaan.
- [~] Fase 8 — Validasi rilis dan pilot. Pemeriksaan lokal selesai; pilot dengan pengguna dan provider produksi masih menunggu lingkungan yang sesuai.

## Catatan verifikasi

| Fase | Pemeriksaan | Hasil |
|---|---|---|
| 0 | `npm run typecheck` | Lulus sebelum perubahan baru |
| 0 | Tes workspaceHome, workspaceInteractionModel, workspaceUx | 3 berkas; 50 tes lulus sebelum perubahan baru |
| 1 | Playwright `workspaceInteraction.spec.ts` pada Chromium | 4/4 lulus: navigasi Canvas, lebar responsif, composer 320/375 px, dan pemulihan draf lokal. Ini simulasi browser, bukan uji tugas mahasiswa. |
| 2 | `npm run typecheck` | Lulus |
| 2 | Tes guest consent, workspace UX, dan WorkspaceHome | 3 berkas; 48 tes lulus |
| 2 | Screenshot baru 320 px | Judul membungkus dua baris; empat deskripsi starter terbaca penuh dalam maksimum dua baris; tidak ada overflow horizontal. Consent disclosure diverifikasi lewat tes unit. |
| 3 | Tes WorkspaceHome, WorkspaceApiService, interaction model, dan UX | 4 berkas; 55 tes lulus |
| 3 | Rerun Home/API dan pencarian bertahap | 3 berkas; 15 tes lulus. `workspaceList.test.ts` mencakup 4 integrasi; dua skenario pencarian memeriksa semua kategori, pesan halaman kedua, artefak terenkripsi, nama file, isolasi pemilik, dan cursor lintas-kueri. |
| 3 | `git diff --check` pada berkas fase ini | Lulus; hanya peringatan normal konversi LF/CRLF |
| 4 | Retrieval context, cache, DOI engine, dan modal sitasi | 4 berkas tes; 20 tes lulus |
| 4 | Pipeline file intelligence dan verifikasi klaim | 2 berkas tes; 32 tes lulus, termasuk skenario keamanan pipeline |
| 4 | Batas chunk dokumen panjang | Satu blok teks sekitar 464 KB sebelumnya dapat melewati pemeriksaan kuota yang hanya berjalan per blok. Guard kini ada di pemecahan kalimat dan flush akhir; tes regresi memastikan tepat maksimal 100 chunk. Lulus. |
| 4 | Pemindaian injeksi dan dokumen besar | Batas 5 KB untuk prompt chat dipertahankan. Pemeriksaan lampiran kini memindai jendela 4.096 karakter dengan overlap 512; file di atas limit diteruskan ke validator ekstraksi. Unit scanner 3/3, pipeline integrasi/keamanan 31/31, dan Workspace Canvas 20/20 lulus. Tes unggah 464 KB menghasilkan 100 chunk dan peringatan ekstraksi parsial yang juga ditampilkan pada daftar lampiran. |
| 4 | `git diff --check` pada berkas fase ini | Lulus; hanya peringatan normal konversi LF/CRLF |
| 4 | `npm run typecheck` | Lulus pada pengulangan setelah fase 4. Pengulangan ini tidak lagi mereproduksi error `subscriberClient` yang muncul pada pemeriksaan awal fase 3. |
| 5 | Canvas, draft, versi, patch, penghapusan, dan ekspor | 10 berkas tes; 50 tes lulus |
| 5 | `git diff --check` | Tidak bersih karena satu trailing whitespace pra-eksisting pada `WorkspaceCanvasPane.tsx:343`, di luar hunk fase 5; tidak saya ubah agar tidak menyentuh kode lokal lain. |
| 5 | `npm run typecheck` | Lulus |
| 6 | Agent controller, workflow persistence, tool executor, orchestrator | 7 berkas tes; 49 tes lulus, termasuk tes integrasi persistensi workflow multi-artifact |
| 7 | Home/API pagination dan integrasi daftar Workspace | 3 berkas tes; 11 tes lulus |
| 7 | Workspace Home/API dan guard performa streaming 500 chunk | 3 berkas tes; 10 tes lulus |
| 7 | `npm run typecheck` | Lulus |
| 7 | Pemisahan controller tool dan Vite production build | 3 file tes, 66 tes lulus; build 28.68 s. Chunk route Workspace 402.95 kB / 82.71 kB gzip; Canvas editor 539.00 / 167.31 kB gzip tetap on demand. Dibanding build sebelum ekstraksi, raw bertambah 0.88 kB dan gzip turun 0.33 kB; belum ada klaim peningkatan runtime. Detail di `WORKSPACE_PERFORMANCE_BASELINE.md`. |
| 7 | Chromium preview build lokal, enam konteks dingin untuk Workspace kosong | Setelah pemisahan panel, FCP 104–168 ms (median 136 ms), dibanding baseline tiga sampel 104–132 ms (median 120 ms); belum menunjukkan peningkatan FCP yang konsisten. Satu long task per sampel, 70–141 ms; 23 script, 424,296 byte encoded / 1,606,387 decoded. Ini sampel lokal, bukan target perangkat produksi. |
| 7 | Synthetic StudentWorkspace browser probe (dev server, fixture lokal) | Plain text: 50 pesan 416 ms median, 100 pesan 455 ms, 500 pesan 688 ms dengan long task maksimum 209 ms. Markdown: 50 pesan 728 ms warm, 500 pesan 1,484 ms median dengan long task maksimum 189 ms. Heap Chromium sekitar 30 MB pada 50 Markdown dan median 48 MB pada 500. Fixture 100/500 melampaui batas `limit=50`; detail dan batas ukur ada di `WORKSPACE_PERFORMANCE_BASELINE.md`. |
| 7 | Cursor history, UI, dan posisi scroll | API service, persistence hook, dan tombol muat pesan sebelumnya sekarang meneruskan cursor, deduplikasi ID, mempertahankan posisi baris, dan menghapus cursor ketika percakapan dibersihkan. 3 berkas tes terkait: 80 tes lulus; E2E Chromium fixture cursor 3/3 lulus; lint terarah, typecheck, dan production build sementara 36.57 s lulus. Chunk Workspace 405.94 kB / 83.41 kB gzip. |
| 7 | Preview build production untuk riwayat 50+10 pesan | Lima konteks Chromium lokal: FCP median 204 ms; 50 pesan siap median 258 ms; memuat 10 pesan sebelumnya median 155 ms. Tugas terpanjang 100 ms; heap 15.2–17.1 MB. E2E cursor dan posisi anchor lulus 1/1 pada preview. API diganti fixture lokal, jadi angka ini tidak mencakup server, jaringan, autentikasi, atau provider produksi. Detail di `WORKSPACE_PERFORMANCE_BASELINE.md`. |
| 7 | Preview production, 10 halaman cursor hingga 500 Markdown | Build 37.68 s; chunk Workspace 405.87 kB / 83.33 kB gzip. 3 konteks: sembilan penambahan halaman memerlukan total median 4.54 s setelah 50 pesan pertama; penambahan halaman dari 450 ke 500 memerlukan 703–889 ms. Long task terpanjang 264–333 ms; heap sampel 91.7–97.4 MB. Ini stress fixture dengan semua pesan ber-Markdown, tetapi cukup untuk memprioritaskan profil prototipe virtualisasi. Detail di `WORKSPACE_PERFORMANCE_BASELINE.md`. |
| 7 | Scroll anchor berbasis baris dan uji A/B | Perubahan mengoreksi posisi baris yang dibaca setelah prepend walau konten di bawahnya reflow. Unit Workspace UX 43/43 dan E2E preview production 1/1 lulus. Stress 500 pesan: total median 4.54 s → 4.47 s, tetapi median long task maksimum 299 → 287 ms dan maksimum terburuk naik 333 → 356 ms; tidak ada peningkatan runtime yang konsisten. Detail di `WORKSPACE_PERFORMANCE_BASELINE.md`. |
| 7 | Stream 10.000 karakter pada preview production | Tiga konteks Chromium, 100 event SSE bertimer lokal: transport 1.551–1.565 ms; teks pertama terlihat 177–204 ms; seluruh teks 10.000 karakter tampil dalam 1.63–1.72 s; long task maksimum per konteks 70 ms; heap 14.3–16.1 MB. Ini menguji pembaruan UI dengan aliran terjadwal lokal, bukan provider, jaringan, atau server rilis. |
| 7 | Canvas 50 KB dan eksperimen input Markdown | Build preview 47.06 s; chunk Workspace 406.54 kB / 83.40 kB gzip dan editor Canvas 539.00 / 167.30 kB gzip. Pada tiga konteks, Canvas terbuka median 447 ms, editor visual 908 ms, pindah ke Markdown 73 ms, dan penggantian teks 50 KB lewat Playwright `fill` median 1,42 dtk dengan long task 1,25–1,50 dtk. Textarea polos tanpa React menempuh 1,03 dtk tanpa long task pada uji yang sama. Percobaan textarea tak terkontrol memberi median 1,40 dtk; rentang bertumpang tindih dan tidak ada keuntungan meyakinkan, sehingga implementasi percobaan dibatalkan. `fill` bukan simulasi paste fisik, fixture memakai API lokal, dan pengukuran ini tidak membuktikan performa pada perangkat nyata. Detail di `WORKSPACE_PERFORMANCE_BASELINE.md`. |
| 7 | Pembanding versi artefak besar | LCS kuadratik kini berjalan hanya untuk wilayah hingga 250.000 sel. Bagian identik di tepi dan anchor baris unik dipertahankan; wilayah besar tanpa anchor memakai penghapusan/penambahan yang diberi pemberitahuan perkiraan. Microbenchmark Node 3 run pada 2.400 baris per versi dengan 1.200 anchor identik memberi median 59,05 ms pada LCS sebelumnya dan 3,22 ms pada algoritme bounded baru (18,3× lebih cepat); hasil baru tetap exact. Tes utilitas, pemberitahuan UI, Canvas, lint, dan typecheck diperiksa; angka ini mengukur helper lokal, bukan keseluruhan render browser. |
| 7 | Compare versi besar di browser | Komponen `ArtifactDiffViewer` menampilkan maksimal 250 dari 3.600 baris perubahan per halaman. Dalam tiga konteks Chromium Vite dev, durasi commit 31,0–57,8 ms (median 42,7 ms), long task maksimum 0–81 ms (median 58 ms). Navigasi langsung ke halaman terakhir menampilkan 100 baris terakhir; unit test juga memeriksa lompatan melewati bagian sama ke perubahan berikutnya. Probe ini mengukur Vite dev lokal, bukan bundle production atau perangkat mahasiswa. |
| 7 | Vite production build setelah diff bounded dan pagination Compare | Lulus ke direktori sementara OS. Workspace route 406,81 kB raw / 83,48 kB gzip; Canvas editor 539,00 kB / 167,31 kB gzip tetap lazy. Peringatan chunk lebih dari 500 kB tetap muncul untuk dependensi besar yang sudah ada. |
| 7 | Pergantian file dan pembukaan dataset tabular | Konten modal di-key dengan ID attachment. Endpoint overview menggabungkan profil sheet dan 25 baris pertama; pembukaan awal sekarang memakai dua request (metadata + overview), dengan satu pembacaan/dekripsi/parse file, bukan dua. Tes route 3/3, modal + API 6/6, dan IDOR route 1/1 lulus; production build lulus 13m38s di direktori sementara. Vite tetap memperingatkan chunk >500 kB. Probe browser 3 × 8 file tidak mencapai startup dev server dalam batas 60 s, sehingga latency multi-file belum terukur. |
| 7 | Retrieval konteks pada batas chunk | Cache dingin, fixture 8 dokumen × 100 chunk × 2.000 karakter: fungsi retrieval menyelesaikan pemeringkatan dan memilih 5 chunk dalam 25 ms dengan kenaikan heap Node sekitar 8,92 MB. Database, enkripsi, PII, dan deteksi injeksi dimock, jadi ini hanya mengukur algoritme in-memory. |
| 7 | Pemisahan container modal `WorkspaceModalsContainer` | Modalisasi dialog sekunder (Transfer, Revision diff, Template, MicroBreathing, ToolConfig, FilePreview, Export) dipindahkan ke komponen terpisah. `StudentWorkspace.tsx` terpangkas dan rerender modal terisolasi. `typecheck`, ESLint, dan 86 unit test Workspace lulus. |
| 7 | Optimasi rendering baris percakapan & dependensi memo | Penggantian `motion.div` dengan native CSS `animate-fade-in` pada baris pesan percakapan, mengeliminasi 500 Framer Motion controller dan reflow jitter. Dependensi memo rows diselaraskan ke boolean `hasArtifacts`. Unit test contrast & rendering 3/3 lulus. |
| 7 | Optimasi sinkronisasi AST editor Canvas dokumen besar | Eliminasi serialisasi getMarkdown ganda pada keystroke Tiptap via `lastEmittedMarkdownRef`, debounced AST synchronization (50ms) dengan jaminan flush saat blur dan perpindahan mode. Unit test editor 23/23 lulus (durasi uji turun drastis dari 5,8s ke 1,3s). |
| 7 | `git diff --check` pada berkas fase 7 | Lulus |
| 8 | Playwright `workspaceInteraction.spec.ts --project=chromium` | 5/5 lulus. Skenario pemulihan draf memastikan reset storage hanya berjalan sekali per tab, menunggu stream selesai sebelum transfer, dan memverifikasi draf Canvas setelah refresh. |
| 8 | ESLint untuk berkas kode yang disentuh | Lulus tanpa error atau warning setelah memperbarui dependensi hook penyimpanan lokal. |
| 8 | `npm run typecheck`, tes workspace terfokus, dan tes integrasi daftar + Home/API | Lulus; rerun gabungan 6 berkas tes, 93 tes, termasuk uji pemulihan draf guest. |
| 8 | Persiapan server E2E | Tes lulus; Prisma melaporkan `EPERM` saat rename query engine sementara lalu memakai client yang sudah tersedia. Ada peringatan port WebSocket 24678 dipakai proses lain; server E2E di port 39123 sudah berhenti setelah tes. |

### Catatan fase 3

- Kategori pencarian kini mencakup tugas dan memakai tombol toggle yang mengumumkan status terpilih dengan `aria-pressed`.
- Hasil lama langsung dikosongkan saat kueri atau filter berubah; judul cocok persis/awalan didahulukan, dan hasil berikutnya ditampilkan bertahap.
- Workspace berbeda dengan nama yang sama tidak lagi dideduplikasi berdasarkan judul. Workspace tersemat berada di atas, lalu item diurutkan berdasarkan aktivitas.
- Endpoint daftar mengembalikan ringkasan ringan 100 item dengan `hasMore` dan `nextOffset`; halaman berikutnya hanya diminta setelah pengguna membuka daftar dan memilih muat lagi. Task dan plan tidak ikut diambil saat Home dibuka.
- Pencarian tidak lagi memakai indeks plaintext atau batas tetap jumlah Workspace/hasil. Server memindai satu batch 25 record per kategori dalam query owner-scoped, berurutan dari data terbaru, dan mengembalikan cursor yang terikat pada query, kategori, dan waktu awal pemindaian. UI meminta batch berikutnya hanya setelah tindakan pengguna; record tetap didekripsi sementara di server dan tidak disimpan ke indeks.
- Cursor menjaga pemindaian stabil untuk record baru yang dibuat setelah pencarian dimulai. Perubahan konten pada record lama ketika pencarian berjalan belum memakai snapshot transaksi; hasil yang tampil merefleksikan isi saat record itu dipindai.

### Catatan fase 4

- Kunci cache retrieval kini menyertakan batas token, jumlah chunk, dan filter bagian; permintaan dengan cakupan keluaran berbeda tidak berbagi snapshot yang keliru.
- Pencarian Crossref menerima AbortSignal. Modal membatalkan request lama dan mengabaikan jawaban yang tiba setelah kueri berubah, sekaligus menghapus paper lama selama pencarian baru.
- Batas kepercayaan konten dokumen, validasi identitas marker sitasi, lokasi sumber yang berasal dari parser, serta label metadata Crossref/pengguna diperiksa. Klaim dukungan semantik tetap dinyatakan terpisah dari validitas marker.
- Audit chunking menunjukkan bahwa pemeriksaan `maxChunksPerDocument` yang sebelumnya hanya berjalan setelah satu blok selesai dapat terlewati oleh satu blok teks panjang. Batas kini dicek di loop pemecahan kalimat dan sebelum flush terakhir; tes satu-blok 464 KB menjaga maksimal 100 chunk.
- Guard umum prompt menolak teks di atas 5 KB agar input chat tetap dibatasi. Dulu guard itu juga dipakai untuk lampiran teks, sehingga file teks sah berukuran lebih dari 5 KB gagal sebelum limit ekstraksi 500 KB tercapai. Scanner dokumen kini memindai jendela bertumpang-tindih hingga batas ukuran ekstraksi dan dipakai konsisten oleh upload Workspace serta penyimpanan lampiran chat; konten yang lebih besar diteruskan ke validator ekstraksi yang memberi error ukuran yang sesuai.
- Jika batas 100 chunk memotong isi, attachment metadata dan respons upload sekarang membawa peringatan “Ekstraksi parsial”; UI lampiran telah memiliki label untuk peringatan ini. Tes integrasi file 464 KB memastikan file tetap ready, 100 chunk tersimpan, panjang teks ekstraksi tercatat, dan peringatan dikembalikan.

### Catatan fase 5

- Simpan otomatis, draft lokal lintas refresh, antrean save/delete, kontrol versi CAS, rollback, konflik edit dua sesi, dan ekspor sudah memiliki cakupan tes khusus yang lulus. Pembuatan, transfer jawaban AI, duplikasi, dan penyimpanan draf guest kini menulis sesi lokal secara sinkron sebelum aksi selesai, sehingga refresh langsung tidak mendahului penyimpanan.
- Pemilih dokumen Canvas kini menggunakan grup tombol dengan `aria-pressed`; sebelumnya `aria-selected` dipasang pada tombol di luar pola tab ARIA.

### Catatan fase 6

- Draft plan dapat diedit sebelum persetujuan; endpoint menolak eksekusi task sampai plan berstatus approved.
- Eksekusi dibatasi dengan snapshot sumber, ID eksekusi dan CAS status. Hasil berakhir di `waiting_review`; penerimaan, penolakan, atau revisi memerlukan tindakan pengguna. Proposal baru menjadi artefak sesudah diterima.
- Mode beruntun berhenti pada gerbang tinjauan manusia, dan pembatalan membatalkan request aktif. Cakupan unit dan integrasi untuk batas-batas ini lulus.

### Catatan fase 7

- Audit ukuran saat ini: `StudentWorkspace.tsx` 1.461 baris, `useWorkspaceTools.ts` 148 baris, `ArtifactCanvas.tsx` 1.352, dan chunk route Workspace 405.87 kB raw / 83.33 kB gzip pada build preview terbaru. Controller tool yang sebelumnya tidak dipakai kini mengelola validasi, konfigurasi input, routing ke AI/revisi, utilitas lokal, dan simpan artefak; tiga tes hook memeriksa jalur tersebut. Galeri template, breathing, workflow, konfigurasi tool, editor Canvas, dan ekspor berada di chunk opsional/on demand.
- Build mengeluarkan peringatan untuk chunk di atas 500 kB; chunk terbesar dalam hasil saat ini adalah ELK, ExcelJS, Mermaid core, dan editor Canvas. Pemisahan empat panel opsional mengurangi chunk route Workspace sekitar 40.07 kB raw / 6.55 kB gzip. Total resource JavaScript awal berkurang 7,744 byte encoded (sekitar 1.8%) dalam probe lokal; enam sampel FCP setelah perubahan tidak membuktikan perbaikan dibanding tiga sampel sebelum perubahan. Heap dan skenario beban representatif masih belum diukur.
- Pemuatan awal Home sebelumnya mengambil seluruh halaman sequential dengan task dan plan. Sekarang satu halaman ringkasan diambil saat mount; permintaan tambahan menunggu tindakan pengguna. Uji integrasi memastikan hasil tetap dibatasi per pemilik.
- Search konten terenkripsi kini memindai secara bertahap seluruh record Workspace milik pengguna tanpa indeks plaintext. Batch dibatasi 25 record per kategori dan di-rate-limit lewat limiter API umum; hasil per halaman tetap dapat diurutkan menurut kecocokan judul/waktu, tetapi relevansi global baru diketahui setelah semua cursor dipindai.
- Browser fixture mengukur render 10/50/100/500 pesan serta pesan assistant ber-Markdown langsung di `StudentWorkspace`. Angka berasal dari Vite dev server lokal dan bukan timing production-runtime; 100/500 pesan disuntikkan sekaligus, sedangkan jalur server membatasi setiap page menjadi 50.
- Riwayat tersimpan sekarang menampilkan tombol “Muat pesan sebelumnya” ketika server menyediakan `nextCursor`. Page lama ditambahkan sebelum page saat ini dengan ID dedupe; komponen mempertahankan elemen baris yang dibaca dengan menyelaraskan kembali posisi viewport anchor setelah prepend. Tes E2E fixture memeriksa cursor request dan posisi anchor, diulang tiga kali setelah layout font/Markdown stabil.
- Preview build production dengan fixture API terkontrol mengukur lima konteks Chromium untuk 50 pesan awal dan 10 pesan cursor berikutnya. Median pesan awal siap 258 ms, pemuatan halaman lama sesudah klik 155 ms, dan FCP 204 ms; E2E posisi anchor lulus pada preview. Ini mendukung alur paginasi untuk ukuran halaman normal pada mesin lokal, tetapi tidak membuktikan performa server rilis atau perangkat mahasiswa.
- Pada stress 500 pesan, long task tertinggi 209 ms untuk teks pendek dan median 189 ms untuk Markdown di dev server. Preview production dengan 500 pesan Markdown yang dimuat lewat sembilan cursor berikutnya memerlukan 4.47–4.66 s; median long task maksimum per konteks 299 ms dan heap sampel 91.7–97.4 MB. Penambahan halaman makin lambat setelah 400 baris. Hasil ini memprioritaskan profil dan prototipe virtualisasi/Markdown on demand; jangan tetapkan ambang atau perilaku rilis sebelum mengukur tinggi pesan bervariasi, jangkar scroll, pencarian pesan, streaming aktif, dan perangkat yang lebih lemah.
- Strategi anchor diganti dari selisih `scrollHeight` ke posisi bounding box baris yang sama. Uji regresi mensimulasikan konten Markdown di bawah anchor yang selesai reflow saat halaman lama ditambahkan; posisi baca tetap benar. Uji A/B lokal hanya mengubah total median 500 pesan 4.54 s menjadi 4.47 s, sementara variasi long task tumpang tindih. Perubahan ini dipertahankan demi ketepatan anchor, tanpa klaim peningkatan runtime.
- Alur production preview untuk 50+10 pesan tetap ringan pada mesin lokal: pesan pertama median 258 ms dan halaman lama 155 ms. Ini menunjukkan masalahnya muncul pada akumulasi konten, bukan pada satu halaman riwayat normal.
- Stream bertimer 100 event lokal membuat seluruh 10.000 karakter terlihat pada median 1.67 s dengan teks pertama sekitar 0.18–0.20 s. Ini adalah pemeriksaan jalur UI pada preview production; transport tidak melewati penyedia AI atau server rilis.
- Canvas 50 KB terbuka dan berganti mode dalam median 447 ms dan 73 ms, tetapi editor visual perlu sekitar 0.91 s untuk siap. Mengganti isi 50 KB lewat Playwright `fill` menimbulkan satu long task sekitar 1.25–1.50 s. Kontrol textarea polos menempuh 1.03 s tanpa long task; Canvas kemungkinan menambah kerja aplikasi, tetapi pengukuran ini belum memisahkan tiap sumber. Perubahan textarea dari controlled ke uncontrolled tidak memberi hasil A/B yang meyakinkan (median 1,42 dtk vs 1,40 dtk, rentang tumpang tindih) dan telah dihapus. Benchmark ini tidak boleh disebut paste fisik atau hasil perangkat mahasiswa.
- Diff versi artefak kini membatasi matriks exact LCS sampai 250.000 sel, memangkas batas identik, lalu memakai baris unik sebagai anchor. Wilayah besar yang masih tanpa anchor memakai penghapusan/penambahan; jika baris berulang dapat memiliki beberapa alignment, UI menandai hasil sebagai perkiraan. Pada 2.400 baris per versi, microbenchmark 3 run berubah dari median 59,05 ms menjadi 3,22 ms dan tetap exact; unit test helper, viewer, dan Canvas lulus. Angka ini belum mencakup render DOM di browser.
- Tindak lanjut fase 7: profilkan input Canvas pada browser dengan CPU throttling; bandingkan penggantian teks, paste clipboard, dan edit satu karakter; uji prototipe editor/penyimpanan draft yang tidak memaksa orkestrator Canvas merender untuk setiap input; pastikan aksi AI, pemilihan teks, autosave, refresh, dan konflik tetap mengambil konten terbaru; ukur retrieval cache miss dengan DB/dekripsi dan preview banyak file; ulangi riwayat serta Compare pada bundle production/perangkat representatif, lalu nilai ekstraksi tanggung jawab orkestrator sebelum menyatakan fase optimal.
- Retrieval server diuji sebagai kontrol CPU in-memory pada batas 8 lampiran × 100 chunk × 2.000 karakter: 25 ms, heap bertambah sekitar 8,92 MB, 5 chunk dipilih. Mock database dan enkripsi membuatnya bukan angka produksi; query DB, decrypt nyata, sanitasi PII, cache dingin, dan konkurensi server tetap perlu diukur bersama instrumentation produksi.
- Catatan: unit test 500 chunk hanya mengukur commit React di JSDOM dan tidak menggantikan metrik browser.
- Orkestrator `StudentWorkspace.tsx` turun dari 1.520 ke 1.461 baris pada ekstraksi ini, tetapi koordinasi stream, artifact/revisi, compare, file, dan inspector masih terpusat di dalamnya. Sampel browser FCP sebelumnya mengukur build sebelum ekstraksi tool; build baru hanya dibandingkan ukuran chunk dan belum diprobe ulang.

### Catatan fase 8

- Batas waktu kesiapan webServer Playwright dinaikkan dari 30 detik ke 90 detik dan dapat diatur lewat `PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS`, karena cold start lokal sebelumnya melewati 30 detik.
- Lima skenario browser lokal di Chromium, tes workspace terfokus, pemeriksaan tipe, lint, dan build lulus. Ini memvalidasi implementasi pada lingkungan simulasi, bukan kelayakan rilis lintas provider atau kondisi produksi.
- Belum dilakukan sesi tugas bersama mahasiswa, uji kredensial/provider produksi, ataupun pilot terbatas. Fase ini tetap parsial sampai pemilik produk menjalankan langkah tersebut dengan peserta dan lingkungan yang disetujui.

Fase hanya ditandai selesai setelah perubahan fase itu lolos pemeriksaan yang sesuai. Uji dengan mahasiswa dan provider AI produksi tidak boleh diklaim dari simulasi atau tes unit.
