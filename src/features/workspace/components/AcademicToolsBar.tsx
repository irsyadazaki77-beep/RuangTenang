import React, { useState } from 'react';
import { 
  BookOpen, 
  Quote, 
  Code2, 
  FileText, 
  Sparkles, 
  Pencil, 
  ChevronRight,
  Lightbulb,
  X
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
    id: 'parafrase-akademik',
    title: 'Parafrase Akademik',
    description: 'Tulis ulang kalimat atau draf agar bernada ilmiah, baku (KBBI), dan lolos uji orisinalitas.',
    icon: 'Pencil',
    targetArtifact: 'DOCUMENT',
    prompt: `Parafrase teks berikut agar memiliki gaya bahasa ilmiah yang baku, formal, kohesif, dan terhindar dari indikasi kemiripan teks/plagiarisme, tanpa mengubah substansi maknanya. Berikan beberapa alternatif redaksi:
<artifact type="document" title="Hasil Parafrase Akademik">
...konten hasil parafrase...
</artifact>

Teks Asli:`
  }
];

interface AcademicToolsBarProps {
  onSelectTemplate: (template: AcademicTaskTemplate, customInput?: string) => void;
  activeTemplateId?: string | null;
  compact?: boolean;
}

export const AcademicToolsBar: React.FC<AcademicToolsBarProps> = ({
  onSelectTemplate,
  activeTemplateId,
  compact = false
}) => {
  const [selectedForModal, setSelectedForModal] = useState<AcademicTaskTemplate | null>(null);
  const [inputSnippet, setInputSnippet] = useState('');

  const renderIcon = (iconName: string, className = "w-4 h-4") => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen className={className} />;
      case 'Quote': return <Quote className={className} />;
      case 'Code2': return <Code2 className={className} />;
      case 'FileText': return <FileText className={className} />;
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
      <div className={`w-full ${compact ? 'py-1.5' : 'py-2.5'}`}>
        {/* Chips row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shrink-0 select-none pl-1 pr-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Template Akademik:</span>
          </div>

          {ACADEMIC_TEMPLATES.map((tpl) => {
            const isActive = activeTemplateId === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleOpenPrompt(tpl)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer border select-none ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                    : 'bg-white/80 dark:bg-slate-850 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-750 hover:border-emerald-300 dark:hover:border-emerald-800 shadow-2xs'
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

      {/* Modal Quick Input Dialog */}
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
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
                  {renderIcon(selectedForModal.icon, "w-5 h-5")}
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

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                Masukkan Materi, Teks, Judul Paper, atau Cuplikan Kode:
              </label>
              <textarea
                value={inputSnippet}
                onChange={e => setInputSnippet(e.target.value)}
                placeholder="Tempelkan abstrak paper, DOI, kode yang error, atau topik risetmu di sini..."
                rows={5}
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all placeholder:text-slate-400 resize-none font-sans"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                Target Output: <span className="font-semibold text-emerald-700 dark:text-emerald-300 uppercase">{selectedForModal.targetArtifact}</span> Canvas
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedForModal(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <span>Mulai Eksekusi</span>
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
