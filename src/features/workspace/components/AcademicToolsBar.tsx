import React, { useState } from 'react';
import {
  BookOpen,
  Quote,
  Code2,
  FileText,
  Table,
  Sparkles,
  Pencil,
  ChevronRight,
  Lightbulb,
  X,
  BarChart2,
  ShieldCheck,
  Share2,
  Users
} from 'lucide-react';
import { AcademicTaskTemplate } from '../types';

export const ACADEMIC_TEMPLATES: AcademicTaskTemplate[] = [
  {
    id: 'latar-belakang-bab1',
    title: 'Draf Bab 1 (Latar Belakang)',
    description: 'Susun Latar Belakang Masalah dengan 4 pilar argumen (Das Sollen, Das Sein, Gap, Solusi).',
    icon: 'FileText',
    targetArtifact: 'DOCUMENT',
    prompt: `Bantu saya menyusun draf Latar Belakang Masalah (Bab 1) berbobot ilmiah tinggi untuk topik penelitian berikut.
Wajib gunakan format kanvas:
:::artifact{type="markdown" title="Draf Latar Belakang Masalah (Bab 1)"}
Sertakan 4 pilar argumen secara berurutan:
1. Fenomena Ideal (Das Sollen)
2. Kondisi Faktual Lapangan (Das Sein) [Sertakan data statistik/observasi lapangan di sini]
3. Analisis Kesenjangan (Research Gap)
4. Urgensi & Usulan Solusi
:::

Topik / Judul Skripsi:`
  },
  {
    id: 'resume-jurnal',
    title: 'Bedah Paper & Jurnal',
    description: 'Bedah kritis artikel jurnal untuk Bab 2 (APA 7th, variabel, temuan, limitasi, narasi).',
    icon: 'BookOpen',
    targetArtifact: 'DOCUMENT',
    prompt: `Kamu adalah Analis Literatur Ilmiah di RuangKerja.
Tugasmu adalah membedah artikel jurnal ilmiah dan menyusun ringkasan kritis yang siap digunakan mahasiswa untuk menyusun Bab 2 (Tinjauan Pustaka).

Format Output Wajib:
:::artifact{type="markdown" title="Telaah Kritis Jurnal: [Nama Penulis, Tahun]"}
### 1. Rujukan Sitasi Resmi (APA 7th)
\`[Nama Belakang, Inisial. (Tahun). Judul Artikel. Nama Jurnal, Volume(Nomor), Halaman. DOI/URL]\`

### 2. Peta Variabel & Metodologi
- Variabel Bebas (Independent): ...
- Variabel Terikat (Dependent): ...
- Pendekatan & Teknik Sampling: (cth: Kuantitatif asosiatif, purposive sampling N=120)
- Instrumen/Analisis Data: (cth: PLS-SEM / Uji Regresi Berganda)

### 3. Temuan Kunci Empiris
- [Poin temuan 1 beserta nilai signifikansi jika ada]
- [Poin temuan 2]

### 4. Limitasi & Peluang Penelitian Lebih Lanjut
- Apa kelemahan atau batasan lingkup dari paper ini yang belum terselesaikan?

### 5. Template Narasi untuk Bab 2 Skripsi
*(Gunakan paragraf di bawah ini untuk sub-bab Kajian Penelitian Terdahulu)*:
"[Nama Peneliti] ([Tahun]) dalam penelitiannya yang berjudul '[Judul]' meneliti mengenai [fokus utama]. Hasil penelitian menunjukkan bahwa [temuan utama]. Namun demikian, penelitian tersebut memiliki keterbatasan pada [limitasi]. Hal ini menjadi pembeda dengan penelitian yang dilakukan saat ini, di mana fokus penelitian ini diarahkan pada [kebaruan penelitian mahasiswa]."
:::

Berikut artikel / abstrak jurnal yang ingin dibedah:`
  },
  {
    id: 'matriks-literatur-bab2',
    title: 'Matriks Sintesis Literatur (Bab 2)',
    description: 'Sintesis komparatif multi-jurnal: APA 7th, variabel X/Y, metodologi, temuan, gap riset, dan narasi skripsi.',
    icon: 'Table',
    targetArtifact: 'DOCUMENT',
    prompt: `Bantu saya menyusun Matriks Sintesis Literatur Penelitian Terdahulu untuk Bab 2 Skripsi secara komparatif dari dokumen jurnal yang saya lampirkan.
Wajib gunakan format kanvas:
:::artifact{type="markdown" title="Matriks Sintesis Literatur (Bab 2 Skripsi)"}
# 📊 Matriks Penelitian Terdahulu & Sintesis Pustaka

| No | Peneliti & Tahun [Sitasi] | Variabel / Fokus Penelitian | Metodologi & Sampel | Temuan Kunci Empiris | Keterbatasan & Research Gap | Relevansi dengan Skripsi |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |

## 2.2 Draf Narasi Sintesis Penelitian Terdahulu (Bab 2 Skripsi)
*(Paragraf akademik kohesif yang mengaitkan persamaan, perbedaan, dan gap penelitian di atas dengan posisi riset mahasiswa saat ini)*
:::

Fokus / Topik Skripsi saya:`
  },
  {
    id: 'format-sitasi',
    title: 'Format Sitasi Ilmiah',
    description: 'Buat daftar pustaka otomatis berstandar APA 7th, IEEE, atau Harvard.',
    icon: 'Quote',
    targetArtifact: 'CITATION',
    prompt: `Tolong buatkan daftar sitasi dan bibliografi standar ilmiah (APA 7th Edition, IEEE, atau Harvard) dari referensi berikut. Pastikan komponen penulis, tahun, judul artikel, nama jurnal, volume/issue, DOI/URL akurat dan sesuai kaidah penulisan ilmiah:
<artifact type="citation" title="Daftar Sitasi Ilmiah">
...format sitasi...
</artifact>

Data Sumber Referensi:`
  },
  {
    id: 'debug-kode',
    title: 'Debug & Optimasi Kode',
    description: 'Temukan letak bug, jelaskan alur logika, dan optimasi efisiensi fungsi.',
    icon: 'Code2',
    targetArtifact: 'CODE',
    prompt: `Analisis kode berikut secara mendalam:
1. Identifikasi letak error/bug atau bottleneck performa.
2. Berikan perbaikan kode yang bersih, aman dari edge-case, dan efisien (jelaskan alur logika dan analisis Big-O).
3. Bungkus kode yang sudah diperbaiki dalam artefak kode:
<artifact type="code" title="Solusi Kode & Optimasi" language="python">
...kode hasil refactor...
</artifact>

Kode atau Pesan Error:`
  },
  {
    id: 'struktur-proposal',
    title: 'Struktur Skripsi / Proposal',
    description: 'Bimbingan merancang bab pendahuluan, rumusan masalah, dan literatur.',
    icon: 'FileText',
    targetArtifact: 'OUTLINE',
    prompt: `Rancang kerangka kerja akademik untuk Proposal Skripsi / Tugas Akhir (BAB 1 - BAB 3) dengan topik yang saya berikan.
Gunakan kaidah penulisan ilmiah terstruktur:
- Latar Belakang Masalah (Metode Piramida Terbalik: Fenomena Makro -> Masalah Nyata -> Urgensi Solusi)
- Rumusan Masalah (Pertanyaan Riset Terarah)
- Batasan Masalah & Tujuan Penelitian
- Kerangka Teori & Sintesis Tinjauan Pustaka
- Metodologi Penelitian & Desain Eksperimen
Bungkus kerangka proposal dalam artefak:
<artifact type="document" title="Kerangka Proposal Skripsi BAB 1-3">
...konten proposal...
</artifact>

Topik / Ide Penelitian:`
  },
  {
    id: 'poster-ilmiah-generator',
    title: 'Poster Ilmiah Konferensi (A1/A2)',
    description: 'Rancang poster ilmiah multi-kolom siap pajang dari temuan riset skripsi atau paper.',
    icon: 'Sparkles',
    targetArtifact: 'DOCUMENT',
    prompt: `Bantu saya menyusun draf konten untuk Poster Ilmiah Konferensi berdasarkan topik atau naskah berikut.
Gunakan format poster terstruktur yang rapi:
:::artifact{type="markdown" title="Poster Ilmiah Konferensi"}
# [Judul Poster Ilmiah yang Menarik dan Jelas]
**Penulis:** [Nama Penulis / Tim Peneliti]
**Afiliasi:** [Departemen, Fakultas, Universitas]

## 1. Latar Belakang & Urgensi
[Ringkasan singkat masalah dan kesenjangan riset dalam 2-3 poin jelas]

## 2. Tujuan & Hipotesis
[Tujuan utama dan hipotesis kerja yang diuji]

## 3. Metodologi & Desain Eksperimen
[Diagram alur metode, populasi/sampel, instrumen, dan teknik analisis data]

## 4. Hasil & Temuan Utama
[Highlight data numerik, temuan kunci, grafik perbandingan]

## 5. Kesimpulan & Manfaat
[Jawaban konkret terhadap hipotesis dan implikasi teoretis/praktis]

## 6. Referensi Terpilih
[3-5 rujukan utama berstandar sitasi akademik]
:::

Topik / Intisari Naskah:`
  },
  {
    id: 'presentasi-sidang-skripsi',
    title: 'Slide Presentasi Sidang (PPT)',
    description: 'Susun draf 10-12 slide presentasi ujian proposal atau sidang skripsi terstruktur.',
    icon: 'BookOpen',
    targetArtifact: 'DOCUMENT',
    prompt: `Bantu saya merancang slide presentasi untuk Sidang Skripsi / Ujian Seminar dengan pembagian slide profesional:
:::artifact{type="markdown" title="Slide Presentasi Sidang Skripsi"}
# [Judul Skripsi / Tugas Akhir]
- Presenter: [Nama Mahasiswa]
- Pembimbing: [Nama Dosen Pembimbing]
- Departemen & Universitas

## Latar Belakang Masalah
- Masalah nyata yang melandasi penelitian
- Kesenjangan riset terdahulu
- Urgensi penyelesaian masalah

## Rumusan Masalah & Tujuan
- Rumusan masalah utama
- Sasaran hasil penelitian

## Tinjauan Pustaka & Kerangka Konseptual
- Landasan teori kunci
- Hubungan antar variabel yang diteliti

## Metodologi Penelitian
- Pendekatan dan desain riset
- Teknik pengumpulan data
- Metode analisis dan validasi

## Hasil & Pembahasan Kunci
- Temuan data empiris
- Analisis komparasi dan interpretasi hasil

## Kesimpulan & Saran
- Kesimpulan menjawab tujuan penelitian
- Keterbatasan dan rekomendasi penelitian lanjutan
:::

Topik / Draf Naskah Skripsi:`
  },
  {
    id: 'parafrase-akademik',
    title: 'Parafrase Akademik',
    description: 'Tulis ulang kalimat atau draf dengan gaya ilmiah dan bahasa baku (KBBI).',
    icon: 'Pencil',
    targetArtifact: 'DOCUMENT',
    prompt: `Parafrase teks berikut agar memiliki gaya bahasa ilmiah yang baku, formal, dan kohesif tanpa mengubah substansi maknanya. Berikan beberapa alternatif redaksi. Hasil ini tidak menjamin lolos pemeriksaan similarity/plagiarisme:
<artifact type="document" title="Hasil Parafrase Akademik">
...konten hasil parafrase...
</artifact>

Teks Asli:`
  },
  {
    id: 'catatan-tulis-tangan-visual',
    title: 'Catatan Tulis Tangan Estetik',
    description: 'Ringkasan materi bergaya buku tulis tangan bergaris (font Caveat/Kalam, stabilo, sticky notes, doodle).',
    icon: 'Pencil',
    targetArtifact: 'CODE',
    prompt: `Buatkan catatan materi visual estetik bergaya TULIS TANGAN (handwritten study notes) untuk topik materi di bawah ini.
Gunakan format artefak kode HTML lengkap:
:::artifact{type="code" language="html" title="Catatan Tulis Tangan: [Topik]"}
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Kalam:wght@400;700&family=Patrick+Hand&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
  /* Desain kertas binder bergaris/grid, stabilo neon/pastel, sticky notes, tulisan tangan rapi */
</style>
</head>
<body class="visual-canvas">
  ...konten visual estetika catatan tangan lengkap dengan judul, poin kunci bertanda stabilo, rumus/kotak penting, dan doodle ikon SVG...
</body>
</html>
:::

Materi yang ingin dibuatkan catatan tangan:`
  },
  {
    id: 'cheatsheet-infografis-visual',
    title: 'Cheatsheet & Infografis Rumus',
    description: 'Rangkuman visual satu lembar padat berisi rumus formula, diagram alur, dan trik kilat ujian.',
    icon: 'Sparkles',
    targetArtifact: 'CODE',
    prompt: `Buatkan cheatsheet ringkasan visual satu halaman (formula cheatsheet / concept map) yang modern, padat, dan rapi untuk topik berikut.
Gunakan format artefak kode HTML mandiri:
:::artifact{type="code" language="html" title="Cheatsheet: [Topik]"}
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
  /* Layout grid modern 2-3 kolom, formula card bergaris tegas, badge highlight */
</style>
</head>
<body class="visual-canvas">
  ...desain cheatsheet lengkap dengan formula kotak rumus, tabel perbandingan ringkas, dan tip trik ujian...
</body>
</html>
:::

Topik / Rumus Materi:`
  },
  {
    id: 'simulasi-ujian-quiz',
    title: 'Simulasi Ujian & Kuis (AI)',
    description: 'Uji pemahaman Anda dengan simulasi soal ujian interaktif, penilaian instan, dan pembahasan materi.',
    icon: 'Sparkles',
    targetArtifact: 'DOCUMENT',
    prompt: `Bantu saya membuat simulasi latihan ujian / kuis pilihan ganda dari topik materi berikut.
Gunakan format JSON kuis interaktif berikut:
:::artifact{type="document" title="Simulasi Ujian: [Topik]"}
{
  "format": "ruangtenang-quiz-v1",
  "title": "Simulasi Ujian: [Topik]",
  "topic": "[Topik]",
  "difficulty": "sedang",
  "timeLimitMinutes": 15,
  "totalQuestions": 5,
  "questions": [
    {
      "id": "q1",
      "question": "Pertanyaan soal...",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "correctIndex": 0,
      "explanation": "Penjelasan mengapa jawaban tepat...",
      "topicTag": "Nama Subtopik"
    }
  ]
}
:::

Materi atau Topik yang Ingin Diujikan:`
  },
  {
    id: 'drill-tanya-jawab-sidang',
    title: 'Drill Tanya Jawab Sidang Skripsi',
    description: 'Prediksi pertanyaan kritis dewan penguji skripsi/UTS/UAS dengan panduan pembelaan argumen ilmiah.',
    icon: 'Sparkles',
    targetArtifact: 'DOCUMENT',
    prompt: `Kamu bertindak sebagai Dewan Penguji Skripsi & Ujian Akademik Senior.
Berdasarkan topik atau draf naskah yang saya berikan, buatkan paket drill simulasi tanya jawab kritis ujian sidang skripsi:
:::artifact{type="markdown" title="Simulasi Tanya Jawab Kritis Sidang Skripsi"}
# 🎓 Paket Prediksi Pertanyaan & Pembelaan Argumen Sidang Skripsi

## 1. Pertanyaan Metodologis & Desain Riset
- **Pertanyaan Penguji:** [Pertanyaan tajam terkait rasionalitas desain riset, teknik sampling, atau instrumen]
  - *Arah Jawaban / Pembelaan Ilmiah:* [Poin kunci yang harus disampaikan mahasiswa berbasis kaidah ilmiah]

## 2. Pertanyaan Teori & State-of-the-Art
- **Pertanyaan Penguji:** [Pertanyaan menguji penguasaan teori primer serta kebaruan penelitian dibanding literatur terdahulu]
  - *Arah Jawaban / Pembelaan Ilmiah:* [Argumen sintesis pustaka]

## 3. Pertanyaan Keterbatasan & Ancaman Validitas
- **Pertanyaan Penguji:** [Pertanyaan kritis mengenai ancaman validitas internal/eksternal dan bias]
  - *Arah Jawaban / Pembelaan Ilmiah:* [Sikap rendah hati namun solutif dan akademis]

## 4. Tabel Flashcards Istilah & Variabel (Quick Recall)
| Variabel / Konsep Kunci | Definisi Operasional & Landasan Teori |
| :--- | :--- |
| [Variabel X / Konsep 1] | [Definisi ringkas dan tajam] |
| [Variabel Y / Konsep 2] | [Definisi ringkas dan tajam] |
:::

Topik / Draf Naskah Skripsi:`
  }
];

