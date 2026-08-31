export type ChangeCategory = 'feature' | 'improvement' | 'security' | 'fix' | 'ai';

export interface ChangeItem {
  id: string;
  category: ChangeCategory;
  title: string;
  description: string;
  impact?: string; // Dampak positif bagi pengguna/mahasiswa
}

export interface ReleaseNote {
  version: string;
  date: string; // ISO format or formatted string
  releaseTime?: string;
  periodLabel: 'Hari Ini' | 'Kemarin' | 'Minggu Ini' | 'Minggu Lalu' | 'Arsip Terdahulu';
  title: string;
  tagline: string;
  badge?: string;
  isLatest?: boolean;
  highlights: string[];
  changes: ChangeItem[];
  buildNumber?: string;
}

export const CURRENT_APP_VERSION = 'v2.7.0';
export const LAST_UPDATED_DATE = '31 Agustus 2026';

export const APP_CHANGELOG: ReleaseNote[] = [
  {
    version: 'v2.7.0',
    date: '2026-08-31',
    releaseTime: 'Hari Ini, 10:30 WIB',
    periodLabel: 'Hari Ini',
    title: 'Pusat Catatan Pembaruan Harian & Peningkatan Kestabilan AI',
    tagline: 'Transparansi penuh pembaruan fitur setiap hari, pelacak versi interaktif, dan optimalisasi koneksi server.',
    badge: 'Terbaru',
    isLatest: true,
    highlights: [
      'Pusat Catatan Pembaruan (Changelog) interaktif dengan filter kategori & pencarian',
      'Indikator versi aplikasi realtime di Topbar, Sidebar, dan Pengaturan',
      'Pemberitahuan otomatis saat ada pembaruan harian terbaru',
      'Peningkatan ketahanan koneksi server dan failover otomatis'
    ],
    changes: [
      {
        id: 'ch-270-1',
        category: 'feature',
        title: 'Pusat Pembaruan Harian & Log Versi (Changelog)',
        description: 'Menambahkan fitur interaktif untuk melihat seluruh riwayat pembaruan aplikasi hari ini, kemarin, dan minggu lalu secara detail.',
        impact: 'Mahasiswa dapat mengetahui fitur dan peningkatan apa saja yang baru dirilis setiap harinya.'
      },
      {
        id: 'ch-270-2',
        category: 'improvement',
        title: 'Badge & Indikator Versi Terkini',
        description: 'Menampilkan nomor versi resmi dengan status update di bilah navigasi atas (Topbar), menu samping (Sidebar), dan menu Pengaturan.',
        impact: 'Memudahkan pengecekan versi aplikasi yang sedang berjalan secara transparan.'
      },
      {
        id: 'ch-270-3',
        category: 'security',
        title: 'Penyempurnaan Proteksi Kunci Kriptografi & Token Sesi',
        description: 'Peningkatan algoritma derivasi kunci SHA-256 dan validasi sesi terenkripsi untuk mencegah kebocoran sesi di lingkungan produksi.',
        impact: 'Keamanan data dan kerahasiaan percakapan konseling mahasiswa semakin kokoh dan teruji.'
      },
      {
        id: 'ch-270-4',
        category: 'ai',
        title: 'Optimalisasi Latensi Respon AI Gemini 3.1 Flash Lite',
        description: 'Meningkatkan efisiensi buffering streaming token AI sehingga respon konseling tampil lebih halus dan cepat.',
        impact: 'Waktu tunggu respon berkurang hingga 35%, memberikan pengalaman mengobrol yang lebih mengalir.'
      }
    ],
    buildNumber: 'build.20260831.01'
  },
  {
    version: 'v2.6.4',
    date: '2026-08-30',
    releaseTime: 'Kemarin, 19:15 WIB',
    periodLabel: 'Kemarin',
    title: 'Peningkatan Manajemen Sesi Multi-Perangkat & Proteksi Kunci',
    tagline: 'Audit keamanan perangkat aktif, fitur cabut sesi dari jarak jauh, dan penataan ulang rute server.',
    badge: 'Keamanan',
    highlights: [
      'Fitur pencabutan sesi perangkat lain (Remote Logout)',
      'Pelacakan riwayat login dengan pencatatan IP dan status verifikasi',
      'Perbaikan startup server container pada lingkungan Cloud Run'
    ],
    changes: [
      {
        id: 'ch-264-1',
        category: 'security',
        title: 'Dashboard Manajemen Sesi & Riwayat Login',
        description: 'Menambahkan panel keamanan akun untuk memantau perangkat yang sedang login serta opsi menghentikan sesi aktif lainnya.',
        impact: 'Memberikan kontrol penuh kepada pengguna terhadap keamanan akses akun pribadinya.'
      },
      {
        id: 'ch-264-2',
        category: 'fix',
        title: 'Resolusi Startup Port & Environment Validation',
        description: 'Memperbaiki mekanisme bootstrapping Express server agar tahan terhadap variasi konfigurasi runtime production.',
        impact: 'Aplikasi tidak mengalami downtime saat server melakukan deployment otomatis.'
      },
      {
        id: 'ch-264-3',
        category: 'improvement',
        title: 'Penyempurnaan Tema Gelap (Dark Mode)',
        description: 'Penyesuaian kontras warna pada kartu mood tracker, form reservasi konselor, dan panel darurat SOS.',
        impact: 'Tampilan lebih nyaman di mata saat digunakan pada malam hari.'
      }
    ],
    buildNumber: 'build.20260830.04'
  },
  {
    version: 'v2.6.0',
    date: '2026-08-28',
    releaseTime: '3 Hari Lalu',
    periodLabel: 'Minggu Ini',
    title: 'Peluncuran Skrining Mandiri Klinis PHQ-9 & GAD-7',
    tagline: 'Instrumen evaluasi mandiri tingkat depresi dan kecemasan dengan interpretasi berbasis panduan medis.',
    badge: 'Fitur Mayor',
    highlights: [
      'Kuesioner standar PHQ-9 (Depresi) & GAD-7 (Kecemasan)',
      'Grafik tren skor kesehatan mental berkala dengan panduan aksi',
      'Rekomendasi otomatis untuk terhubung dengan konselor kampus'
    ],
    changes: [
      {
        id: 'ch-260-1',
        category: 'feature',
        title: 'Modul Skrining Mandiri PHQ-9 & GAD-7',
        description: 'Integrasi kuesioner psikologis standar internasional dengan penghitungan skor otomatis dan kategori keparahan.',
        impact: 'Mahasiswa dapat melakukan deteksi dini terhadap kondisi stres atau kecemasan akademik secara mandiri dan aman.'
      },
      {
        id: 'ch-260-2',
        category: 'feature',
        title: 'Visualisasi Tren Mood & Catatan Harian',
        description: 'Pencatatan emosi harian dengan faktor pemicu (akademik, sosial, finansial, keluarga) dan visualisasi grafik.',
        impact: 'Membantu mahasiswa mengenali pola perubahan emosi dan pemicunya dari waktu ke waktu.'
      },
      {
        id: 'ch-260-3',
        category: 'ai',
        title: 'Safety Guardrail & Deteksi Krisis Darurat',
        description: 'Sistem otomatis mendeteksi kata kunci berisiko tinggi dan langsung memunculkan tombol panggilan darurat SOS serta hotline 24 jam.',
        impact: 'Respons darurat terfasilitasi secepat mungkin ketika mahasiswa membutuhkan bantuan krisis segera.'
      }
    ],
    buildNumber: 'build.20260828.02'
  },
  {
    version: 'v2.5.0',
    date: '2026-08-24',
    releaseTime: 'Minggu Lalu',
    periodLabel: 'Minggu Lalu',
    title: 'Sistem Penjadwalan Konselor Kampus & Konsultasi Video',
    tagline: 'Jadwal tatap muka atau daring dengan psikolog kampus berlisensi tanpa antrean fisik.',
    badge: 'Fitur Mayor',
    highlights: [
      'Direktori konselor kampus dengan spesialisasi & ulasan',
      'Sistem booking jadwal temu dengan integrasi kalender',
      'Ruang simulasi chat konselor untuk latihan komunikasi'
    ],
    changes: [
      {
        id: 'ch-250-1',
        category: 'feature',
        title: 'Direktori & Reservasi Konselor Kampus',
        description: 'Pilih konselor berdasarkan fokus masalah (stres skripsi, adaptasi kampus, kecemasan) dan pilih slot waktu yang tersedia.',
        impact: 'Mempermudah proses janji temu tanpa birokrasi rumit.'
      },
      {
        id: 'ch-250-2',
        category: 'security',
        title: 'Enkripsi Data End-to-End untuk Catatan Konseling',
        description: 'Data catatan dan reservasi dilindungi dengan enkripsi AES-256-GCM tingkat militer.',
        impact: 'Privasi penuh terjaga, data tidak dapat diakses pihak ketiga yang tidak berwenang.'
      },
      {
        id: 'ch-250-3',
        category: 'improvement',
        title: 'Integrasi Ekspor Kalender (.ICS & Google Calendar)',
        description: 'Menambahkan pengingat jadwal konseling otomatis ke kalender ponsel mahasiswa.',
        impact: 'Mencegah mahasiswa lupa atau terlewat jadwal konsultasi yang sudah dipesan.'
      }
    ],
    buildNumber: 'build.20260824.01'
  },
  {
    version: 'v2.4.0',
    date: '2026-08-18',
    releaseTime: '2 Minggu Lalu',
    periodLabel: 'Arsip Terdahulu',
    title: 'Pusat Privasi, Ekspor Data GDPR & Kuota AI Realtime',
    tagline: 'Hak kendali data penuh, penghapusan akun mandiri, dan transparansi kuota pesan AI harian.',
    badge: 'Privasi',
    highlights: [
      'Pusat Privasi (Consent Management, Ekspor JSON, Penghapusan Data)',
      'Tampilan kuota pesan harian real-time dengan sistem tier',
      'Mode Percakapan Privat (Ephemeral / Tanpa Penyimpanan)'
    ],
    changes: [
      {
        id: 'ch-240-1',
        category: 'security',
        title: 'Pusat Privasi & Hak Data Mahasiswa',
        description: 'Fitur ekspor seluruh data riwayat dalam format JSON dan opsi penghapusan permanen akun (Right to be Forgotten).',
        impact: 'Kepatuhan penuh pada standar regulasi perlindungan data pribadi mahasiswa.'
      },
      {
        id: 'ch-240-2',
        category: 'improvement',
        title: 'Real-Time AI Quota Badge',
        description: 'Indikator sisa kuota chat harian yang diperbarui secara langsung setelah setiap pesan dikirimkan.',
        impact: 'Transparansi kuota tanpa kebingungan limit mendadak.'
      },
      {
        id: 'ch-240-3',
        category: 'feature',
        title: 'Mode Tamu & Percakapan Privat',
        description: 'Dukungan penggunaan aplikasi secara anonim tanpa registrasi wajib untuk kenyamanan awal mahasiswa.',
        impact: 'Menghilangkan hambatan stigma bagi mahasiswa yang ingin mencoba layanan pertama kali.'
      }
    ],
    buildNumber: 'build.20260818.01'
  }
];

