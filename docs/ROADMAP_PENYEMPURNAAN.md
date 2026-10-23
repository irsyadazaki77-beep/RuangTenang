# Roadmap Penyempurnaan RuangTenang

Roadmap ini berfokus pada peningkatan alur, kejelasan, keselamatan, dan kesiapan operasional fitur yang sudah ada. Urutan kerja mengikuti ketergantungan antarfitur; bukan janji bahwa seluruh pemeriksaan produksi dapat diselesaikan hanya lewat perubahan kode.

## Prinsip penyelesaian

Setiap fitur dianggap siap setelah alur utama berhasil dari awal sampai akhir, keadaan loading/kosong/gagal/berhasil jelas, penggunaan ponsel dan keyboard dapat dilakukan, akses dan penyimpanan data sesuai penjelasan produk, serta tindak lanjut untuk kegagalan dan kasus sensitif sudah ditentukan.

Centang di bawah berarti perubahan kode pada butir tersebut sudah diterapkan; itu belum menggantikan QA manual, tinjauan pemilik produk/klinis, atau sign-off rilis.

## Status fase

| Fase | Cakupan | Status |
|---|---|---|
| 0. Baseline dan inventaris | Petakan route, peran, layanan, dan rilis yang masih terbuka | Audit kode awal selesai; temuan perlu divalidasi lewat penggunaan langsung |
| 1. Keselamatan, privasi, dan mode AI | Persetujuan AI, klaim lokal/provider, rujukan krisis, dan data flow | Berjalan (persetujuan sebelum unggah/OCR, disclosure provider OCR, koreksi jam Healing119, pesan fallback krisis, dan batas mode sementara diperjelas; audit tool eksternal dan sign-off pemilik masih tersisa) |
| 2. Alur utama mahasiswa | Halaman awal, onboarding, navigasi, responsif, status proses | Berjalan (deskripsi tujuan kedua mode dan batas fungsi offline diperjelas; validasi mahasiswa dan audit layar masih tersisa) |
| 3. Pendampingan mandiri | Chat, skrining, mood tracker, mindfulness, dan bantuan darurat | Berjalan (perbaikan kode bertahap; QA dan audit alur penuh masih tersisa) |
| 4. Konseling | Direktori, jadwal, notifikasi, portal konselor, dan tindak lanjut | Berjalan (simulasi AI, privasi catatan, slot lintas zona waktu, kegagalan ketersediaan, dan batas pengingat browser diperbaiki; QA alur penuh masih tersisa) |
| 5. RuangKerja | Chat kerja, dokumen, sumber/sitasi, artefak, workflow, dan ekspor | Berjalan (disclosure provider, pemisahan konteks Canvas dari riwayat pesan, status sitasi yang jujur, pemulihan draf Canvas, dan perlindungan respons preview yang usang ditambahkan; audit fitur lainnya masih tersisa) |
| 6. Kampus dan kesiapan rilis | Admin multi-kampus, operasi, backup/restore, performa, aksesibilitas, dan smoke check | Audit kode awal berjalan; kesiapan deployment, latihan pemulihan, pengukuran lapangan, dan sign-off masih terbuka |

## Fase 0 — Baseline dan inventaris

### Area yang ditemukan

- Akun, autentikasi, onboarding, preferensi, notifikasi, dan pusat privasi.
- Chat Teman RuangTenang, izin pemrosesan AI, model/profil, histori, lampiran, dan mode tamu.
- Skrining, mood tracker, tren, mindfulness, grounding, serta pusat bantuan darurat.
- Direktori konselor, booking/reschedule, ruang sesi, portal konselor, triase, dan analitik.
- RuangKerja: workspace, ingesti file, sumber/sitasi, editor artefak, workflow agent, perbandingan model, versi, dan ekspor.
- Admin kampus, pemetaan tenant, analitik agregat, audit, retensi, penghapusan, dan operasi deployment.

### Temuan awal prioritas

