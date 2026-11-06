# Academic Defense & Thesis Mastery Suite

Upgrade komprehensif untuk **RuangKerja** dan **RuangTenang** yang menghadirkan laboratorium penguasaan skripsi dan simulasi sidang akhir langsung di dalam panel **Live Canvas** dan **Toolbar RuangKerja**.

## User Review & Critical Decisions

> [!IMPORTANT]
> Seluruh preferensi yang Anda pilih telah dikunci ke dalam rencana arsitektur di bawah ini. Silakan tinjau alur kerja dan desain sebelum kita mulai tahap implementasi kode.

- **Confirmed Focus Area**: **Academic Defense & Thesis Mastery Suite** — fokus pada kesiapan substansi naskah, integritas ilmiah, peta literatur, keseimbangan mental saat pengerjaan bab, dan simulasi sidang skripsi.
- **Confirmed Feature Scope (All 5 Modules Included)**:
  1. **Simulasi Sidang Skripsi Interaktif (Suara & Rubrik Dewan Penguji)**: Simulasi tanya-jawab lisan dan teks bersama 3 karakter penguji (Ketua Sidang, Penguji Metodologi, Penguji Substansi) lengkap dengan penilaian rubrik akademik real-time.
  2. **Pemeriksa Orisinalitas, Kohesi & Sitasi Klaim Otomatis**: Audit naskah per paragraf untuk mendeteksi klaim empiris tanpa sitasi (`Uncited Claim`), kepadatan repetisi leksikal, kohesi antar-kalimat (PUEBI), dan tombol perbaikan otomatis 1-klik.
  3. **Literature Graph & Peta Konsep Interaktif**: Visualisasi jaringan pengetahuan (*Interactive Force/Node Graph*) yang memetakan hubungan antar penulis/jurnal, variabel riset, metodologi, dan *research gap* dari naskah atau dokumen PDF/Canvas aktif.
  4. **Jurnal Refleksi & Analitik Korelasi Mood vs. Progres Bab Skripsi**: Panel reflektif dan grafik analitik dua sumbu (*Recharts*) yang memetakan tren beban kognitif/mood mahasiswa terhadap pencapaian progres Bab I–V skripsi serta rekomendasi jeda adaptif.
  5. **Ekspor Paket Sidang Lengkap (1-Click Defense Kit)**: Generator paket sidang terpadu yang mengekspor **Slide Presentasi Sidang (`.pptx`)** lengkap dengan *Speaker Notes*, **Naskah Skripsi (`.docx` / `.pdf`)**, dan **Lembar Cheat-Sheet Pertanyaan & Jawaban Penguji (`.md` / `.pdf`)**.
- **Confirmed UX Integration**: **Terintegrasi langsung di panel Canvas & Toolbar RuangKerja** (serta dapat diakses cepat dari Action Bar di atas lembar dokumen Canvas dan pintasan `/sidang` atau `/audit`).

---

## 1. Overview & Core Concept

