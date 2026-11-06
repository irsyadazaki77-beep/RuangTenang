import React from 'react';
import {
  Command,
  AtSign,
  Compass,
  Workflow,
  BarChart3,
  FileSpreadsheet,
  Quote,
  Sparkles,
  GraduationCap,
  Wind,
  FileText,
  FolderKanban,
  Layers,
  BookOpen,
  X,
  LucideIcon
} from 'lucide-react';

export interface AcademicSlashCommandItem {
  cmd: string;
  label: string;
  desc: string;
  category: 'riset' | 'visual' | 'naskah' | 'regulasi';
  icon: LucideIcon;
  actionType: 'deep_research' | 'prompt_template' | 'breathing';
  templatePrompt?: string;
  promptTemplate?: string;
  enableWebSearch?: boolean;
  enableDeepThinking?: boolean;
}

export type SlashCommandItem = AcademicSlashCommandItem;

export interface ContextMentionCandidate {
  id: string;
  tag: string;
  label: string;
  subtitle: string;
  kind?: 'document' | 'artifact' | 'project' | 'chapter';
  category?: 'document' | 'artifact' | 'project' | 'chapter';
  contextPayload?: string;
  contextPrompt?: string;
}

export type ContextMentionItem = ContextMentionCandidate;

export const ACADEMIC_SLASH_COMMANDS: AcademicSlashCommandItem[] = [
  {
    cmd: '/riset',
    label: 'Agen Deep Research Skripsi',
    desc: 'Sintesis literatur multi-tahap + matriks jurnal + diagram alir + sitasi APA 7th ke Canvas',
    category: 'riset',
    icon: Compass,
    actionType: 'deep_research',
    templatePrompt: '/riset ',
    promptTemplate: '/riset ',
    enableWebSearch: true,
    enableDeepThinking: true
  },
  {
    cmd: '/diagram',
    label: 'Diagram Alir & Kerangka Konsep',
    desc: 'Buat bagan metodologi penelitian, PRISMA flow, atau kerangka berpikir (Mermaid Live)',
    category: 'visual',
    icon: Workflow,
    actionType: 'prompt_template',
    templatePrompt:
      'Susun bagan alur metodologi penelitian dan kerangka konseptual lengkap dalam blok kode ```mermaid (flowchart TD) beserta penjelasan akademik tiap tahap untuk topik: ',
    promptTemplate:
      'Susun bagan alur metodologi penelitian dan kerangka konseptual lengkap dalam blok kode ```mermaid (flowchart TD) beserta penjelasan akademik tiap tahap untuk topik: '
  },
  {
    cmd: '/grafik',
    label: 'Visualisasi Grafik & Tabel Data',
    desc: 'Susun tabel data kuantitatif & perbandingan metrik agar dirender menjadi grafik interaktif',
    category: 'visual',
    icon: BarChart3,
    actionType: 'prompt_template',
    templatePrompt:
      'Susun tabel perbandingan data kuantitatif dalam format Tabel Markdown (minimal 4 baris dan 2 kolom angka metrik) beserta analisis statistik deskriptif untuk: ',
    promptTemplate:
      'Susun tabel perbandingan data kuantitatif dalam format Tabel Markdown (minimal 4 baris dan 2 kolom angka metrik) beserta analisis statistik deskriptif untuk: '
  },
  {
    cmd: '/ringkas',
    label: 'Intisari Eksekutif & Matriks Jurnal',
    desc: 'Ekstrak Latar Belakang, Metodologi, Temuan Kunci, dan Celah Riset (Research Gap)',
    category: 'riset',
    icon: FileSpreadsheet,
    actionType: 'prompt_template',
    templatePrompt:
      'Ringkas secara sistematis menjadi (1) Intisari Eksekutif, (2) Tabel Matriks Sintesis Literatur (Penulis, Metodologi, Temuan Kunci, Celah Riset), dan (3) Implikasi untuk Skripsi dari materi berikut: ',
    promptTemplate:
      'Ringkas secara sistematis menjadi (1) Intisari Eksekutif, (2) Tabel Matriks Sintesis Literatur (Penulis, Metodologi, Temuan Kunci, Celah Riset), dan (3) Implikasi untuk Skripsi dari materi berikut: '
  },
  {
    cmd: '/sitasi',
    label: 'Format Sitasi APA 7th & BibTeX',
    desc: 'Rapikan kutipan dalam teks dan susun Daftar Pustaka standar APA 7th + entri .bib',
    category: 'naskah',
    icon: Quote,
    actionType: 'prompt_template',
    templatePrompt:
      'Ekstrak seluruh klaim dan sumber rujukan, lalu susun bagian ## DAFTAR PUSTAKA dalam format APA 7th yang baku beserta blok BibTeX (@article) untuk topik/teks berikut: ',
    promptTemplate:
      'Ekstrak seluruh klaim dan sumber rujukan, lalu susun bagian ## DAFTAR PUSTAKA dalam format APA 7th yang baku beserta blok BibTeX (@article) untuk topik/teks berikut: ',
    enableWebSearch: true
  },
  {
    cmd: '/revisi',
    label: 'Revisi Bahasa Ilmiah Baku (PUEBI)',
    desc: 'Perbaiki kohesi paragraf, struktur SPOK, dan nada akademik setara jurnal terakreditasi',
    category: 'naskah',
    icon: Sparkles,
    actionType: 'prompt_template',
    templatePrompt:
      'Revisi dan pertajam draf berikut agar menggunakan bahasa Indonesia ilmiah baku (PUEBI), transisi antarparagraf yang kohesif, serta argumen yang objektif dan terstruktur:\n\n',
    promptTemplate:
      'Revisi dan pertajam draf berikut agar menggunakan bahasa Indonesia ilmiah baku (PUEBI), transisi antarparagraf yang kohesif, serta argumen yang objektif dan terstruktur:\n\n'
  },
  {
    cmd: '/kuis',
    label: 'Simulasi Pertanyaan Penguji Sidang',
    desc: 'Latih kesiapan sidang skripsi dengan daftar pertanyaan kritis penguji & panduan jawaban',
    category: 'naskah',
    icon: GraduationCap,
    actionType: 'prompt_template',
    templatePrompt:
      'Bertindaklah sebagai dewan penguji sidang skripsi. Susun 5 pertanyaan penguji paling kritis (mencakup urgensi masalah, kebaruan/novelty, validitas metodologi, dan temuan) beserta panduan jawaban ilmiah yang kuat untuk: ',
    promptTemplate:
      'Bertindaklah sebagai dewan penguji sidang skripsi. Susun 5 pertanyaan penguji paling kritis (mencakup urgensi masalah, kebaruan/novelty, validitas metodologi, dan temuan) beserta panduan jawaban ilmiah yang kuat untuk: '
  },
  {
    cmd: '/sidang',
    label: 'Simulasi Sidang & Pertanyaan Dewan Penguji',
    desc: 'Susun simulasi tanya jawab Ketua Sidang, Penguji Metodologi & Substansi beserta rubrik',
    category: 'naskah',
    icon: GraduationCap,
    actionType: 'prompt_template',
    templatePrompt:
      'Bertindaklah sebagai Dewan Penguji Sidang Skripsi (Ketua Sidang, Penguji Metodologi, dan Penguji Substansi). Susun simulasi pertanyaan kritis beserta jawaban model bernilai A dan evaluasi rubrik untuk topik/naskah: ',
    promptTemplate:
      'Bertindaklah sebagai Dewan Penguji Sidang Skripsi (Ketua Sidang, Penguji Metodologi, dan Penguji Substansi). Susun simulasi pertanyaan kritis beserta jawaban model bernilai A dan evaluasi rubrik untuk topik/naskah: '
  },
  {
    cmd: '/audit',
    label: 'Audit Orisinalitas, Klaim & Kohesi PUEBI',
    desc: 'Periksa klaim tanpa sitasi APA 7th, kohesi paragraf PUEBI, dan saran perbaikan kalimat',
    category: 'naskah',
    icon: Sparkles,
    actionType: 'prompt_template',
    templatePrompt:
      'Lakukan audit mendalam terhadap klaim ilmiah yang belum memiliki sitasi APA 7th, evaluasi kohesi antarkalimat sesuai PUEBI, dan berikan tabel perbaikan kalimat langsung untuk draf berikut:\n\n',
    promptTemplate:
      'Lakukan audit mendalam terhadap klaim ilmiah yang belum memiliki sitasi APA 7th, evaluasi kohesi antarkalimat sesuai PUEBI, dan berikan tabel perbaikan kalimat langsung untuk draf berikut:\n\n'
  },
  {
    cmd: '/tenang',
    label: 'Jeda Regulasi & Reset Fokus (2 Menit)',
    desc: 'Buka panduan pernapasan mikro 4-7-8 saat merasa jenuh atau mengalami writer’s block',
    category: 'regulasi',
    icon: Wind,
    actionType: 'breathing',
    templatePrompt: '',
    promptTemplate: ''
  }
];