1. Dialog persetujuan AI membuat klaim pelatihan/provider yang tidak bisa dibuktikan dari aplikasi.
2. Deskripsi model Ollama menyamakan penggunaan Ollama dengan pemrosesan di perangkat pengguna, padahal endpoint dapat menunjuk host lain.
3. Mode model lokal tidak mematikan tool eksternal terpisah seperti pencarian web Tavily jika fitur itu dikonfigurasi dan dipakai.
4. `RELEASE_CHECKLIST.md` masih menyisakan tinjauan klinis, provider/privasi, latihan pemulihan backup, operasi retensi, pengukuran performa lapangan, dan pemeriksaan aksesibilitas manual.
5. RuangTenang dan RuangKerja memiliki banyak area produk; jalur masuk mahasiswa perlu divalidasi agar fokusnya mudah dipahami.

## Fase 1 — Keselamatan, privasi, dan mode AI

- [x] Hapus klaim tidak terverifikasi pada dialog persetujuan AI; jelaskan pemrosesan oleh layanan model dan kemungkinan penyimpanan aplikasi.
- [x] Bedakan endpoint Ollama dari lokasi perangkat pengguna dalam katalog dan dokumentasi.
- [x] Bedakan provider yang dikonfigurasi dari sinyal ketersediaan terbaru; jangan samakan konfigurasi dengan respons endpoint dan tampilkan status circuit breaker Ollama.
- [x] Muat ulang status katalog saat pengaturan model dibuka dan nonaktifkan profil yang ditandai tidak tersedia oleh server.
- [x] Pisahkan cache katalog berdasarkan tier dan tunggu pemuatan sesi selesai agar ketersediaan model akun sebelumnya tidak tampil saat sesi berganti.
- [x] Jelaskan pemrosesan kueri pencarian web terpisah dari provider model lokal.
- [x] Samakan penjelasan provider, endpoint Ollama, penyimpanan aplikasi, dan tool pencarian pada onboarding, mode tamu, dan pemilih model.
- [x] Wajibkan persetujuan AI sebelum unggah atau percobaan ulang ekstraksi; cek lagi di server sebelum file diterima atau OCR dijalankan.
- [x] Jelaskan bahwa OCR Gemini/OpenAI dapat berjalan terpisah dari endpoint model chat, termasuk saat katalog chat hanya berisi Ollama.
- [x] Arahkan chat simulasi konselor, pertanyaan refleksi, ringkasan mood/chat, dan peningkatan klasifikasi krisis ke model default yang dikonfigurasi; pertahankan fallback deterministik saat model tidak tersedia.
- [x] Perbaiki copy produk yang menjanjikan anonimisasi, deteksi krisis tanpa false alarm, atau penghapusan permanen tanpa batas cakupan.
- [x] Ganti klaim mode sementara “RAM saja/tanpa cache” dengan penjelasan riwayat akun, pemrosesan provider AI, unggahan lampiran, dan batas retensinya.
- [ ] Tinjau seluruh copy persetujuan, privasi, krisis, dan penyaringan bersama penanggung jawab produk dan klinis.
- [ ] Pastikan bantuan krisis dan rujukan kampus aktif serta kepemilikan eskalasinya jelas.
- [x] Hapus klaim ketersediaan Healing119 24 jam yang tidak didukung informasi resmi; arahkan pengguna ke situs resmi untuk jam layanan terbaru.
- [x] Samakan fallback krisis AI dengan kanal yang terverifikasi dan beri tahu pengguna bahwa antrean serta jam layanan dapat berubah.
- [x] Batasi negasi, riwayat masa lalu, dan pihak ketiga ke klausa yang memuat pemicu krisis; cegah eskalasi multi-turn menghitung krisis pihak ketiga atau riwayat sebagai risiko personal aktif, dan biarkan pemicu eksplisit mengalahkan metafora.
- [x] Ganti sakelar berbagi data konselor yang hanya mengubah state layar dengan pintasan ke pengaturan izin yang tersimpan di Pusat Privasi.
- [ ] Konfirmasi provider aktif, syarat pemrosesan, retensi, dan kontrol penggunaan data dengan pemilik deployment.
- [ ] Audit pencarian web, komparasi model, OCR dokumen/gambar, dan semua jalur workspace agar penggunaan provider eksternal cocok dengan mode/model yang dipilih.
  - [x] Jadikan Tavily opt-in eksplisit untuk task riset Workspace, nonaktif secara default, dan hilangkan tool pencarian web dari eksekusi yang tidak diizinkan.