- **What It Does**: Mengubah panel Canvas RuangKerja dari sekadar editor dokumen menjadi **Academic Defense & Thesis Mastery Studio** tempat mahasiswa dapat menguji ketajaman drafnya, memetakan jaringan literatur secara visual, berlatih menghadapi dewan penguji dengan suara dua arah, memantau korelasi mood vs. progres bab, hingga mengunduh seluruh perlengkapan sidang dalam satu klik.
- **Target Audience / Persona**: Mahasiswa tingkat akhir yang sedang menyusun proposal/skripsi (Bab I–V) dan membutuhkan umpan balik objektif sekelas dosen pembimbing/penguji sekaligus dukungan regulasi beban mental.
- **Key Value**: Mengurangi kecemasan sidang (*defense anxiety*) dan kebuntuan menulis (*writer's block*) melalui simulasi terukur, audit sitasi otomatis, dan paket ekspor siap pakai.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Akses Cepat dari Canvas Action Bar & Toolbar**: Saat mahasiswa membuka dokumen atau kerangka skripsi di panel Canvas, bilah **Studio Akademik & Sidang** menampilkan akses langsung ke *Simulasi Sidang*, *Audit Klaim & Kohesi*, *Peta Literatur (Graph)*, *Progres & Mood Bab*, serta tombol **Unduh Paket Sidang (.PPTX + .DOCX + Q&A)**.
  2. **Alur Simulasi Sidang (Interactive Defense Stage)**:
     - Kiri/Atas (65% area): Panggung penguji dengan 3 peran penguji (*Penguji 1: Kebaruan & Urgensi*, *Penguji 2: Validitas Metodologi*, *Penguji 3: Ketajaman Pembahasan & Sitasi*), gelombang audio TTS (`EmpatheticSpeechPlayer`), tombol rekam suara jawaban mahasiswa (*Speech-to-Text*), dan transkrip dialog.
     - Kanan/Bawah (35% area): Kartu Skor Rubrik 4 Dimensi (*Penguasaan Teori*, *Ketepatan Metodologi*, *Argumentasi & Bukti*, *Ketenangan & Artikulasi*) menggunakan angka tabular (`tabular-nums`) dan umpan balik perbaikan instan yang bisa langsung disisipkan ke naskah Canvas.
  3. **Alur Audit Orisinalitas, Kohesi & Sitasi Klaim**:
     - Memindai naskah aktif dan menampilkan indeks skor integritas ilmiah, daftar klaim kalimat yang belum memiliki rujukan tahun/penulis, kalimat yang terlalu panjang/kurang kohesif, serta aksi **"Sisipkan Rujukan / Perbaiki Kalimat"** yang langsung memperbarui paragraf di Canvas.
  4. **Alur Literature Graph & Peta Konsep Interaktif**:
     - Kanvas SVG interaktif (zoom, pan, klik node, filter kategori node: *Teori Utama*, *Jurnal Terdahulu*, *Variabel*, *Metodologi*, *Celah Riset*). Mengklik node menampilkan detail kutipan, hubungan dengan variabel lain, dan tombol **"Buat Paragraf Sintesis"** ke Canvas.
  5. **Alur Analitik Korelasi Mood vs. Progres Bab Skripsi**:
     - Pelacak status Bab I–V (0%–100%), pencatat jurnal refleksi singkat, dan grafik komposit *Recharts* yang menyandingkan kurva energi/mood harian dengan kecepatan penyelesaian bab.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: **Academic Editorial & Interactive Simulation Sandbox** — memadukan estetika lembar naskah ilmiah yang tenang dengan kontrol instrumen laboratorium pendidikan yang presisi.
  - *Color Palette & Mood* (60-30-10 Budget):
    - **60% Dominant Surface**: Kertas naskah bersih (`#FFFFFF` / `#F8FAFC`) pada mode terang dan slate gelap tenang (`#0B101B` / `#0F172A`) pada mode gelap.
    - **30% Structural Panels**: Pembatas garis halus (`border-slate-200/80 dark:border-slate-800`), latar kartu sekunder (`bg-slate-50/70 dark:bg-slate-900/90`).
    - **10% Semantic Focal Accents**: Indigo (`#4F46E5`) untuk navigasi utama Studio Akademik, Emerald (`#059669` + label eksplisit) untuk klaim terverifikasi/skor kuat, dan Amber (`#D97706` + ikon peringatan) untuk klaim tanpa sitasi atau beban kognitif tinggi.
  - *Typography & Hierarchy*:
    - *Display & Headings*: `Plus Jakarta Sans` SemiBold/Bold dengan `text-wrap: balance`.
    - *Academic Prose*: `Lora` serif untuk naskah skripsi dan kutipan.
    - *Rubric Metrics & Scores*: `font-mono tabular-nums` untuk skor rubrik, persentase kohesi, dan durasi waktu jawab.
  - *Anti-Slop & Restraint Rules*:
    - Metadata ditampilkan sebagai teks bersih dengan pemisah `·` (tanpa tumpukan *pill badges* dekoratif).
    - Setiap indikator warna selalu didampingi label teks dan ikon eksplisit (bukan sekadar titik warna).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Arsitektur Terpadu di Dalam Panel Canvas (`ThesisMasteryStudio`)**
  - *Chosen Approach*: Menyematkan kelima fitur baru sebagai mode terintegrasi di dalam ekosistem Canvas & `InteractiveStudySuite` (beserta pintasan langsung di Toolbar atas Canvas), bukan memecahnya menjadi halaman terpisah yang memutus fokus menulis.
  - *Why*: Mahasiswa dapat membaca draf naskah sambil mengaudit klaim, memetakan literatur, atau berlatih tanya-jawab sidang tanpa kehilangan konteks dokumen yang sedang dikerjakan.
- **Decision 2: Kombinasi Analisis Deterministik Cepat + Evaluasi AI Mendalam (`gemini-3.8-flash`)**
  - *Chosen Approach*: Pemeriksaan kepadatan kata, panjang kalimat, deteksi pola sitasi `(Penulis, Tahun)` / `[1]`, dan ekstraksi kerangka presentasi dijalankan secara instan di sisi klien, lalu diperkaya oleh endpoint server `/api/v1/ai/*` menggunakan `gemini-3.8-flash` dengan skema JSON terstruktur (`responseSchema`) serta *fallback* deterministik jika kuota/jaringan terbatas.
  - *Why*: Menjamin responsivitas di bawah 200ms untuk interaksi UI sekaligus memberikan kedalaman analisis sekelas dosen penguji.
- **Decision 3: Paket Ekspor Sidang 1-Klik Berbasis Standar Industri**
  - *Chosen Approach*: Mengorkestrasi generator `.pptx` (`pptxgenjs`), `.docx` (`docx`), dan `.pdf` (`pdfkit`) untuk menghasilkan satu bundel siap sidang yang mencakup slide presentasi otomatis, naskah terformat, dan daftar kemungkinan pertanyaan penguji beserta poin jawaban kunci.
  - *Why*: Menghilangkan kerja manual menyalin isi bab ke PowerPoint satu per satu menjelang hari sidang.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     RUANGKERJA WORKSPACE & LIVE CANVAS                       │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ArtifactCanvasToolbar & Academic Quick Bar                             │  │
│  │  ├─ [Simulasi Sidang]  ├─ [Audit Klaim & Kohesi]  ├─ [Peta Literatur]  │  │
│  │  ├─ [Mood & Progres Bab]                  └─ [Ekspor Paket Sidang 1x]  │  │
│  └───────────────────────────────────┬────────────────────────────────────┘  │
│                                      ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ InteractiveStudySuite & ThesisMasteryStudio (Canvas Mode Host)         │  │
│  │                                                                        │  │
│  │  ┌──────────────────────────┐  ┌────────────────────────────────────┐  │  │
│  │  │ 1. DefenseSimulatorStage │  │ 2. OriginalityClaimAuditor         │  │  │
│  │  │  • 3 Penguji Personas    │  │  • Uncited Claim Scanner           │  │  │
│  │  │  • Voice Input + TTS     │  │  • PUEBI Cohesion & Lexical Metric │  │  │
│  │  │  • 4D Rubric Evaluation  │  │  • 1-Click Inline Paragraph Fix    │  │  │
│  │  └──────────────────────────┘  └────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────┐  ┌────────────────────────────────────┐  │  │
│  │  │ 3. LiteratureGraphCanvas │  │ 4. MoodChapterCorrelationPanel     │  │  │
│  │  │  • Interactive SVG Nodes │  │  • Bab I–V Milestone Tracker       │  │  │
│  │  │  • Author/Var/Gap Links  │  │  • Reflection Journal + Mood Sync  │  │  │
│  │  │  • Node-to-Prose Builder │  │  • Dual-Axis Recharts Correlation  │  │  │
│  │  └──────────────────────────┘  └────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │ 5. DefensePackageExporter (1-Click Defense Kit)                  │  │  │
│  │  │  • Slide Deck (.pptx) + Speaker Notes + Q&A Cheat-Sheet + .docx  │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────┬────────────────────────────────────┘  │
└──────────────────────────────────────┼───────────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                  EXPRESS BACKEND (/api/v1/ai/* in studyAndSpeech.ts)         │
│  ├─ POST /api/v1/ai/defense-simulation  (Pertanyaan Penguji & Skor Rubrik)   │
│  ├─ POST /api/v1/ai/manuscript-audit    (Audit Klaim, Sitasi & Rekomendasi)  │
│  └─ POST /api/v1/ai/literature-graph    (Ekstraksi Node & Relasi Konsep)     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping

1. **Simulasi Sidang Skripsi (`DefenseSimulatorStage`)**:
   - **State**: `selectedExaminerRole` (`ketua_sidang` | `penguji_metodologi` | `penguji_substansi`), `sessionTurns` (daftar pertanyaan penguji, jawaban mahasiswa, skor per giliran), `overallRubric` (skor 0–100 untuk 4 kriteria), `isRecordingAnswer` (integrasi `useComposerVoiceInput`), dan `speechStatus` (integrasi `speechPlayer.speak`).
   - **Handlers**: `handleStartDefenseSession()` memuat pertanyaan pembuka berdasarkan isi naskah Canvas; `handleSubmitAnswer()` mengirim jawaban ke `/api/v1/ai/defense-simulation` untuk mendapatkan skor rubrik objektif, kritik penguji, jawaban ideal, dan pertanyaan tindak lanjut; `handleAppendDefenseNotesToCanvas()` menyisipkan rangkuman evaluasi sidang ke naskah.

2. **Pemeriksa Orisinalitas, Kohesi & Sitasi Klaim (`OriginalityClaimAuditor`)**:
   - **State**: `auditReport` (skor kohesi, variasi leksikal, rasio klaim tersitasi, daftar temuan per kalimat dengan kategori `uncited_claim` | `cohesion_issue` | `repetition` | `strong_argument`), `activeFilter`, dan `appliedFixIds`.
   - **Handlers**: `handleRunAudit()` memindai teks Canvas secara lokal dan melalui `/api/v1/ai/manuscript-audit`; `handleApplySuggestedFix(finding)` mengganti kalimat bermasalah di naskah Canvas secara langsung dan menandai temuan sebagai selesai.

3. **Literature Graph & Peta Konsep Interaktif (`LiteratureGraphCanvas`)**:
   - **State**: `graphData` (`nodes`: `theory` | `author_study` | `variable` | `methodology` | `research_gap`, `edges`: relasi berlabel seperti `mendukung`, `mengukur`, `celah_riset`), `selectedNodeId`, `categoryFilter`, dan `zoomLevel`.
   - **Handlers**: `handleGenerateGraph()` mengekstrak peta konsep dari naskah/matriks literatur via `/api/v1/ai/literature-graph`; klik pada node menampilkan panel inspeksi detail dan tombol `handleSynthesizeNodeToCanvas()` untuk menyusun paragraf sintesis hubungan antar-node ke dokumen.

4. **Jurnal Refleksi & Analitik Korelasi Mood vs. Progres Bab (`MoodChapterCorrelationPanel`)**:
   - **State**: `chapterProgress` (persentase penyelesaian & target kata Bab I–V yang disimpan di storage lokal pengguna), `reflectionEntries` (catatan refleksi harian, tingkat mood 1–5, tingkat fokus 1–5, bab yang dikerjakan), serta korelasi gabungan dengan riwayat mood RuangTenang.
   - **Handlers**: `handleUpdateChapterProgress(chapterId, pct)` memperbarui milestone bab; `handleAddReflectionEntry()` menyimpan jurnal refleksi dan memperbarui grafik `ComposedChart` (*Recharts*) yang memvisualisasikan tren mood vs. progres bab beserta saran ritme kerja.

5. **Ekspor Paket Sidang Lengkap (`DefensePackageExporter`)**:
   - **State**: `packageConfig` (pilihan tema slide `.pptx`, format naskah `.docx`/`.pdf`, serta penyertaan lembar Q&A Sidang), `exportStep` (`idle` | `generating_slides` | `generating_manuscript` | `generating_qa` | `completed`).
   - **Handlers**: `handleExportFullDefenseKit()` menyusun struktur slide sidang khusus (Latar Belakang, Rumusan Masalah, Landasan Teori, Metodologi, Hasil & Pembahasan, Kesimpulan, serta Slide Cadangan Q&A Penguji) menggunakan `exportEditablePptx`, mengunduh naskah `.docx` berstandar skripsi 4-4-3-3, dan menyertakan lembar persiapan tanya-jawab sidang.