export const DEFAULT_CHAPTER_MENTIONS: ContextMentionCandidate[] = [
  {
    id: 'chapter-bab1',
    tag: '@bab1-pendahuluan',
    label: 'Bab I · Pendahuluan & Rumusan Masalah',
    subtitle: 'Latar belakang, identifikasi masalah, tujuan, dan manfaat penelitian',
    kind: 'chapter',
    category: 'chapter',
    contextPayload:
      'Fokuskan penulisan pada standar Bab I Skripsi: Latar Belakang Masalah (fenomena & data empiris), Identifikasi Masalah, Batasan Masalah, Rumusan Masalah, Tujuan Penelitian, dan Manfaat Penelitian.',
    contextPrompt:
      '[KONTEKS BAB I @bab1-pendahuluan: Fokuskan penulisan pada standar Bab I Skripsi: Latar Belakang Masalah (fenomena & data empiris), Identifikasi Masalah, Batasan Masalah, Rumusan Masalah, Tujuan Penelitian, dan Manfaat Penelitian.]'
  },
  {
    id: 'chapter-bab2',
    tag: '@bab2-tinjauan-pustaka',
    label: 'Bab II · Landasan Teori & Penelitian Terdahulu',
    subtitle: 'Grand theory, matriks jurnal terdahulu, kerangka berpikir, dan hipotesis',
    kind: 'chapter',
    category: 'chapter',
    contextPayload:
      'Fokuskan penulisan pada standar Bab II Skripsi: Kajian Teoretis variabel penelitian, Matriks Penelitian Terdahulu (5 tahun terakhir), Kerangka Berpikir (disertai diagram alir), dan Perumusan Hipotesis.',
    contextPrompt:
      '[KONTEKS BAB II @bab2-tinjauan-pustaka: Fokuskan penulisan pada standar Bab II Skripsi: Kajian Teoretis variabel penelitian, Matriks Penelitian Terdahulu (5 tahun terakhir), Kerangka Berpikir (disertai diagram alir), dan Perumusan Hipotesis.]'
  },
  {
    id: 'chapter-bab3',
    tag: '@bab3-metodologi',
    label: 'Bab III · Metodologi Penelitian',
    subtitle: 'Desain riset, populasi & sampel, definisi operasional variabel, teknik analisis data',
    kind: 'chapter',
    category: 'chapter',
    contextPayload:
      'Fokuskan penulisan pada standar Bab III Skripsi: Jenis & Desain Penelitian, Populasi dan Teknik Sampling, Definisi Operasional Variabel & Indikator Instrumen, Uji Validitas-Reliabilitas, serta Teknik Analisis Data.',
    contextPrompt:
      '[KONTEKS BAB III @bab3-metodologi: Fokuskan penulisan pada standar Bab III Skripsi: Jenis & Desain Penelitian, Populasi dan Teknik Sampling, Definisi Operasional Variabel & Indikator Instrumen, Uji Validitas-Reliabilitas, serta Teknik Analisis Data.]'
  },
  {
    id: 'chapter-bab4',
    tag: '@bab4-pembahasan',
    label: 'Bab IV · Hasil Penelitian & Pembahasan',
    subtitle: 'Deskripsi data, pengujian hipotesis, dan komparasi temuan dengan jurnal terdahulu',
    kind: 'chapter',
    category: 'chapter',
    contextPayload:
      'Fokuskan penulisan pada standar Bab IV Skripsi: Statistik Deskriptif Responden, Hasil Uji Prasyarat & Hipotesis, serta Pembahasan Mendalam yang membandingkan temuan empiris dengan teori dan penelitian terdahulu.',
    contextPrompt:
      '[KONTEKS BAB IV @bab4-pembahasan: Fokuskan penulisan pada standar Bab IV Skripsi: Statistik Deskriptif Responden, Hasil Uji Prasyarat & Hipotesis, serta Pembahasan Mendalam yang membandingkan temuan empiris dengan teori dan penelitian terdahulu.]'
  }
];