## Fase 2 — Alur utama mahasiswa

- [x] Tambahkan jalur langsung dari halaman awal ke latihan mandiri, skrining, dan direktori konselor.
- [x] Jelaskan ringkas tujuan RuangTenang dan RuangKerja pada pemilih mode; validasi pemahaman pengguna masih diperlukan.
- [x] Jelaskan bahwa sinkronisasi offline hanya berlaku untuk data yang berhasil masuk antrean offline, bukan semua fitur dan data aplikasi.
- [ ] Tinjau halaman awal berdasarkan tiga niat utama bersama mahasiswa: mencari ketenangan, memahami kondisi, atau menghubungi konselor.
- [ ] Kelompokkan navigasi dan jelaskan hubungan RuangTenang dengan RuangKerja.
- [ ] Tinjau onboarding, pilihan melewati langkah, login/daftar, pemulihan akses, dan masuk sebagai tamu.
  - [x] Buat onboarding berfungsi sebagai dialog aksesibel dengan penahanan/pemulihan fokus, navigasi Escape, pengumuman langkah dan pilihan, dukungan reduced motion, serta perlindungan dari penyimpanan ganda.
- [ ] Periksa setiap route pada ponsel, layar kecil, koneksi lambat, zoom besar, dan penggunaan keyboard.
- [ ] Lengkapi status loading, kosong, offline, kegagalan server, dan pemulihan yang dapat dimengerti.

## Fase 3 — Pendampingan mandiri

- [x] Perjelas bahwa hasil skrining adalah skrining mandiri, bukan evaluasi klinis atau diagnosis.
- [x] Hapus klaim sesi konseling selalu rahasia/gratis dan ketersediaan AI yang tidak bisa dijamin oleh aplikasi.
- [x] Beri jalur langsung ke Pusat Bantuan Krisis dari beranda dan hasil skrining positif.
- [x] Jelaskan bahwa jawaban skrining tidak memicu SOS atau pemberitahuan konselor secara otomatis.
- [x] Gunakan bahasa netral untuk perubahan skor skrining dan hindari menyatakan rentang rendah sebagai bukti tidak ada masalah.
- [x] Hindari memberi kesan skor skrining atau penggunaan mood tracker membuktikan pemulihan.
- [x] Gunakan hanya catatan tidur yang benar-benar diisi pada grafik; hilangkan label kondisi emosional dari ambang rata-rata sederhana.
- [x] Ubah ringkasan cetak mood menjadi deskriptif, hapus klaim rekam medis/defisit tidur, dan buat catatan refleksi opsional secara default.
- [x] Hindari klaim bahwa satu skrining atau rangkaian kebiasaan mikro menunjukkan kestabilan atau kemajuan emosional.
- [x] Jelaskan bahwa penerimaan permintaan SOS oleh penyedia pesan belum membuktikan kontak menerima atau membaca pesan.
- [x] Hapus klaim “Zero-Log” pada status anonim; jelaskan batas Mode Sementara dan bahwa AI/lampiran tetap diproses.
- [x] Tahan pengiriman chat jika lampiran masih diproses atau gagal agar teks tidak terkirim tanpa lampiran yang dimaksud.
- [x] Minta persetujuan AI sebelum pengguna memilih/mengunggah berkas chat atau Workspace; server memeriksa ulang sebelum menerima berkas dan ekstraksi ulang.
- [x] Hilangkan klaim latihan grounding/pernapasan yang menjanjikan efek tubuh atau hasil tertentu; berikan pilihan berhenti bila tidak nyaman.
  - [x] Rapikan sisa copy audio dan timer grounding yang masih menyiratkan efek menenangkan, serta buat langkah aroma dan napas boleh dilewati.
