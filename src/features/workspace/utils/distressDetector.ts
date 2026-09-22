/**
 * Academic Distress Detector for RuangKerja
 * Detects patterns of cognitive overwhelm, panic, despair, or burnout in academic prompts.
 * Non-intrusive, designed to offer gentle micro-regulation without disrupting productivity.
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
  'blank total'
];

const OVERWHELM_TRIGGERS = [
  'deadline 1 jam',
  'deadline 2 jam',
  'deadline besok pagi',
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
  'revisi mulu',
  'revisi terus ga selesai'
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
  'frustrasi berat'
];

export function detectAcademicDistress(text: string): DistressDetectionResult {
  if (!text || text.trim().length < 5) {
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
      suggestedAction: 'Ambil Napas 1 Menit'
    };
  }

  if (matchedOverwhelm.length > 0) {
    return {
      isDistressed: true,
      distressType: 'overwhelm',
      triggerKeywords: matchedOverwhelm,
      suggestedAction: 'Jeda Relaksasi Singkat'
    };
  }

  if (matchedExhaustion.length > 0) {
    return {
      isDistressed: true,
      distressType: 'exhaustion',
      triggerKeywords: matchedExhaustion,
      suggestedAction: 'Atur Ritme Pikiran'
    };
  }

  return {
    isDistressed: false,
    triggerKeywords: [],
    suggestedAction: ''
  };
}