export function detectActiveMentionQuery(
  text: string,
  cursorPosition?: number
): { active: boolean; query: string; startIndex: number } | null {
  const sliceEnd = typeof cursorPosition === 'number' ? cursorPosition : text.length;
  const textUpToCursor = text.slice(0, sliceEnd);
  const match = /(?:^|\s)@([a-zA-Z0-9_:-]*)$/.exec(textUpToCursor);
  if (!match) return null;
  const query = match[1] || '';
  const startIndex = textUpToCursor.lastIndexOf(`@${query}`);
  return { active: true, query, startIndex };
}

export interface SlashCommandPopoverProps {
  isOpen: boolean;
  commands?: AcademicSlashCommandItem[];
  query?: string;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onExecute?: (cmd: AcademicSlashCommandItem) => void;
  onSelectCommand?: (cmd: AcademicSlashCommandItem) => void;
  accent?: 'indigo' | 'teal';
}

export const SlashCommandPopover: React.FC<SlashCommandPopoverProps> = ({
  isOpen,
  commands,
  query = '',
  selectedIndex,
  onSelectIndex,
  onExecute,
  onSelectCommand,
  accent = 'indigo'
}) => {
  const resolvedCommands = React.useMemo(() => {
    if (commands && commands.length > 0) return commands;
    const q = query.trim().toLowerCase();
    if (!q) return ACADEMIC_SLASH_COMMANDS;
    return ACADEMIC_SLASH_COMMANDS.filter(
      c =>
        c.cmd.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q.replace(/^\//, '')) ||
        c.desc.toLowerCase().includes(q.replace(/^\//, ''))
    );
  }, [commands, query]);

  const handleSelect = onSelectCommand || onExecute;

  if (!isOpen || resolvedCommands.length === 0 || !handleSelect) return null;

  const isIndigo = accent === 'indigo';

  return (
    <div
      role="listbox"
      aria-label="Pintasan Perintah Akademik (/)"
      className="absolute bottom-full left-0 right-0 sm:right-auto sm:w-[26rem] mb-2 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-[#FAF8F5] dark:bg-[#161922] shadow-xl overflow-hidden z-40 p-1.5 text-left"
    >
      <div className="px-2.5 py-1.5 mb-1 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
          <Command className={`w-3.5 h-3.5 ${isIndigo ? 'text-indigo-600 dark:text-indigo-400' : 'text-teal-600 dark:text-teal-400'}`} />
          <span>Alur Kerja Cepat Skripsi & Riset</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400 tabular-nums">↑↓ · Enter</span>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-0.5 custom-scrollbar">
        {resolvedCommands.map((item, idx) => {
          const Icon = item.icon;
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={item.cmd}
              type="button"
              role="option"
              aria-selected={isSelected}
              onMouseEnter={() => onSelectIndex(idx)}
              onClick={() => handleSelect(item)}
              className={`w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-start gap-2.5 cursor-pointer text-xs ${
                isSelected
                  ? isIndigo
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-100'
                    : 'bg-teal-50/90 dark:bg-teal-950/60 text-teal-950 dark:text-teal-100'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                  isSelected
                    ? isIndigo
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-xs">{item.cmd}</span>
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
                    {item.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {item.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export interface ContextMentionPopoverProps {
  isOpen: boolean;
  candidates?: ContextMentionCandidate[];
  items?: ContextMentionCandidate[];
  query?: string;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onSelectCandidate?: (candidate: ContextMentionCandidate) => void;
  onSelectMention?: (candidate: ContextMentionCandidate) => void;
  accent?: 'indigo' | 'teal';
}

export const ContextMentionPopover: React.FC<ContextMentionPopoverProps> = ({
  isOpen,
  candidates,
  items,
  query = '',
  selectedIndex,
  onSelectIndex,
  onSelectCandidate,
  onSelectMention,
  accent = 'indigo'
}) => {
  const resolvedCandidates = React.useMemo(() => {
    const base = candidates || items || [];
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      item =>
        item.tag.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
    );
  }, [candidates, items, query]);

  const handleSelect = onSelectMention || onSelectCandidate;

  if (!isOpen || resolvedCandidates.length === 0 || !handleSelect) return null;

  const isIndigo = accent === 'indigo';

  const getKindIcon = (kind?: ContextMentionCandidate['kind']) => {
    switch (kind) {
      case 'document':
        return <FileText className="w-3.5 h-3.5" />;
      case 'artifact':
        return <Layers className="w-3.5 h-3.5" />;
      case 'project':
        return <FolderKanban className="w-3.5 h-3.5" />;
      case 'chapter':
      default:
        return <BookOpen className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      role="listbox"
      aria-label="Tautkan Konteks (@)"
      className="absolute bottom-full left-0 right-0 sm:right-auto sm:w-[25rem] mb-2 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-[#FAF8F5] dark:bg-[#161922] shadow-xl overflow-hidden z-40 p-1.5 text-left"
    >
      <div className="px-2.5 py-1.5 mb-1 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
          <AtSign className={`w-3.5 h-3.5 ${isIndigo ? 'text-indigo-600 dark:text-indigo-400' : 'text-teal-600 dark:text-teal-400'}`} />
          <span>Tautkan Konteks Dokumen, Artefak, atau Bab (@)</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400 tabular-nums">↑↓ · Enter</span>
      </div>

      <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
        {resolvedCandidates.map((cand, idx) => {
          const isSelected = idx === selectedIndex;
          const kind = cand.kind || cand.category || 'chapter';
          return (
            <button
              key={cand.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onMouseEnter={() => onSelectIndex(idx)}
              onClick={() => handleSelect(cand)}
              className={`w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-start gap-2.5 cursor-pointer text-xs ${
                isSelected
                  ? isIndigo
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-100'
                    : 'bg-teal-50/90 dark:bg-teal-950/60 text-teal-950 dark:text-teal-100'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                  isSelected
                    ? isIndigo
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                }`}
              >
                {getKindIcon(kind)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-xs truncate">{cand.tag}</span>
                  <span className="text-[10.5px] font-mono text-slate-400 uppercase">{kind}</span>
                </div>
                <div className="text-[11.5px] font-medium text-slate-800 dark:text-slate-200 truncate">
                  {cand.label}
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                  {cand.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export interface AttachedMentionsBarProps {
  mentions: ContextMentionCandidate[];
  onRemoveMention?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export const AttachedMentionsBar: React.FC<AttachedMentionsBarProps> = ({
  mentions,
  onRemoveMention,
  onRemove
}) => {
  const handleRemove = onRemove || onRemoveMention;
  if (mentions.length === 0 || !handleRemove) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-1.5 px-1">
      <span className="text-[10.5px] font-mono text-slate-400 dark:text-slate-500">Konteks @:</span>
      {mentions.map(item => (
        <span
          key={item.id}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 px-2 py-0.5 text-[11px] font-mono text-slate-700 dark:text-slate-200"
        >
          <span className="truncate max-w-[170px]">{item.tag}</span>
          <button
            type="button"
            onClick={() => handleRemove(item.id)}
            className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
            aria-label={`Hapus konteks ${item.tag}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
};