- [x] Hilangkan klaim tinjauan psikolog, sumber klinis, dan kerahasiaan layar yang tidak dibuktikan oleh implementasi.
- [x] Jelaskan bahwa penyamaran layar hanya mengubah tampilan perangkat dan bahwa menghapus memori dari aplikasi tidak menjamin penghapusan salinan provider atau cadangan.
- [ ] Chat: persetujuan, kirim/batal/ulang, streaming, lampiran, histori, konteks, fallback, serta pindah ke bantuan manusia.
  - [x] Batasi draft lokal berdasarkan akun dan reset state chat/stream saat identitas pengguna berubah.
  - [x] Hapus teks stream parsial, saran lanjutan, dan status kuota saat benar-benar berpindah percakapan.
  - [x] Pertahankan respons parsial yang dihentikan/terputus dengan penanda belum selesai dan tindakan buat ulang; kosongkan buffer tampilan terakhir sebelum membatalkan stream.
  - [x] Tampilkan tool call chat sebagai kartu fitur yang bisa digunakan, lalu bersihkan status stream agar tidak berhenti di “Memuat fitur…”.
- [ ] Skrining: kejelasan tujuan, jawaban terlewat, interpretasi skor, privasi, dan anjuran tindak lanjut.
  - [x] Reset jawaban, hasil, dan riwayat pada route skrining saat identitas akun berubah; samakan judul hasil dengan fungsi skrining mandiri.
  - [x] Reset referensi jawaban dan pemeriksaan keselamatan saat tes ulang/pergantian akun, cegah hasil simpan terlambat mengubah sesi pengguna berikutnya, dan ubah catatan rujukan agar tidak menyatakan kebutuhan klinis sebagai diagnosis.
  - [x] Sediakan simpan ulang dengan kunci idempotensi agar respons server yang terlambat tidak membuat riwayat skrining duplikat; perjelas bahwa butir PHQ-9 nomor 9 tidak menentukan bahaya saat ini.
- [ ] Mood tracker/tren: pencatatan, koreksi, riwayat, offline sync, ekspor/penghapusan, dan batas interpretasi grafik.
  - [x] Reset state halaman Mood dan Mindfulness saat identitas akun berubah agar catatan atau form lama tidak tampil di sesi berikutnya.
  - [x] Reset dashboard mood/skrining/penggunaan dan modal terkait sebelum paint saat akun berubah; batalkan fetch lama dan abaikan pembaruan dari identitas sebelumnya.
  - [x] Simpan tanggal mood yang dipilih, validasi batas tanggal di server, dan gunakan tanggal kalender lokal untuk grafik serta laporan.
  - [x] Tambahkan koreksi catatan mood tersimpan melalui endpoint pemilik akun; pertahankan data tidur yang belum dicatat dan jangan menawarkan edit untuk entri offline yang belum memiliki ID server.
  - [x] Izinkan penghapusan catatan yang pasti belum dikirim dengan menghapus hanya antrean milik akun saat ini; tahan pembatalan saat sinkronisasi berlangsung dan jelaskan status kiriman yang belum pasti.
- [ ] Mindfulness/grounding: instruksi, timer/audio, kontrol pengguna, jurnal, reduced motion, dan alternatif tanpa audio.
  - [x] Tambahkan kontrol matikan semua audio yang tetap terlihat saat berpindah tab; hormati reduced motion pada panel, langkah grounding, dan visualisasi napas, serta terapkan volume pilihan saat audio dimulai ulang.
  - [x] Jadikan langkah aroma opsional, gunakan instruksi netral, dan pertahankan grounding tanpa audio.
- [ ] Pusat darurat: kontak, jam layanan, lokasi, keterbatasan layanan, serta rute yang benar saat keadaan mendesak.
  - [x] Kosongkan dan batalkan pemuatan kontak saat identitas akun berubah; lingkupkan route pada identitas sesi.
  - [x] Bedakan status memuat kontak dari data kosong dan sediakan pemuatan ulang saat terjadi kegagalan.
  - [x] Kirim hanya lokasi yang dipilih pengguna dalam permintaan SOS; kontak dan izin tetap bersumber dari server akun.
  - [x] Jelaskan izin SOS tambahan di Pusat Privasi dan pertahankan jalur langsung Healing119/119.
  - [x] Tampilkan alasan kontak/izin/rate limit dari server dengan tindakan menuju Pusat Privasi saat persetujuan belum aktif.

## Fase 4 — Konseling

