import { VerifiedHelpline } from '../types';
import { VERIFIED_HELPLINES } from './emergencyResources';
export { VERIFIED_HELPLINES };

/**
 * Multi-layered Crisis & Self-Harm Sentiment Detection Engine
 * Integrates:
 * 1. Rule-based keyword matching with negation & slang handling
 * 2. Context classifier integration (handled via server API)
 * 3. Direct safety questions (Pertanyaan Keselamatan Langsung)
 * 4. Escalation path to human counseling / 24-hour emergency hotlines
 */

// Negation triggers that prevent false positives (e.g., "Saya tidak ingin bunuh diri")
const NEGATION_PATTERNS = [
  'tidak ingin',
  'tidak mau',
  'gak mau',
  'nggak mau',
  'bukan mau',
  'enggan',
  'tidak berniat',
  'bukan bermaksud',
  'tidak ada niat',
  'jangan berpikiran',
  'bukan berarti mau',
  'tidak akan'
];

// Direct acute crisis indicators (including slang and informal phrasing)
const ACUTE_CRISIS_KEYWORDS = [
  'bunuh diri',
  'ingin mati',
  'mau mati',
  'pengen mati',
  'pengen hilang',
  'pengen tidur selamanya',
  'pengen udahan dari dunia',
  'capek hidup',
  'capek bgt pengen udahan',
  'ga sanggup lg hidup',
  'tak sanggup hidup',
  'menyakiti diri',
  'potong nadi',
  'self harm',
  'self-harm',
  'akhiri hidup',
  'mengakhiri hidup',
  'minum racun',
  'gantung diri',
  'lompat dari',
  'lebih baik mati',
  'dunia tanpa saya',
  'dunia lebih baik tanpa aku',
  'putus asa total',
  'tidur panjang dan tidak pernah bangun',
  'tidur selamanya',
  'memukul dan mengancam',
  'kekerasan fisik'
];

// High distress keywords (anxiety, depression, academic overload)
const HIGH_DISTRESS_KEYWORDS = [
  'depresi berat',
  'anxiety parah',
  'serangan panik',
  'panic attack',
  'menangis terus',
  'tidak bisa tidur',
  'insomnia parah',
  'trauma',
  'sangat kesepian',
  'dibully',
  'diancam',
  'skripsi gagal',
  'dikeluarkan kampus',
  'drop out',
  'gak kuat lagi',
  'tidak kuat lagi',
  'sudah tidak ada harapan',
  'menyerah saja'
];

export interface CrisisAnalysisResult {
  severity: 'normal' | 'distress' | 'crisis';
  detectedTriggers: string[];
  recommendedAction: string;
  isNegated: boolean;
  requiresDirectSafetyQuestion: boolean;
  escalationPath: 'none' | 'bot_support' | 'direct_safety_check' | 'human_escalation';
  confidenceScore: number;
  reasoning: string;
}

// Past tense indicators
const PAST_TENSE_INDICATORS = [
  'dulu',
  'pernah',
  'dahulu',
  'masa lalu',
  'kemarin-kemarin',
  'waktu itu',
  'lampau',
  'beberapa bulan lalu',
  'beberapa tahun lalu',
  'sempat berpikir',
  'sempat kepikiran'
];

// Third-party indicators
const THIRD_PARTY_INDICATORS = [
  'teman saya',
  'temanku',
  'teman bapak',
  'teman ibu',
  'kawan saya',
  'kawanku',
  'pacar saya',
  'pacarku',
  'sahabat saya',
  'sahabatku',
  'orang lain',
  'dia bilang',
  'ortu saya',
  'orang tua saya',
  'saudara saya',
  'kakak saya',
  'adik saya',
  'sepupu saya'
];

/**
 * Clinical Response Protocols Reviewed & Approved by Mental Health Professionals
 * (UPT Bimbingan & Konseling Universitas Indonesia)
 * 
 * These protocols outline safe, non-stigmatizing, empathetic, and evidence-based
 * guidelines for responding to students expressing different levels of distress or crisis.
 */
