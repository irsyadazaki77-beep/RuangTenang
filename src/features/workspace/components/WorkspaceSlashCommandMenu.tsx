import React, { useEffect, useRef } from 'react';

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  emoji: string;
  /** Template prompt yang disisipkan ke composer. Kosong = aksi khusus (mis. buka modal gambar). */
  template: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'tandem', label: '/tandem', emoji: '⚡', description: 'Tandem Co-Op (Si Pinter Draf Cepat + Si Gacor Audit Arsitektur)', template: 'Jalankan mode Tandem Co-Op (Si Pinter draf awal + Si Gacor verifikasi mendalam) untuk: ' },
  { id: 'sidang', label: '/sidang', emoji: '🎓', description: 'Simulasi Ujian Sidang Skripsi & Sempro (AI Mock Defense)', template: '' },
  { id: 'bimbingan', label: '/bimbingan', emoji: '📋', description: 'Notulensi bimbingan dosen to Action Plan tugas', template: '' },
  { id: 'binder', label: '/binder', emoji: '📑', description: 'Binder skripsi & ekspor naskah lengkap (Bab 1-5)', template: '' },
  { id: 'auditsitasi', label: '/auditsitasi', emoji: '🔍', description: 'Audit konsistensi sitasi & bersihkan Ghost References', template: '' },
  { id: 'grafik', label: '/grafik', emoji: '📊', description: 'Data Studio: Visualisasi grafik Bab 4 & analisis statistik', template: '' },
  { id: 'turnitin', label: '/turnitin', emoji: '🛡️', description: 'Audit kesiapan Turnitin & parafrase akademik Dikti', template: '' },
  { id: 'matrix', label: '/matrix', emoji: '🔬', description: 'Matriks sintesis literatur komparatif (Bab 2)', template: 'Susun matriks sintesis komparatif untuk artikel/dokumen referensi berikut dengan kolom: Peneliti & Tahun, Fokus/Variabel, Metodologi, Temuan Kunci, Research Gap, dan Relevansi Skripsi: ' },
  { id: 'bab1', label: '/bab1', emoji: '📖', description: 'Draf Bab 1 Pendahuluan (Piramida terbalik, rumusan masalah)', template: 'Bantu susun draf Bab 1 Pendahuluan (Latar Belakang piramida terbalik, Rumusan Masalah, Batasan Masalah, Tujuan, dan Manfaat Penelitian) untuk topik: ' },
  { id: 'bab2', label: '/bab2', emoji: '📚', description: 'Draf Bab 2 Tinjauan Pustaka & Kajian Teori', template: 'Bantu susun draf Bab 2 Tinjauan Pustaka & Landasan Teori (Kajian Teori Utama, Penelitian Terdahulu, dan Kerangka Berpikir) untuk topik: ' },
  { id: 'bab3', label: '/bab3', emoji: '🔬', description: 'Draf Bab 3 Metodologi Penelitian', template: 'Bantu susun draf Bab 3 Metodologi Penelitian (Pendekatan, Populasi & Sampel, Instrumen, dan Teknik Analisis Data) untuk topik: ' },
  { id: 'bab4', label: '/bab4', emoji: '📈', description: 'Draf Bab 4 Hasil & Pembahasan', template: 'Bantu susun draf Bab 4 Hasil dan Pembahasan (Deskripsi Data, Analisis Temuan, dan Pembahasan kritis berdasar teori) untuk topik: ' },
  { id: 'bab5', label: '/bab5', emoji: '🎯', description: 'Draf Bab 5 Kesimpulan & Saran', template: 'Bantu susun draf Bab 5 Kesimpulan dan Saran (Jawaban rumusan masalah dan rekomendasi aplikatif/akademik) untuk: ' },
  { id: 'gambar', label: '/gambar', emoji: '🎨', description: 'Generate gambar / ilustrasi ilmiah AI', template: '' },
  { id: 'slide', label: '/slide', emoji: '📊', description: 'Susun draf slide presentasi PowerPoint', template: 'Ubah materi/dokumen aktif menjadi 6-10 slide presentasi akademik siap pakai (judul, poin singkat, dan speaker notes).' },
  { id: 'poster', label: '/poster', emoji: '📋', description: 'Format menjadi modul poster ilmiah', template: 'Susun materi/dokumen aktif ke dalam modul poster ilmiah konferensi (Latar Belakang, Metodologi, Hasil, Kesimpulan).' },
  { id: 'tabel', label: '/tabel', emoji: '📑', description: 'Sajikan data dalam tabel rapi', template: 'Sajikan data atau perbandingan berikut ke dalam tabel Markdown yang rapi dan terstruktur: ' },
  { id: 'sitasi', label: '/sitasi', emoji: '📚', description: 'Bantu rujukan & sitasi ilmiah', template: 'Bantu carikan rujukan ilmiah yang relevan beserta format sitasi APA 7 untuk topik: ' },
  { id: 'parafrase', label: '/parafrase', emoji: '✍️', description: 'Parafrase dengan gaya akademik formal', template: 'Parafrase teks berikut dengan gaya akademik formal tanpa mengubah makna inti: ' },
  { id: 'diagram', label: '/diagram', emoji: '🔀', description: 'Buat flowchart / diagram Mermaid', template: 'Buatkan diagram Mermaid (flowchart/diagram proses) yang jelas dan valid untuk: ' },
  { id: 'ringkas', label: '/ringkas', emoji: '🧾', description: 'Ringkasan eksekutif', template: 'Buat ringkasan eksekutif singkat yang mempertahankan tujuan, temuan, dan poin penting dari: ' },
  { id: 'export', label: '/export', emoji: '💾', description: 'Pusat ekspor (DOCX, PPTX, XLSX, PDF)', template: 'Bantu siapkan ringkasan artefak aktif agar siap diekspor ke format dokumen Word (.docx), Excel (.xlsx), atau Slide (.pptx).' }
];

/** Mengembalikan kata kunci slash jika teks adalah satu token yang diawali "/" (tanpa spasi). */
export function getSlashQuery(text: string): string | null {
  const match = /^\/([a-z0-9]*)$/i.exec(text);
  return match ? match[1].toLowerCase() : null;
}

export function filterSlashCommands(query: string): SlashCommand[] {
  return SLASH_COMMANDS.filter(command => command.id.startsWith(query) || command.description.toLowerCase().includes(query));
}

interface WorkspaceSlashCommandMenuProps {
  commands: SlashCommand[];
  activeIndex: number;
  onSelect: (command: SlashCommand) => void;
  onHover: (index: number) => void;
}

export const WorkspaceSlashCommandMenu: React.FC<WorkspaceSlashCommandMenuProps> = ({ commands, activeIndex, onSelect, onHover }) => {
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { activeRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [activeIndex]);
  if (!commands.length) return null;
  return (
    <div
      role="listbox"
      aria-label="Perintah cepat"
      className="absolute bottom-full left-0 right-0 z-30 mb-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95"
    >
      <p className="px-2.5 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Perintah cepat</p>
      {commands.map((command, index) => (
        <button
          key={command.id}
          ref={index === activeIndex ? activeRef : undefined}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          onMouseDown={event => event.preventDefault()}
          onMouseEnter={() => onHover(index)}
          onClick={() => onSelect(command)}
          className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${index === activeIndex ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'}`}
        >
          <span aria-hidden="true" className="text-base">{command.emoji}</span>
          <span className="font-semibold">{command.label}</span>
          <span className="truncate text-slate-500 dark:text-slate-400">{command.description}</span>
        </button>
      ))}
    </div>
  );
};