- [x] Tampilkan chat konselor demo secara konsisten sebagai simulasi AI; gunakan model yang dikonfigurasi dan jangan membuat ringkasan klinis otomatis.
- [x] Jangan ubah status hadir atau menyimpan percakapan ketika pengguna mengakhiri simulasi demo.
- [x] Simpan draft panel video secara lokal selama sesi; gunakan portal SOAP terpisah untuk penyimpanan catatan konselor.
- [x] Sembunyikan catatan janji temu yang mungkin memuat catatan konselor dari tampilan mahasiswa setelah sesi selesai.
- [x] Hapus klaim enkripsi untuk catatan kolaborasi in-call yang hanya berada di memori server, serta klaim peer-to-peer saat server TURN dapat menjadi relay.
- [x] Tampilkan batas pengiriman SOS, akses data konseling, dan privasi profil dengan bahasa yang mengikuti perilaku kode.
- [x] Hitung ketersediaan booking berdasarkan zona waktu pilihan dan benturan waktu aktual di server; tampilkan keadaan memuat/gagal/penuh dan pertahankan validasi server saat pengiriman.
- [x] Muat ulang slot dan status pengingat setelah reschedule; jadwalkan pengingat hanya untuk sesi yang disetujui dan terkonfirmasi.
- [x] Jelaskan bahwa pengingat browser bergantung pada halaman yang terbuka; hilangkan contoh notifikasi dengan identitas konselor fiktif.
- [x] Hapus batas pembatalan 24 jam dari konfirmasi booking karena aturan tersebut tidak ditegakkan oleh alur aplikasi.
- [x] Hilangkan topik pribadi dan tautan rapat contoh dari ekspor kalender; jelaskan data yang dikirim ke Google Calendar/Outlook.
- [ ] Direktori: profil, ketersediaan, keahlian, filter, dan informasi akses yang konsisten.
  - [x] Hitung filter hari ini pada zona waktu pengunjung, tampilkan jadwal berulang tanpa mengklaimnya sebagai slot booking, ambil opsi kampus dari data yang tersedia, samakan filter biaya dengan label harga, dan reset daftar serta pilihan konselor saat akun/kampus berubah.
  - [x] Validasi jadwal konselor di endpoint admin sebagai nama hari Indonesia dan simpan ejaan hari kanonis agar jadwal salah format tidak membuat konselor tampak tidak tersedia.
- [ ] QA alur booking/reschedule/batal, slot kedaluwarsa, konflik bersamaan, status approval, dan batas zona waktu pada WIB/WITA/WIT.
  - [x] Perlakukan perubahan zona waktu sebagai perubahan slot: perbarui reservasi, tolak waktu reschedule yang sudah lewat di lapisan penyimpanan, dan kembalikan kode konflik yang dapat ditindaklanjuti.
  - [x] Cocokkan permintaan booking dan reschedule di server dengan hari layanan konselor dan jam slot yang benar-benar ditawarkan; jadwal kosong/tidak valid tidak membuka semua hari.
  - [x] Sediakan tombol coba lagi saat pemuatan ketersediaan booking atau reschedule gagal, dan samakan tanggal lama dengan tanggal minimum pada zona waktu yang dipilih.
- [ ] Rancang kanal pengingat latar-belakang dan pemulihan provider; pengingat saat ini hanya berjalan di browser yang halaman RuangTenang-nya masih terbuka.
- [ ] Portal konselor: triase, penetapan penanggung jawab, catatan sesi, persetujuan akses, dan tindak lanjut.
- [ ] Ruang konsultasi: konektivitas, alternatif bila audio/video gagal, batas penyimpanan, dan penyelesaian sesi.

## Fase 5 — RuangKerja