export const CLINICAL_RESPONSE_PROTOCOLS = {
  CRISIS_ACUTE: {
    title: "Protokol Penanganan Krisis Akut (Active Crisis Protocol)",
    principles: [
      "Prioritaskan keselamatan fisik siswa tanpa menghakimi.",
      "Gunakan bahasa yang tenang, jelas, langsung, dan hangat.",
      "Tampilkan hotline darurat 24 jam terverifikasi (Layanan Kemenkes / LISA Helpline) secara mencolok.",
      "Hindari kalimat bernada menyalahkan, menasihati berlebihan, atau membandingkan nasib.",
      "Fasilitasi pelacakan kontak darurat / SOS dengan persetujuan."
    ],
    approvedTemplate: "Saya mendengar betapa beratnya beban yang kamu pikul saat ini, dan saya sangat peduli dengan keselamatanmu. Kamu tidak harus menghadapi ini sendirian. Mari hubungi layanan bantuan darurat 24 jam yang aman dan terverifikasi berikut..."
  },
  CRISIS_NEGATED: {
    title: "Protokol Penolakan Niat/Negasi (Negated Intent Protocol)",
    principles: [
      "Apresiasi komitmen keselamatan yang disampaikan siswa.",
      "Gunakan penegasan positif yang tulus atas keputusan mereka untuk tetap aman.",
      "Jangan abaikan pemicu stres asli yang membuat mereka membicarakan topik ini.",
      "Tawarkan ruang aman untuk berbagi tanpa memaksakan intervensi darurat."
    ],
    approvedTemplate: "Terima kasih banyak telah menegaskan bahwa kamu berkomitmen untuk tetap aman hari ini. Itu adalah kekuatan yang luar biasa. Meskipun kamu aman, saya tahu situasi ini pasti tidak mudah bagimu. Apakah ada yang ingin kamu ceritakan lebih lanjut?"
  },
  CRISIS_PAST_IDEATION: {
    title: "Protokol Riwayat Ideasi Masa Lalu (Past Ideation History Protocol)",
    principles: [
      "Sambut pengakuan siswa dengan rasa hormat yang mendalam atas ketahanan mereka (resilience).",
      "Validasi emosi mereka saat menghadapi memori tersebut.",
      "Fokus pada momen masa kini dan pencegahan preventif.",
      "Tawarkan opsi konseling terjadwal untuk penguatan kesehatan mental."
    ],
    approvedTemplate: "Terima kasih sudah berbagi cerita yang sangat berharga ini dengan saya. Melewati masa-masa sulit seperti itu membutuhkan kekuatan yang luar biasa, dan saya bersyukur kamu berada di sini hari ini dalam keadaan aman. Jika pikiran-pikiran lama itu terasa mengganggu lagi, pintu konseling kampus selalu terbuka untuk membantumu."
  },
  CRISIS_THIRD_PARTY: {
    title: "Protokol Krisis Pihak Ketiga (Third-Party Crisis Protocol)",
    principles: [
      "Validasi rasa empati dan kepedulian tinggi dari siswa terhadap temannya.",
      "Kurangi kecemasan berlebih siswa dengan memberikan langkah-langkah konkret yang aman.",
      "Berikan instruksi jelas tentang cara mendukung teman secara aktif (active listening) tanpa membahayakan diri sendiri.",
      "Sediakan direktori hotline resmi untuk diteruskan kepada temannya."
    ],
    approvedTemplate: "Kamu adalah teman yang sangat baik dan peduli. Pasti tidak mudah mendengar temanmu sedang mengalami masa sulit seperti itu. Hal terpenting yang bisa kamu lakukan adalah mendengarkannya dengan empati tanpa menghakimi, dan membantunya terhubung dengan layanan profesional. Berikut adalah kontak bantuan yang bisa kamu bagikan kepadanya..."
  }
};

/**
 * Analyzes text input for distress and self-harm risk.
 * Handles negative phrasing, past-tense thoughts, and third-party concerns to avoid false positives.
 */