interface AcademicToolsBarProps {
  onSelectTemplate: (template: AcademicTaskTemplate, customInput?: string) => void;
  activeTemplateId?: string | null;
  compact?: boolean;
  onOpenLiteratureMatrix?: () => void;
  onOpenMockDefense?: () => void;
  onOpenSupervisorNotes?: () => void;
  onOpenThesisBinder?: () => void;
  onOpenCitationAudit?: () => void;
  onOpenDataStudioChart?: () => void;
  onOpenTurnitinAudit?: () => void;
  onOpenKnowledgeGraph?: () => void;
  onOpenCouncilDebate?: () => void;
}

export const AcademicToolsBar: React.FC<AcademicToolsBarProps> = ({
  onSelectTemplate,
  activeTemplateId,
  compact = false,
  onOpenLiteratureMatrix,
  onOpenMockDefense,
  onOpenSupervisorNotes,
  onOpenThesisBinder,
  onOpenCitationAudit,
  onOpenDataStudioChart,
  onOpenTurnitinAudit,
  onOpenKnowledgeGraph,
  onOpenCouncilDebate
}) => {
  const [selectedForModal, setSelectedForModal] = useState<AcademicTaskTemplate | null>(null);
  const [inputSnippet, setInputSnippet] = useState('');

  const renderIcon = (iconName: string, className = "w-3.5 h-3.5") => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen className={className} />;
      case 'Quote': return <Quote className={className} />;
      case 'Code2': return <Code2 className={className} />;
      case 'FileText': return <FileText className={className} />;
      case 'Table': return <Table className={className} />;
      case 'Pencil': return <Pencil className={className} />;
      default: return <Sparkles className={className} />;
    }
  };

  const handleOpenPrompt = (tpl: AcademicTaskTemplate) => {
    setSelectedForModal(tpl);
    setInputSnippet('');
  };

  const handleApply = () => {
    if (!selectedForModal) return;
    onSelectTemplate(selectedForModal, inputSnippet.trim());
    setSelectedForModal(null);
    setInputSnippet('');
  };

  return (
    <>
      <div className={`w-full ${compact ? 'py-1' : 'py-2'}`}>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 select-none pr-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Template:</span>
          </div>

          {onOpenLiteratureMatrix && (
            <button
              type="button"
              onClick={onOpenLiteratureMatrix}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer select-none border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-2xs"
              title="Buka Matriks Literatur Interaktif (Multi-PDF)"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Matriks Literatur (Bab 2)</span>
            </button>
          )}

          {onOpenMockDefense && (
            <button
              type="button"
              onClick={onOpenMockDefense}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer select-none border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 shadow-2xs"
              title="Simulasi Ujian Sidang Skripsi & Sempro (AI Mock Defense)"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Simulasi Sidang (AI)</span>
            </button>
          )}

          {onOpenSupervisorNotes && (
            <button
              type="button"
              onClick={onOpenSupervisorNotes}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer select-none border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/60 shadow-2xs"
              title="Ubah Catatan Bimbingan Dosen menjadi Action Plan"
            >
              <FileText className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              <span>Notulensi Bimbingan</span>
            </button>
          )}

          {onOpenThesisBinder && (
            <button
              type="button"
              onClick={onOpenThesisBinder}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer select-none border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 shadow-2xs"
              title="Gabungkan Bab 1-5 menjadi naskah skripsi lengkap (.docx)"
            >
              <Table className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Binder Skripsi</span>
            </button>
          )}

          {onOpenCitationAudit && (
            <button
              type="button"
              onClick={onOpenCitationAudit}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer select-none border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 shadow-2xs"
              title="Audit Konsistensi Sitasi dan Bersihkan Ghost References"
            >
              <Quote className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Audit Sitasi</span>
            </button>
          )}

          {onOpenDataStudioChart && (
            <button
              type="button"
              onClick={onOpenDataStudioChart}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer select-none border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-2xs"
              title="Data Studio & Visualisasi Grafik Skripsi (Bab 4)"
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Data Studio (Grafik)</span>
            </button>
          )}

          {onOpenTurnitinAudit && (
            <button
              type="button"
              onClick={onOpenTurnitinAudit}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer select-none border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 shadow-2xs"
              title="Audit Kesiapan Turnitin & Parafrase Akademik Standar Dikti"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Audit Turnitin</span>
            </button>
          )}

          {onOpenKnowledgeGraph && (
            <button
              type="button"
              onClick={onOpenKnowledgeGraph}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer select-none border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 shadow-2xs"
              title="Visualisasi Jejaring Konsep & Teori Skripsi (GraphRAG)"
            >
              <Share2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Jejaring Konsep (GraphRAG)</span>
            </button>
          )}

          {onOpenCouncilDebate && (
            <button
              type="button"
              onClick={onOpenCouncilDebate}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer select-none border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 shadow-2xs"
              title="Debat Multi-Agen Dewan Penguji AI (Pembimbing & Penguji)"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Debat Dewan AI</span>
            </button>
          )}

          {ACADEMIC_TEMPLATES.map((tpl) => {
            const isActive = activeTemplateId === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleOpenPrompt(tpl)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer select-none ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-100/80 dark:bg-slate-800/80 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300'
                }`}
                title={tpl.description}
              >
                <span className={isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}>
                  {renderIcon(tpl.icon, "w-3.5 h-3.5")}
                </span>
                <span>{tpl.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedForModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedForModal(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
                  {renderIcon(selectedForModal.icon, "w-4 h-4")}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                    {selectedForModal.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    {selectedForModal.description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                Masukkan Teks, Judul Paper, atau Catatan:
              </label>
              <textarea
                value={inputSnippet}
                onChange={e => setInputSnippet(e.target.value)}
                placeholder="Tempelkan abstrak paper, DOI, kode yang error, atau topik risetmu di sini..."
                rows={5}
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 resize-none font-sans"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500">
                Target Output: <span className="font-semibold text-emerald-700 dark:text-emerald-300 uppercase">{selectedForModal.targetArtifact}</span> Canvas
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedForModal(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <span>Eksekusi</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
