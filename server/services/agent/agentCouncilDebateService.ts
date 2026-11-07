export interface CouncilDebateTurn {
  id: string;
  personaId: 'supervisor' | 'methodologist' | 'integrity';
  personaName: string;
  personaRole: string;
  avatarBg: string;
  avatarText: string;
  stance: 'affirmative' | 'critical' | 'compromise';
  statement: string;
  referencedStandard: string;
}

export interface CouncilDebateResult {
  id: string;
  topic: string;
  turns: CouncilDebateTurn[];
  consensus: string;
  verdict: 'ACCEPTED' | 'REVISION_MINOR' | 'REVISION_MAJOR';
  verdictLabel: string;
  confidenceScore: number;
  revisionActionItems: string[];
  timestamp: string;
}

export const COUNCIL_MEMBERS = [
  {
    id: 'supervisor' as const,
    name: 'Prof. Dr. Ir. Wahyu Wibowo',
    role: 'Dosen Pembimbing Utama',
    focus: 'Kebaruan Ilmiah & Kerangka Teori',
    avatarBg: 'bg-indigo-600 text-white',
    avatarText: 'WW'
  },
  {
    id: 'methodologist' as const,
    name: 'Dr. Ratna Suminar, M.Sc',
    role: 'Pakar Metodologi & Statistik',
    focus: 'Validitas Sampling, Uji Asumsi & SEM-PLS',
    avatarBg: 'bg-emerald-600 text-white',
    avatarText: 'RS'
  },
  {
    id: 'integrity' as const,
    name: 'Bambang Prakoso, M.T',
    role: 'Penguji Integritas Akademik',
    focus: 'Parafrase, Sitasi APA-7 & Turnitin',
    avatarBg: 'bg-purple-600 text-white',
    avatarText: 'BP'
  }
];

/**
 * Conducts a simulated multi-agent debate session on a thesis chapter draft.
 */
export async function runCouncilDebate(
  topicOrDraft: string,
  chapterContext = 'Bab 1 s/d 3'
): Promise<CouncilDebateResult> {
  const cleanInput = topicOrDraft.trim() || 'Rancangan Penelitian Skripsi';

  const turns: CouncilDebateTurn[] = [
    {
      id: `turn_1_${Date.now()}`,
      personaId: 'supervisor',
      personaName: COUNCIL_MEMBERS[0].name,
      personaRole: COUNCIL_MEMBERS[0].role,
      avatarBg: COUNCIL_MEMBERS[0].avatarBg,
      avatarText: COUNCIL_MEMBERS[0].avatarText,
      stance: 'affirmative',
      statement: `Saya mengapresiasi kebaruan topik "${cleanInput.slice(0, 50)}...". Kerangka berpikir yang diajukan sudah memiliki benang merah yang cukup jelas antara latar belakang dan rumusan masalah. Namun, kedalaman komparasi dengan penelitian 3 tahun terakhir masih perlu dipertegas.`,
      referencedStandard: 'Pedoman Penulisan Skripsi Bab 1 & 2'
    },
    {
      id: `turn_2_${Date.now()}`,
      personaId: 'methodologist',
      personaName: COUNCIL_MEMBERS[1].name,
      personaRole: COUNCIL_MEMBERS[1].role,
      avatarBg: COUNCIL_MEMBERS[1].avatarBg,
      avatarText: COUNCIL_MEMBERS[1].avatarText,
      stance: 'critical',
      statement: `Izin menambahkan Prof Wahyu. Pada ${chapterContext}, saya menyoroti penentuan ukuran sampel dan teknik sampling. Jika menggunakan pendekatan kuantitatif, uji validitas konvergen dan heteroskedastisitas wajib dijabarkan langkah mitigasinya jika asumsi normalitas tidak terpenuhi.`,
      referencedStandard: 'Hair et al. (2021) & Pedoman Uji Statistik'
    },
    {
      id: `turn_3_${Date.now()}`,
      personaId: 'integrity',
      personaName: COUNCIL_MEMBERS[2].name,
      personaRole: COUNCIL_MEMBERS[2].role,
      avatarBg: COUNCIL_MEMBERS[2].avatarBg,
      avatarText: COUNCIL_MEMBERS[2].avatarText,
      stance: 'critical',
      statement: `Dari segi integritas penulisan, saya melihat beberapa kalimat memiliki susunan yang menyerupai abstrak rujukan tanpa sintesis mandiri. Pastikan setiap klaim didukung sitasi formal berformat APA edisi ke-7 dan indeks Turnitin dijaga di bawah 20%.`,
      referencedStandard: 'APA 7th Edition & Standar Keaslian Karya Ilmiah'
    },
    {
      id: `turn_4_${Date.now()}`,
      personaId: 'supervisor',
      personaName: COUNCIL_MEMBERS[0].name,
      personaRole: COUNCIL_MEMBERS[0].role,
      avatarBg: COUNCIL_MEMBERS[0].avatarBg,
      avatarText: COUNCIL_MEMBERS[0].avatarText,
      stance: 'compromise',
      statement: `Saya sepakat dengan catatan Bu Ratna dan Pak Bambang. Jika mahasiswa mampu memperbaiki justifikasi sampling serta memperkaya parafrase sitasi di Bab 2, naskah ini sangat layak untuk dilanjutkan ke tahap pengumpulan data lapangan.`,
      referencedStandard: 'Konsensus Sidang Akademik'
    }
  ];

  return {
    id: `debate_${Date.now()}`,
    topic: cleanInput,
    turns,
    consensus: `Dewan Penguji menyetujui arah penelitian dengan catatan perbaikan minor pada justifikasi metodologi dan kelengkapan rujukan ilmiah APA-7.`,
    verdict: 'REVISION_MINOR',
    verdictLabel: 'Revisi Minor (Layak Lanjut dengan Perbaikan)',
    confidenceScore: 88,
    revisionActionItems: [
      'Tambahkan tabel perbandingan 5 jurnal internasional bereputasi (2021-2026) pada tinjauan pustaka.',
      'Sertakan rumus penentuan jumlah sampel (Slovin / Lemeshow) beserta justifikasi tingkat signifikansi.',
      'Lakukan parafrase ulang pada bagian latar belakang untuk menurunkan potensi similarity index.',
      'Pastikan seluruh kutipan dalam teks tercantum di Daftar Pustaka.'
    ],
    timestamp: new Date().toISOString()
  };
}