- [x] Jelaskan bahwa kueri pencarian sitasi dikirim ke Crossref terlepas dari model AI lokal; metadata Crossref tidak memverifikasi isi klaim artikel.
- [x] Jelaskan unggah file ke server, kemungkinan OCR Gemini/OpenAI saat provider cloud aktif, dan bahwa Tavily/Crossref tetap jalur eksternal terpisah.
- [x] Tampilkan preview saja bila tidak tersedia provider OCR visual pada konfigurasi saat ini.
- [x] Jangan menandai gambar/PDF sebagai siap analisis visual hanya berdasarkan jenis berkas; tampilkan status sesuai provider OCR yang tersedia.
- [x] Beri jalur coba lagi saat pencarian workspace awal gagal dan pertahankan navigasi pemulihan saat pemuatan hasil berikutnya gagal.
- [x] Bedakan hasil Crossref kosong dari kegagalan layanan dan sediakan percobaan ulang; tampilkan bahwa metadata sitasi tidak memverifikasi isi artikel.
- [x] Batalkan permintaan preview dataset yang usang saat berpindah sheet/halaman dan abaikan respons dari sheet sebelumnya.
- [ ] Tinjau orientasi awal, pembuatan workspace, pemilihan profil, preset, dan konteks tiap percakapan.
  - [x] Isolasi daftar dan pencarian Workspace berdasarkan identitas akun agar hasil serta permintaan lama dibuang saat akun berganti.
  - [x] Muat ulang preset personal sebelum paint saat akun berubah agar preset akun sebelumnya tidak sempat tampil.
  - [x] Kirim instruksi Workspace, fokus bab, dan konteks Canvas sebagai JSON terpisah dari pesan tersimpan; batasi ukurannya, redaksi PII, dan bedakan preferensi pengguna dari isi dokumen yang tidak tepercaya.
  - [x] Selaraskan comparison dengan konteks Canvas: batasi dokumen ke sekitar seleksi yang masih valid dan sesuai batas API, abaikan seleksi usang, dan sertakan fokus bab aktif.
  - [x] Sinkronkan pemilih profil utama RuangKerja dengan ketersediaan terbaru dari katalog server; nonaktifkan profil/model manual yang tidak tersedia atau tidak mendukung chat streaming.
- [ ] Tinjau unggah/ekstraksi file, batas ukuran/format, preview, sumber, dan penghapusan file.
  - [x] Samakan informasi batas ukuran, jumlah, dan kelompok format dengan aturan unggah yang berlaku di browser/server.
  - [x] Sediakan pemeriksaan ulang status ekstraksi yang masih tertunda atau gagal diperiksa, tanpa mengunggah ulang file.
  - [x] Bedakan kegagalan endpoint status (mis. sesi berakhir atau lampiran tak ditemukan) dari timeout ekstraksi dan pertahankan ID lampiran untuk pemeriksaan ulang.
  - [x] Buat penghapusan lampiran tahan klik ganda dan aman terhadap permintaan bersamaan atau referensi yang sudah terhapus.
  - [x] Pertahankan hasil OCR halaman PDF yang berhasil saat halaman pasangan gagal, dan laporkan halaman yang belum terbaca.
  - [x] Bawa status file tanpa teks terindeks dan peringatan ekstraksi parsial ke konteks AI; tandai metadata sebagai tidak tepercaya, batasi panjangnya, dan tampilkan protokol sitasi hanya jika ada evidence chunk.
- [ ] Tinjau sitasi, penelusuran sumber, batas verifikasi, dan tampilan asal klaim.
  - [x] Labeli sumber web sebagai eksternal belum diverifikasi dan bedakan daftar rujukan dari bukti dukungan klaim.
  - [x] Lengkapi modal pencarian/import sitasi dengan nama dialog, perangkap fokus, fokus awal, pemulihan fokus, dan penutupan Escape.
  - [x] Batasi ukuran impor .bib/.ris, jelaskan format yang tidak terbaca, dan tampilkan jalur salin manual bila akses clipboard gagal.
  - [x] Tandai metadata Crossref dan impor secara terpisah; tahun yang hilang tetap kosong/n.d. dan tidak diganti dengan tahun berjalan.
- [x] Sediakan pemulihan draf Canvas saat halaman dimuat ulang, pertahankan versi dasar agar konflik server terlihat, dan hapus salinan sesi setelah tersimpan atau diganti dengan versi server.
- [ ] Tinjau artefak teks/tabel/diagram, autosave, konflik, riwayat versi, diff, dan pemulihan.
  - [x] Rebase autosave antre pada versi server terbaru dan bawa metadata versi lengkap ke pemulihan konflik Canvas.
  - [x] Simpan baseline versi/timestamp pada draf Canvas dalam memori; deteksi konflik saat Canvas dibuka kembali dan tahan autosave sampai pengguna memilih versi.
  - [x] Selaraskan keterangan snapshot dengan perilaku server (autosave memperbarui versi aktif) dan jelaskan bahwa draf lokal belum tersimpan ke server serta pemulihannya bergantung pada penyimpanan sesi browser.
  - [x] Terapkan nama dialog, fokus awal, perangkap/pemulihan fokus, dan Escape pada modal sitasi, parafrase, dan galeri template.
  - [x] Jelaskan batas editor akademik lokal: Konservatif mempertahankan draf, Sintesis memilih kalimat sumber, Restrukturisasi dinonaktifkan, metrik mengikuti hasil edit, dan estimator hanya membandingkan kedua teks dengan rincian terbatas.
