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
  LucideIcon
} from 'lucide-react';

export interface ChatCommand {
  cmd: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  actionType: 'plugin' | 'system';
  pluginId?: 'mood' | 'articles' | 'screening' | 'counselors' | 'emergency' | 'breathing';
}

export interface ChatPluginOption {
  id: 'mood' | 'articles' | 'screening' | 'counselors' | 'emergency' | 'breathing';
  icon: LucideIcon;
  label: string;
  desc: string;
  color: string;
}

export const CHAT_COMMANDS: ChatCommand[] = [
  { cmd: '/mood', label: 'Catat Suasana Hati', desc: 'Buka modal mood tracker & grafik emosi', icon: Heart, actionType: 'plugin', pluginId: 'mood' },
  { cmd: '/jeda', label: 'Jeda Hening 1-Menit', desc: 'Latihan relaksasi pernapasan terpandu', icon: Wind, actionType: 'plugin', pluginId: 'breathing' },
  { cmd: '/skrining', label: 'Skrining Mandiri', desc: 'Tes psikometri klinis PHQ-9 & GAD-7', icon: Stethoscope, actionType: 'plugin', pluginId: 'screening' },
  { cmd: '/konselor', label: 'Cari Konselor Kampus', desc: 'Buka direktori & jadwalkan konseling', icon: Users, actionType: 'plugin', pluginId: 'counselors' },
  { cmd: '/clear', label: 'Bersihkan Percakapan', desc: 'Reset & bersihkan riwayat obrolan sesi saat ini', icon: Trash2, actionType: 'system' },
  { cmd: '/new', label: 'Chat Baru', desc: 'Mulai sesi percakapan segar', icon: PlusCircle, actionType: 'system' },
  { cmd: '/counselor', label: 'Direktori Konselor', desc: 'Jadwalkan pendampingan konselor', icon: Users, actionType: 'plugin', pluginId: 'counselors' },
  { cmd: '/emergency', label: 'Bantuan Darurat SOS', desc: 'Hotline krisis & kontak darurat 24 jam', icon: AlertCircle, actionType: 'plugin', pluginId: 'emergency' },
  { cmd: '/summary', label: 'Ringkas Percakapan', desc: 'Rangkum obrolan sesi saat ini', icon: Sparkles, actionType: 'system' },
  { cmd: '/export', label: 'Ekspor Chat', desc: 'Unduh riwayat percakapan (.md)', icon: Download, actionType: 'system' },
  { cmd: '/articles', label: 'Artikel Edukasi', desc: 'Baca panduan & tips psikologis', icon: BookOpen, actionType: 'plugin', pluginId: 'articles' },
];

export const CHAT_PLUGINS: ChatPluginOption[] = [
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
    desc: 'Hotline bantuan krisis 24 jam',
    color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/60' 
  },
];
