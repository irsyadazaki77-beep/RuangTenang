# Rencana Penyegaran UI/UX RuangTenang

## Tujuan

Membuat RuangTenang dan RuangKerja terasa seperti satu produk AI yang matang: bersih, mudah dipindai, nyaman dipakai lama, konsisten di ponsel dan desktop, serta tetap mempertahankan karakter dukungan emosional dan alat akademik.

## Arah visual

- Gunakan latar netral dan panel yang jelas; batasi gradien, blur, dan bayangan pada tempat yang benar-benar membantu fokus.
- Pertahankan teal sebagai aksen RuangTenang dan indigo sebagai aksen RuangKerja. Warna aksen menandai konteks, bukan mewarnai seluruh layar.
- Satukan skala tipografi, radius, border, fokus keyboard, dan tinggi kontrol melalui token permukaan bersama.
- Dahulukan keterbacaan, konsistensi, dan ruang kosong daripada dekorasi.

## Cakupan pengerjaan

1. **Fondasi visual** — selaraskan warna latar, panel, border, elevasi, dan tipografi global agar semua rute memiliki dasar yang sama.
2. **Navigasi dan shell** — rapikan sidebar, header, responsivitas, dan penekanan aksi penting.
3. **Pengalaman chat** — rapikan layar kosong, riwayat percakapan, header, composer, dan tampilan pesan.
4. **RuangKerja** — selaraskan beranda, header, composer, panel konteks, dokumen, dan kanvas dengan fondasi yang sama.
5. **Halaman pendukung** — cek pengaturan dan fitur kesejahteraan supaya komponen bersama tetap konsisten tanpa menghapus fungsi.

## Kriteria selesai

- Desktop dan ponsel memiliki hierarki yang jelas dan tidak menampilkan elemen yang saling berebut perhatian.
- Mode terang dan gelap memakai kontras teks dan batas panel yang mudah dibaca.
- Aksi utama, pencarian, riwayat, status, dan jalur bantuan mudah ditemukan.
- Komponen chat dan RuangKerja memakai pola visual yang konsisten.
- Build produksi tetap berhasil; pemeriksaan otomatis hanya dijalankan bila diminta.

## Status

- [x] Audit struktur aplikasi dan pola visual yang sudah ada.
- [x] Layar awal RuangTenang mengikuti referensi: sapaan terpusat, composer di tengah, chip aksi cepat, dan check-in mood opsional.
- [x] Fondasi visual dan shell navigasi.
- [x] Beranda RuangKerja: sapaan terpusat, prompt untuk memulai workspace, pencarian, kartu workspace terbaru, dan aksi cepat.
- [x] Percakapan RuangKerja: composer, panel konteks, dokumen, dan kanvas.
- [x] Tampilan workspace baru mengikuti referensi: status sesi sementara, gradasi lavender-indigo, sapaan ringkas, composer lebar, chip tugas, galeri template, dan perbandingan model.
- [x] Penyelarasan halaman pendukung dan pemeriksaan hasil.
- [x] Build produksi.
- [x] Pemeriksaan tipe TypeScript.