- [ ] Tinjau workflow agent, persetujuan sebelum eksekusi, pembatalan, retry, dan pemulihan task gagal.
  - [x] Pertahankan dependency saat urutan tampilan task diubah agar tombol pindah tidak menghapus prasyarat eksekusi.
  - [x] Pisahkan tombol “Stop task” dari “Batalkan plan”; hentikan eksekusi aktif lewat endpoint task, pertahankan plan agar task dapat dicoba lagi, dan muat ulang status jika pembatalan gagal.
  - [x] Segarkan plan setelah kegagalan start, review, transisi, cancel, atau recovery supaya retry tidak memakai status lokal yang usang.
  - [x] Jelaskan bahwa “Jeda plan” menghentikan langkah lanjutan, sedangkan task aktif tetap berjalan sampai selesai; “Stop task” menghentikan task aktif.
  - [x] Tetap sediakan “Stop task” dan “Batalkan plan” saat plan dijeda, termasuk ketika task aktif masih berjalan.
- [ ] Tinjau perbandingan model, fallback, penggunaan provider, serta ekspor DOCX/XLSX/PPTX.
  - [x] Tandai kandidat perbandingan gagal bila stream berhenti tanpa event akhir dan abaikan hasil analisis/sintesis dari run lama.
  - [x] Sinkronkan profil comparison dengan ketersediaan server, tahan pengiriman bila pilihan tidak aktif, dan tampilkan provider aktual tiap kandidat.
  - [x] Validasi kecocokan model pada semua jalur dan tahan output comparison sampai lolos pemeriksaan keselamatan; jangan rekam jawaban yang ditolak dan jelaskan alasan penahanan.
  - [x] Tunda pencabutan URL sementara setelah ekspor DOCX, Markdown, teks, BibTeX, dan RIS agar browser sempat memulai unduhan.
  - [x] Tambahkan fokus keyboard, penahanan fokus, pemulihan fokus, dan Escape pada modal ekspor.
  - [x] Netralisasi teks header dan sel pada ekspor XLSX agar input yang diawali formula tidak dieksekusi spreadsheet.

## Fase 6 — Kampus dan kesiapan rilis

- [ ] Tinjau provisioning tenant, isolasi data, role admin, pemetaan akun, dan analitik agregat.
- [ ] Verifikasi konfigurasi produksi, migration rehearsal, retensi terjadwal, batas upload, dan monitoring kegagalan.
  - [x] Selaraskan contoh status liveness di release checklist dengan respons aktual endpoint dan kontrak smoke check (`ok`).
- [ ] Lakukan restore rehearsal dari backup terenkripsi di lingkungan terisolasi dan siapkan salinan off-host yang disetujui.
- [ ] Ukur performa rute utama pada ponsel dan jaringan lambat.
- [ ] Lakukan tinjauan aksesibilitas manual: pembaca layar, keyboard saja, zoom 200%, reduced motion, dan perangkat fisik.
- [ ] Jalankan smoke check pascadeploy untuk health/readiness, HTTPS/CSP, database, model AI, dan kontak darurat.
- [ ] Dapatkan sign-off klinis, privasi, kampus, dan operasional yang tercatat sebelum pilot/produksi.

## Urutan kerja berikutnya

1. Lanjutkan Fase 5: konteks workspace, unggah/sumber, workflow agent, perbandingan model, dan ekspor.
2. Audit end-to-end Fase 3: chat, histori, mood, mindfulness, serta rute bantuan darurat.
3. Lakukan QA manual Fase 4 untuk booking/reschedule/batal pada WIB, WITA, WIT, konflik slot, approval, dan pengingat browser.
4. Tutup Fase 6 bersama pemilik klinis, privasi, kampus, dan deployment karena beberapa gerbang memerlukan bukti di luar source code.
