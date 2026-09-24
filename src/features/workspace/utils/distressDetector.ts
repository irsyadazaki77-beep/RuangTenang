/**
 * Academic Distress & Burnout Detector for RuangTenang & RuangKerja
 * Detects cognitive overwhelm, deadline panic, thesis despair, or emotional burnout in prompts.
 * Non-intrusive, designed to offer gentle micro-regulation without disrupting user flow.
 */

export interface DistressDetectionResult {
  isDistressed: boolean;
  distressType?: 'panic' | 'overwhelm' | 'exhaustion' | 'burnout';
  triggerKeywords: string[];
  suggestedAction: string;
}

const PANIC_TRIGGERS = [
  'panik',
  'takut gagal',
  'jantung berdebar',
  'nangis',
  'mau nangis',
  'pengen nangis',
  'takut banget',
  'gugup parah',
  'gemeteran',
  'ngeblank',
  'blank total',
  'sesak napas',
  'cemas banget',
  'ketakutan'
];

const OVERWHELM_TRIGGERS = [
  'deadline 1 jam',
  'deadline 2 jam',
  'deadline besok pagi',
  'deadline mepet',
  'ga paham apa-apa',
  'ga ngerti apa apa',
  'otak buntu',
  'otakku buntu',
  'pusing banget',
  'pusing bgt',
  'kebanyakan tugas',
  'menumpuk parah',
  'ga keburu',
  'dosen nolak lagi',
  'dosen galak',
  'revisi mulu',
  'revisi terus ga selesai',
  'sidang skripsi',
  'dosen pembimbing ngilang',
  'dospem killer',
  'overthinking skripsi'
];

const EXHAUSTION_TRIGGERS = [
  'capek banget',
  'capek bgt',
  'lelah mental',
  'kurang tidur 2 hari',
  'begadang semingguan',
  'mau nyerah',
  'pengen nyerah',
  'ga kuat lagi',
  'ga sanggup lagi',
  'burnout parah',
  'frustrasi berat',
  'hampa',
  'lelah hidup',
  'stres berat',
  'stress berat',
  'capek fisik dan mental',
  'mental break'
];

export function detectAcademicDistress(text: string): DistressDetectionResult {
  if (!text || text.trim().length < 4) {
    return { isDistressed: false, triggerKeywords: [], suggestedAction: '' };
  }

  const normalized = text.toLowerCase();
  const matchedPanic = PANIC_TRIGGERS.filter(k => normalized.includes(k));
  const matchedOverwhelm = OVERWHELM_TRIGGERS.filter(k => normalized.includes(k));
  const matchedExhaustion = EXHAUSTION_TRIGGERS.filter(k => normalized.includes(k));

  if (matchedPanic.length > 0) {
    return {
      isDistressed: true,
      distressType: 'panic',
      triggerKeywords: matchedPanic,
      suggestedAction: 'Latihan Napas 1 Menit (Box Breathing)'
    };
  }

  if (matchedOverwhelm.length > 0) {
    return {
      isDistressed: true,
      distressType: 'overwhelm',
      triggerKeywords: matchedOverwhelm,
      suggestedAction: 'Teknik Grounding 5-4-3-2-1'
    };
  }

  if (matchedExhaustion.length > 0) {
    return {
      isDistressed: true,
      distressType: 'exhaustion',
      triggerKeywords: matchedExhaustion,
      suggestedAction: 'Jeda Pemulihan & Konselor Kampus'
    };
  }

  return {
    isDistressed: false,
    triggerKeywords: [],
    suggestedAction: ''
  };
}
