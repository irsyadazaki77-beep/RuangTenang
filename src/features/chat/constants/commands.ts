import {
  Heart,
  BookOpen,
  Stethoscope,
  Users,
  AlertCircle,
  PlusCircle,
  Trash2,
  Download,
  Sparkles,
  Wind,
  HeartPulse,
  Compass,
  GitBranch,
  BarChart3,
  Quote,
  Wand2,
  GraduationCap,
  LucideIcon
} from 'lucide-react';

export interface ChatCommand {
  cmd: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  actionType: 'plugin' | 'system' | 'prompt';
  pluginId?: 'mood' | 'articles' | 'screening' | 'counselors' | 'emergency' | 'breathing' | 'grounding';
  promptTemplate?: string;
}

export interface ChatPluginOption {
  id: 'mood' | 'articles' | 'screening' | 'counselors' | 'emergency' | 'breathing' | 'grounding';
  icon: LucideIcon;
  label: string;
  desc: string;
  color: string;
}

export const CHAT_COMMANDS: ChatCommand[] = [
  { cmd: '/riset', label: 'Agen Deep Research', desc: 'Riset mendalam multi-tahap + laporan Bab I–IV & sitasi ke Canvas', icon: Compass, actionType: 'system' },
  {
    cmd: '/diagram',
    label: 'Diagram Alir / Kerangka',
    desc: 'Buat diagram alir metodologi, PRISMA, atau kerangka berpikir (Mermaid)',
    icon: GitBranch,
    actionType: 'prompt',
    promptTemplate: 'Buatkan diagram alir metodologi penelitian / kerangka berpikir dalam format kode ```mermaid lengkap beserta penjelasan akademiknya untuk: '
  },
  {
    cmd: '/grafik',
    label: 'Visualisasi Grafik Data',
    desc: 'Susun tabel data kuantitatif & visualisasi grafik interaktif di Canvas',
    icon: BarChart3,
    actionType: 'prompt',
    promptTemplate: 'Susun tabel data kuantitatif Markdown beserta analisis statistik deskriptif yang siap divisualisasikan menjadi grafik untuk: '
  },
  {
    cmd: '/ringkas',
    label: 'Matriks Sintesis Literatur',
    desc: 'Ekstrak temuan kunci, metodologi, & research gap ke tabel matriks',
    icon: BookOpen,
    actionType: 'prompt',
    promptTemplate: 'Buatkan Matriks Sintesis Literatur (Tabel Markdown: Penulis & Tahun, Metodologi, Temuan Kunci, Celah Riset/Limitasi, Relevansi Skripsi) untuk: '
  },
  {
    cmd: '/sitasi',
    label: 'Sitasi & Daftar Pustaka APA 7th',
    desc: 'Susun kutipan in-text & referensi standar APA 7th Edition',
    icon: Quote,
    actionType: 'prompt',
    promptTemplate: 'Susun kutipan kalimat akademik (in-text citation) beserta Daftar Pustaka berformat APA 7th Edition lengkap untuk topik: '
  },
  {
    cmd: '/revisi',
    label: 'Polemik & Parafase Akademik',
    desc: 'Perbaiki tata bahasa ilmiah (PUEBI) & kurangi risiko plagiarisme',
    icon: Wand2,
    actionType: 'prompt',
    promptTemplate: 'Lakukan parafase dan pemolesan gaya bahasa akademik Indonesia formal (PUEBI) agar bebas plagiarisme dan koheren pada teks berikut: '
  },
  {
    cmd: '/kuis',
    label: 'Simulasi Sidang Skripsi',
    desc: 'Uji kesiapan penguasaan materi dengan pertanyaan penguji',
    icon: GraduationCap,
    actionType: 'prompt',
    promptTemplate: 'Buatkan 5 pertanyaan kritis ala dosen penguji sidang skripsi beserta kunci jawaban metodologis berdasarkan bahasan kita: '
  },
  { cmd: '/tenang', label: 'Jeda Regulasi Burnout', desc: 'Latihan napas terpandu untuk meredakan kecemasan skripsi', icon: Wind, actionType: 'plugin', pluginId: 'breathing' },
  { cmd: '/grounding', label: 'Grounding 5-4-3-2-1', desc: 'Latihan indra saat merasa cemas; bukan bantuan darurat', icon: HeartPulse, actionType: 'plugin', pluginId: 'grounding' },
  { cmd: '/mood', label: 'Catat Suasana Hati', desc: 'Buka modal mood tracker & grafik emosi', icon: Heart, actionType: 'plugin', pluginId: 'mood' },
  { cmd: '/jeda', label: 'Jeda Hening 1-Menit', desc: 'Latihan relaksasi pernapasan terpandu', icon: Wind, actionType: 'plugin', pluginId: 'breathing' },
  { cmd: '/skrining', label: 'Skrining Mandiri', desc: 'Skrining gejala depresi dan kecemasan (PHQ-9 & GAD-7)', icon: Stethoscope, actionType: 'plugin', pluginId: 'screening' },
  { cmd: '/konselor', label: 'Cari Konselor Kampus', desc: 'Buka direktori & jadwalkan konseling', icon: Users, actionType: 'plugin', pluginId: 'counselors' },
  { cmd: '/clear', label: 'Bersihkan Percakapan', desc: 'Reset & bersihkan riwayat obrolan sesi saat ini', icon: Trash2, actionType: 'system' },
  { cmd: '/new', label: 'Chat Baru', desc: 'Mulai sesi percakapan segar', icon: PlusCircle, actionType: 'system' },
  { cmd: '/counselor', label: 'Direktori Konselor', desc: 'Jadwalkan pendampingan konselor', icon: Users, actionType: 'plugin', pluginId: 'counselors' },
  { cmd: '/emergency', label: 'Bantuan Darurat', desc: 'Healing119, bantuan medis, dan kontak darurat pribadi', icon: AlertCircle, actionType: 'plugin', pluginId: 'emergency' },
  { cmd: '/summary', label: 'Ringkas Percakapan', desc: 'Rangkum obrolan sesi saat ini', icon: Sparkles, actionType: 'system' },
  { cmd: '/export', label: 'Ekspor Chat', desc: 'Unduh riwayat percakapan (.md)', icon: Download, actionType: 'system' },
  { cmd: '/articles', label: 'Artikel Edukasi', desc: 'Baca materi umum dan latihan mandiri', icon: BookOpen, actionType: 'plugin', pluginId: 'articles' },
];

export const CHAT_PLUGINS: ChatPluginOption[] = [
  {
    id: 'grounding',
    icon: HeartPulse,
    label: 'Grounding 5-4-3-2-1',
    desc: 'Latihan indra saat merasa cemas; bukan bantuan darurat',
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/60'
  },
  {
    id: 'mood',
    icon: Heart,
    label: 'Mood Tracker',
    desc: 'Catat kondisi emosi harian',
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/60'
  },
  {
    id: 'articles',
    icon: BookOpen,
    label: 'Artikel Edukasi',
    desc: 'Baca panduan kesehatan mental',
    color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60'
  },
  {
    id: 'screening',
    icon: Stethoscope,
    label: 'Skrining Mandiri',
    desc: 'Cek tingkat stres, cemas & depresi',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/60'
  },
  {
    id: 'counselors',
    icon: Users,
    label: 'Konselor Kampus',
    desc: 'Temukan konselor profesional',
    color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/60'
  },
  {
    id: 'emergency',
    icon: AlertCircle,
    label: 'Bantuan Darurat SOS',
    desc: 'Akses Healing119 dan bantuan medis darurat',
    color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/60'
  },
];