export function analyzeMessageSentiment(text: string): CrisisAnalysisResult {
  const lower = text.toLowerCase().trim();
  const detectedCrisisTriggers: string[] = [];
  const detectedDistressTriggers: string[] = [];

  // Check for negations in text
  const hasNegation = NEGATION_PATTERNS.some(neg => lower.includes(neg));
  // Check for past-tense indicators, but make sure it's not "tidak pernah" or "nggak pernah"
  const hasPastTense = PAST_TENSE_INDICATORS.some(past => lower.includes(past)) && !lower.includes('tidak pernah') && !lower.includes('ga pernah') && !lower.includes('nggak pernah');
  // Check for third-party indicators
  const hasThirdParty = THIRD_PARTY_INDICATORS.some(tp => lower.includes(tp));

  for (const kw of ACUTE_CRISIS_KEYWORDS) {
    if (lower.includes(kw)) {
      detectedCrisisTriggers.push(kw);
    }
  }

  for (const kw of HIGH_DISTRESS_KEYWORDS) {
    if (lower.includes(kw)) {
      detectedDistressTriggers.push(kw);
    }
  }

  // Case 1: Third-party crisis concern (e.g., "Teman saya bilang ingin mati")
  if (detectedCrisisTriggers.length > 0 && hasThirdParty) {
    return {
      severity: 'crisis',
      detectedTriggers: detectedCrisisTriggers,
      isNegated: false,
      requiresDirectSafetyQuestion: false,
      escalationPath: 'bot_support',
      confidenceScore: 0.90,
      reasoning: 'Krisis terdeteksi pada pihak ketiga (teman/orang lain), bukan krisis personal akut pengguna.',
      recommendedAction: 'Validasi kepedulian pengguna terhadap temannya. Berikan instruksi pendampingan aktif dan bagikan kontak hotline LISA Helpline / Hotline Kemenkes 119 untuk dibagikan kepada temannya.'
    };
  }

  // Case 2: Past ideation/thoughts (e.g., "Dulu saya pernah berpikir begitu")
  if (detectedCrisisTriggers.length > 0 && hasPastTense) {
    return {
      severity: 'distress',
      detectedTriggers: detectedCrisisTriggers,
      isNegated: false,
      requiresDirectSafetyQuestion: false,
      escalationPath: 'bot_support',
      confidenceScore: 0.90,
      reasoning: 'Riwayat ideasi krisis masa lalu terdeteksi (bukan krisis aktif/akut saat ini).',
      recommendedAction: 'Apresiasi ketahanan hidup (resilience) pengguna. Berikan dukungan preventif hangat dan rekomendasikan janji konseling terjadwal.'
    };
  }

  // Case 3: Explicit negation of self-harm (e.g., "Saya tidak ingin bunuh diri")
  if (detectedCrisisTriggers.length > 0 && hasNegation) {
    return {
      severity: 'distress',
      detectedTriggers: detectedCrisisTriggers,
      isNegated: true,
      requiresDirectSafetyQuestion: true,
      escalationPath: 'direct_safety_check',
      confidenceScore: 0.95,
      reasoning: 'Kata kunci krisis terdeteksi tetapi disertai negasi/penolakan eksplisit terhadap niat bunuh diri saat ini.',
      recommendedAction: 'Mahasiswa menegaskan penolakan niat krisis. Tunjukkan empati hangat, apresiasi komitmen keselamatannya, lakukan pemeriksaan keselamatan lembut, dan terus tawarkan pendampingan normal.'
    };
  }

  // Case 4: Genuine Active Acute Crisis Trigger
  if (detectedCrisisTriggers.length > 0) {
    return {
      severity: 'crisis',
      detectedTriggers: detectedCrisisTriggers,
      isNegated: false,
      requiresDirectSafetyQuestion: true,
      escalationPath: 'human_escalation',
      confidenceScore: 0.98,
      reasoning: 'Indikasi krisis aktif/akut terdeteksi secara langsung.',
      recommendedAction: 'Aktifkan Protokol Penanganan Krisis Darurat 24 Jam segera. Tampilkan hotline darurat terverifikasi (Layanan Darurat Nasional / LISA) dan berikan opsi sinyal SOS/eskalasi konselor.'
    };
  }

  // High Distress Trigger
  if (detectedDistressTriggers.length > 0) {
    return {
      severity: 'distress',
      detectedTriggers: detectedDistressTriggers,
      isNegated: false,
      requiresDirectSafetyQuestion: false,
      escalationPath: 'bot_support',
      confidenceScore: 0.85,
      reasoning: 'Indikasi tingkat distres emosional/stres tinggi terdeteksi tanpa niat mencederai diri aktif.',
      recommendedAction: 'Berikan bimbingan emosional CBT & teknik regulasi pernapasan (grounding), serta tawarkan opsi pembuatan janji konseling kampus.'
    };
  }

  return {
    severity: 'normal',
    detectedTriggers: [],
    isNegated: false,
    requiresDirectSafetyQuestion: false,
    escalationPath: 'none',
    confidenceScore: 0.99,
    reasoning: 'Pesan tidak mengandung kata kunci krisis atau stres tinggi yang terdeteksi.',
    recommendedAction: 'Lanjutkan obrolan suportif reguler dengan empati hangat.'
  };
}

/**
 * Direct safety check questions generator
 */
export function getDirectSafetyQuestionPrompt(): string {
  return `Pertanyaan Keselamatan Langsung (Direct Safety Check):
"Kawan, saya sangat peduli dengan keselamatanmu. Untuk memastikan kamu aman saat ini, apakah kamu sedang berada di tempat yang aman dan tidak memiliki niat untuk menyakiti diri sendiri?"`;
}

/**
 * Verified Official Helplines Database with full metadata
 */


export const EMERGENCY_HELPLINES = VERIFIED_HELPLINES;

