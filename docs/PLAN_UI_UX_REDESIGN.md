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


## Pembaruan Tahap 2 — Penyempurnaan Setara AI Frontier (ChatGPT, Gemini, Claude, Cursor)

- [x] **Fase 0 — Baseline Visual & E2E Spec**: Penambahan [`e2e/ui-baseline.spec.ts`](../e2e/ui-baseline.spec.ts) untuk pengujian tangkapan layar Light/Dark lintas Desktop, Tablet, dan Mobile.
- [x] **Fase 1 — Sistem Desain Terpadu & Primitives**:
  - Skala tipografi 6 tingkat (`.headline-hero`, `.headline-display`, `.headline-page`, `.headline-section`, `.body-prose`, `.text-meta-inline`) dan font kode (`--font-mono` / `.font-code`).
  - Token permukaan berlapis (`--rt-surface-0`, `--rt-surface-1`, `--rt-surface-2`) dan aksen kontekstual `[data-space="tenang" | "kerja" | "coder"]`.
  - Komponen badge pintasan keyboard `Kbd` dan penyempurnaan `CommandPalette` (`Ctrl/⌘+K` aktif dari mana saja termasuk saat mengetik di composer chat/workspace, dengan header kategori dan navigasi ARIA `listbox`/`option`).
  - Penurunan intensitas latar aurora saat percakapan aktif dan pengurangan beban `backdrop-filter` pada layar mobile.
- [x] **Fase 2 — RuangTenang**:
  - Akses tombol darurat **SOS** permanen 1-klik di `ChatHeader`.
  - Lebar baca optimal `max-w-[720px]` pada respons asisten & animasi token streaming halus (`.animate-token-fade`).
  - Petunjuk pintasan keyboard desktop pada `ChatComposer` dan tombol mengambang "Pesan Baru" dengan transisi tenang.
- [x] **Fase 3 — RuangKerja**:
  - Split-view proporsional dengan batas lebar minimum (`min-w-[380px]` obrolan, `min-w-[420px]` Canvas) dan divider `role="separator"` yang mendukung fokus serta navigasi keyboard (`ArrowLeft`/`ArrowRight`/`Home`).
  - Indikator status penyimpanan eksplisit ("Tersimpan di Ruang Kerja") di `ArtifactCanvasToolbar` dan skeleton pemuatan di `WorkspaceInspectorPanel`.
- [x] **Fase 4 — RuangCoder**:
  - Ekstraksi sub-komponen dan konfigurasi inti ke [`src/features/coder/ide/coderCore.tsx`](../src/features/coder/ide/coderCore.tsx) (`PomodoroFocusBadge`, `FormattedAgentContent`, `CoderMobileNavBar`, konfigurasi persona & starter).
  - Peningkatan aksesibilitas ARIA menyeluruh (`role="tree"`, `role="treeitem"`, `role="tablist"`, `role="tab"`, `role="log"`, `aria-live="polite"`, dan `aria-label` pada kontrol input/tombol).