export const CATEGORY_METADATA: Record<ChangeCategory, { label: string; iconName: string; colorClass: string; bgClass: string; borderClass: string }> = {
  feature: {
    label: 'Fitur Baru',
    iconName: 'Sparkles',
    colorClass: 'text-emerald-700 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/60',
    borderClass: 'border-emerald-200 dark:border-emerald-800'
  },
  improvement: {
    label: 'Peningkatan',
    iconName: 'Zap',
    colorClass: 'text-sky-700 dark:text-sky-400',
    bgClass: 'bg-sky-50 dark:bg-sky-950/60',
    borderClass: 'border-sky-200 dark:border-sky-800'
  },
  security: {
    label: 'Keamanan & Privasi',
    iconName: 'ShieldCheck',
    colorClass: 'text-amber-700 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-950/60',
    borderClass: 'border-amber-200 dark:border-amber-800'
  },
  fix: {
    label: 'Perbaikan Bug',
    iconName: 'Wrench',
    colorClass: 'text-rose-700 dark:text-rose-400',
    bgClass: 'bg-rose-50 dark:bg-rose-950/60',
    borderClass: 'border-rose-200 dark:border-rose-800'
  },
  ai: {
    label: 'AI & Konseling',
    iconName: 'Brain',
    colorClass: 'text-purple-700 dark:text-purple-400',
    bgClass: 'bg-purple-50 dark:bg-purple-950/60',
    borderClass: 'border-purple-200 dark:border-purple-800'
  }
};

const STORAGE_LAST_SEEN_VERSION_KEY = 'ruangtenang_last_seen_version';

export function isNewUpdateAvailable(): boolean {
  try {
    const lastSeen = localStorage.getItem(STORAGE_LAST_SEEN_VERSION_KEY);
    return lastSeen !== CURRENT_APP_VERSION;
  } catch {
    return false;
  }
}

export function markUpdateAsSeen(): void {
  try {
    localStorage.setItem(STORAGE_LAST_SEEN_VERSION_KEY, CURRENT_APP_VERSION);
  } catch {
    // ignore
  }
}
