import React from 'react';
import { BookOpen, Code2, FileText, FlaskConical } from 'lucide-react';
import { WorkspaceArtifact, StarterTaskItem, AcademicPromptPill } from '../types';

export const DEFAULT_WELCOME_ARTIFACT_ID = 'art_welcome';

export const DEFAULT_WELCOME_ARTIFACT: WorkspaceArtifact = {
  id: DEFAULT_WELCOME_ARTIFACT_ID,
  title: 'Panduan Asisten RuangKerja',
  type: 'DOCUMENT',
  content: `# Selamat Datang di RuangKerja Mahasiswa 🎓
*Selesaikan Tugas Akademik & Riset Secara Terstruktur Tanpa Cemas*

> **Filosofi RuangKerja**: *"Ketika lelah dan cemas, ada RuangTenang untuk pulih. Ketika siap kembali berjuang, ada RuangKerja untuk menuntaskan draf skripsi, resume paper, dan debugging kode secara tenang, teratur, dan efisien."*

---

### 🚀 Cara Kerja RuangKerja:
1. **Live Artifact Canvas (Panel Kanan)**: Setiap draf dokumen, resume jurnal, format sitasi, atau kode program otomatis muncul di panel kanvas ini. Anda dapat mengedit, menyalin, merevisi bersama AI, serta mengekspornya langsung ke Word (.docx skripsi standar 4-4-3-3), PDF, Markdown, atau BibTeX.
2. **Template Akademik Terstruktur**:
   - 📑 **Bedah Paper & Jurnal**: Ekstrak latar belakang masalah, metodologi riset, temuan kunci, dan celah penelitian.
   - 🖋️ **Format Sitasi Ilmiah**: Susun daftar pustaka otomatis berstandar APA 7th, IEEE, atau Harvard lengkap dengan berkas .bib / .ris untuk Zotero & Mendeley.
   - 💻 **Debug & Optimasi Kode**: Temukan letak bug, jelaskan alur logika, dan optimasi efisiensi fungsi secara aman.
   - 📐 **Struktur Skripsi / Proposal**: Bimbingan merancang bab pendahuluan, rumusan masalah piramida terbalik, dan literatur.
3. **Revisi Cepat**: Minta AI memperhalus tulisan dengan nada baku KBBI atau mengoptimasi algoritma Big-O langsung menggunakan menu aksi di atas dokumen.

*Pilihlah salah satu kartu aksi di layar obrolan atau ketik langsung tugas akademik Anda di kolom composer.*`,
  version: 1,
  updatedAt: new Date().toISOString()
};

export function createWelcomeMessage(userName?: string) {
  const displayName = userName ? userName.split(' ')[0] : 'Rekan Mahasiswa';
  return {
    id: 'msg_welcome',
    role: 'assistant' as const,
    content: `Halo ${displayName}! 👋 Saya asisten akademik RuangKerja.

Ada tugas kuliah, draf skripsi, resume jurnal, atau kode yang butuh di-review dan dioptimasi hari ini? Ketik langsung tugas Anda atau pilih instruksi di bawah.`,
    createdAt: new Date()
  };
}

export const STARTER_TASKS: StarterTaskItem[] = [
  {
    id: 'analisis-dokumen',
    title: 'Analisis dokumen',
    subtitle: 'Ringkas tujuan, temuan, bukti, dan pertanyaan',
    icon: <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
    primary: true,
    prompt: 'Bantu saya menganalisis dokumen yang saya lampirkan. Rangkum tujuan, temuan utama, bukti pendukung, dan pertanyaan yang masih terbuka.'
  },
  {
    id: 'tulis-dokumen',
    title: 'Tulis dokumen',
    subtitle: 'Mulai dari tujuan, pembaca, dan bahan yang ada',
    icon: <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
    primary: false,
    prompt: 'Bantu saya menulis dokumen. Tanyakan tujuan, pembaca, dan bahan yang sudah tersedia sebelum menyusun draf.'
  },
  {
    id: 'review-kode',
    title: 'Review kode',
    subtitle: 'Cari bug, risiko keamanan, dan perbaikan penting',
    icon: <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
    primary: false,
    prompt: 'Tinjau kode yang saya berikan. Cari bug, risiko keamanan, dan perbaikan paling penting dengan penjelasan singkat.'
  },
  {
    id: 'riset-topik',
    title: 'Riset topik',
    subtitle: 'Susun pertanyaan, kata kunci, dan sumber yang perlu dicek',
    icon: <FlaskConical className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
    primary: false,
    prompt: 'Bantu saya meneliti topik ini. Susun pertanyaan riset, kata kunci pencarian, sumber yang relevan, dan hal yang perlu diverifikasi.'
  }
];

export const ACADEMIC_PROMPT_PILLS: AcademicPromptPill[] = [
  {
    label: "Bab 1: 4 Pilar Latar Belakang",
    prompt: "Tolong susunkan draf Latar Belakang Masalah (Bab 1) berbobot ilmiah tinggi untuk topik penelitian saya menggunakan 4 pilar argumen (Das Sollen, Das Sein, Research Gap, Urgensi & Solusi):\n\n[Tuliskan topik atau rancangan judul skripsi Anda di sini]"
  },
  {
    label: "Struktur Bab 2 Tinjauan Pustaka",
    prompt: "Bantu saya menyusun kerangka dan struktur Bab 2 (Tinjauan Pustaka / Landasan Teori) secara sistematis untuk topik penelitian saya:\n\n[Tuliskan topik atau judul skripsi Anda di sini]"
  },
  {
    label: "Parafrase Akademik PUEBI",
    prompt: "Tolong parafrase paragraf berikut dengan gaya penulisan ilmiah formal, sesuai kaidah PUEBI dan KBBI, serta pertahankan makna aslinya. Hasil tidak menjamin lolos pemeriksaan similarity atau plagiarisme:\n\n[Tempelkan draf teks di sini]"
  },
  {
    label: "Bedah Metodologi Jurnal",
    prompt: "Bantu saya membedah dan meringkas jurnal/paper ilmiah ini: ekstrak latar belakang masalah, urgensi riset, metodologi & instrumen analisis, temuan kunci, serta celah/keterbatasan penelitian:\n\n[Tempelkan abstrak atau isi jurnal di sini]"
  },
  {
    label: "Format Sitasi APA 7th / IEEE",
    prompt: "Bantu saya menyusun daftar pustaka dan format sitasi ilmiah (dalam standar APA 7th Edition dan IEEE) dari referensi berikut:\n\n[Tuliskan judul artikel, penulis, tahun rilis, nama jurnal/penerbit, dan DOI/URL]"
  }
];
