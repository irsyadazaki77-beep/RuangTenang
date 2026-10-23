# Integrasi model lokal

Semua delapan model pada instalasi ini terdaftar: Phi 4 Mini, DeepSeek R1 1.5B,
Gemma 3 270M/1B, Qwen 3.5 0.8B, Qwen 3 1.7B/8B, dan Bonsai 27B.
Nama/tag Ollama dipetakan persis; model tidak diunduh atau diganti otomatis.

## Pemilihan otomatis

Profil Tenang dan Kerja tetap tersedia. Kedelapan model Ollama yang terpasang
juga dapat dipilih langsung di RuangTenang dan RuangKerja, termasuk oleh akun
Free. Pilihan manual memakai model tersebut tanpa fallback ke model lain.
Setiap pesan dinilai ulang berdasarkan tugas, preferensi profil, kemampuan, dan
model yang terpasang. Model yang dihapus atau daemon yang mati terdeteksi pada
refresh inventaris berikutnya (cache 30 detik).

| Kebutuhan | Prioritas lokal |
| --- | --- |
| Chat harian / respons cepat | Qwen 3 1.7B, kemudian Gemma/Phi sesuai tugas |
| Coding, dokumen, penalaran mendalam | Qwen 3 8B, kemudian Phi 4 Mini/Bonsai |
| Gambar dan OCR | Qwen 3.5 0.8B; hasil OCR perlu diperiksa |
| Fallback hemat memori | Qwen 3 1.7B, Gemma 3 1B, Qwen 3.5 0.8B, Gemma 270M |

DeepSeek R1 1.5B tetap tersedia sebagai kandidat alternatif dan pilihan internal.
Kualitas Bahasa Indonesia model kecil berbeda-beda; status lolos smoke test
berarti inferensi berhasil, bukan jaminan ketepatan semua jawaban.
Pemilihan prioritas bersifat kebijakan awal, bukan hasil benchmark mutu universal.

## Perlindungan sumber daya

- Satu inferensi Ollama aktif per proses web, termasuk sampai streaming selesai.
- Antrean FIFO maksimal 32 permintaan menunggu; waktu tunggu maksimal 120 detik.
- Abort pengguna dan timeout membatalkan inferensi; antrean dilepas saat selesai/error.
- `keep_alive: 0` melepas bobot model setelah inferensi untuk menghindari penumpukan
  model di RAM/VRAM. Konsekuensinya model perlu dimuat ulang pada pesan berikutnya.
- Konteks default 8192 token, dapat diatur lewat `OLLAMA_NUM_CTX` (2048–32768).
  Batas output disesuaikan konteks. Prompt panjang tetap bergantung pada pengolahan
  dokumen dan keterbatasan jendela konteks.
- API native `/api/chat` digunakan untuk JSON, gambar, dan streaming NDJSON.
  Teks thinking tidak ditampilkan; thinking dinonaktifkan bila model mendukungnya.
- Fallback otomatis maksimal dua alternatif, termasuk kandidat ringan jika tersedia.
  Model yang tidak terpasang atau tidak memiliki kemampuan yang diminta disaring.
- `LOCAL_AI_ONLY=true` mempertahankan pembatasan provider cloud yang sudah ada.

Jalankan satu proses server web untuk satu daemon Ollama. Antrean ini tidak
mengoordinasikan aplikasi lain atau beberapa proses server yang memakai daemon
sama. RAM yang dipakai aplikasi lain tetap dapat menyebabkan kehabisan memori.

## Verifikasi

```powershell
npm run check:local-ai
npm run check:local-ai:extras
```

Pemeriksaan pertama mencoba respons biasa dan streaming dari setiap model.
Pemeriksaan tambahan mencoba JSON, gambar, permintaan bersamaan, dan routing profil.
Laporan tersimpan di `output/local-ai-check.json` dan `output/local-ai-extra-check.json`.
Server yang berjalan melalui `npm run dev` memuat ulang perubahan; server produksi
memerlukan `npm run build` dan restart.

Referensi API: https://github.com/ollama/ollama/blob/main/docs/api.md
