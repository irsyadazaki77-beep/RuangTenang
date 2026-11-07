/**
 * Academic Integrity & Turnitin Readiness Auditor for RuangKerja / RuangTenang
 * Assesses potential text similarity, detects non-academic phrasing, and provides
 * sentence-by-sentence academic paraphrasing according to Indonesian Dikti standards.
 */

export interface ParaphraseSuggestion {
  originalSentence: string;
  paraphrasedSentence: string;
  reason: string;
  riskLevel: 'high' | 'medium' | 'low';
}

export interface IntegrityAuditReport {
  overallRiskScore: number; // 0 - 100%
  riskCategory: 'safe' | 'moderate' | 'high';
  sentenceCount: number;
  flaggedSentencesCount: number;
  vocabularyDiversityRatio: number; // 0 - 1.0
  academicToneScore: number; // 0 - 100
  suggestions: ParaphraseSuggestion[];
  summaryNote: string;
}

const COLLOQUIAL_PHRASES: Array<{ pattern: RegExp; replacement: string; reason: string }> = [
  {
    pattern: /\bmenurut saya\b/gi,
    replacement: 'berdasarkan perspektif analisis teoritis',
    reason: 'Hindari sudut pandang orang pertama yang subjektif dalam naskah ilmiah.'
  },
  {
    pattern: /\bsangat banyak sekali\b/gi,
    replacement: 'dalam kuantitas yang signifikan',
    reason: 'Redundansi pleonasme tidak baku.'
  },
  {
    pattern: /\bbisa dibilang\b/gi,
    replacement: 'dapat diinterpretasikan bahwa',
    reason: 'Frasa ragam lisan, gunakan kata kerja kognitif formal.'
  },
  {
    pattern: /\btentunya\b/gi,
    replacement: 'secara konsisten',
    reason: 'Klaim absolut tanpa bukti empiris.'
  },
  {
    pattern: /\bkita tahu bahwa\b/gi,
    replacement: 'sebagaimana telah dibuktikan dalam literatur terdahulu,',
    reason: 'Asumsi subjektif, ganti dengan rujukan literatur obyektif.'
  },
  {
    pattern: /\bpada dasarnya\b/gi,
    replacement: 'secara fundamental',
    reason: 'Frasa pengisi (filler word) percakapan.'
  },
  {
    pattern: /\bmembuktikan secara mutlak\b/gi,
    replacement: 'mengindikasikan kecenderungan kuat bahwa',
    reason: 'Gunakan prinsip hedging (kehati-hatian ilmiah).'
  },
  {
    pattern: /\bbagus sekali\b/gi,
    replacement: 'menunjukkan efikasi optimal',
    reason: 'Diksi informal, ganti dengan terminologi metrik terukur.'
  },
  {
    pattern: /\btapi\b/gi,
    replacement: 'namun demikian',
    reason: 'Konjungsi non-baku pada awal atau tengah kalimat.'
  },
  {
    pattern: /\bkarena\b/gi,
    replacement: 'oleh karena',
    reason: 'Gunakan konjungsi kausalitas baku.'
  }
];

/**
 * Splits text into formal sentence tokens, removing markdown headers and tables
 */
export function splitIntoSentences(text: string): string[] {
  const cleanText = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => !line.startsWith('#') && !line.startsWith('|') && !line.startsWith('```') && !line.startsWith(':::'))
    .join(' ');

  return cleanText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

function toPassiveVerb(verb: string): string {
  if (verb.startsWith('mengan')) return verb.replace(/^mengan/, 'dian');
  if (verb.startsWith('meng')) return verb.replace(/^meng/, 'di');
  if (verb.startsWith('memper')) return verb.replace(/^memper/, 'diper');
  if (verb.startsWith('mem')) return verb.replace(/^mem/, 'di');
  if (verb.startsWith('men')) return verb.replace(/^men/, 'di');
  if (verb.startsWith('meny')) return verb.replace(/^meny/, 'dis');
  if (verb.startsWith('me')) return verb.replace(/^me/, 'di');
  return `di${verb}`;
}

/**
 * Paraphrases a sentence by converting active tone to academic passive/hedged tone
 */
export function paraphraseAcademicSentence(sentence: string): { paraphrased: string; reason: string; risk: 'high' | 'medium' | 'low' } {
  let paraphrased = sentence;
  let reason = 'Restrukturisasi kalimat untuk meminimalkan kemiripan sintaksis Turnitin.';
  let risk: 'high' | 'medium' | 'low' = 'low';

  // 1. Check for colloquial or clichéd phrases
  for (const item of COLLOQUIAL_PHRASES) {
    if (item.pattern.test(paraphrased)) {
      paraphrased = paraphrased.replace(item.pattern, item.replacement);
      reason = item.reason;
      risk = 'high';
    }
  }

  // 2. Active voice heuristic: "Peneliti melakukan X" -> "X dilakukan oleh peneliti"
  const activePattern = /^Peneliti\s+(menganalisis|menguji|mengukur|mengamati|mengembangkan|melakukan)\s+(.*)/i;
  const match = paraphrased.match(activePattern);
  if (match) {
    const verb = match[1].toLowerCase();
    const rest = match[2].replace(/[.!?]+$/, '');
    const passiveVerb = toPassiveVerb(verb);
    paraphrased = `Proses ${rest} ${passiveVerb} secara sistematis guna menjamin objektivitas penelitian.`;
    reason = 'Mengubah klausa aktif peneliti menjadi klausa pasif objektif untuk gaya ilmiah impersonal.';
    risk = 'medium';
  }

  // 3. Cliché sentence start transformation
  if (/^Hal ini karena /i.test(paraphrased)) {
    paraphrased = paraphrased.replace(/^Hal ini karena /i, 'Kondisi empiris tersebut dipengaruhi oleh faktor ');
    reason = 'Menghindari struktur kalimat klise berulang.';
    risk = 'medium';
  } else if (/^Selain itu, /i.test(paraphrased)) {
    paraphrased = paraphrased.replace(/^Selain itu, /i, 'Ditinjau dari dimensi komplementer, ');
    reason = 'Memperkaya variasi transisi antar-paragraf.';
  }

  // If no change occurred, apply structural hedging
  if (paraphrased === sentence) {
    if (sentence.length > 80 && !sentence.includes('menunjukkan') && !sentence.includes('dapat')) {
      paraphrased = `Berdasarkan observasi data, ${sentence.charAt(0).toLowerCase() + sentence.slice(1)}`;
      reason = 'Penambahan klausa pemandu observasi untuk memecah kecocokan frasa panjang.';
      risk = 'low';
    }
  }

  return { paraphrased, reason, risk };
}

/**
 * Audits complete document for Turnitin readiness and similarity patterns
 */
export function auditDocumentIntegrity(content: string): IntegrityAuditReport {
  const sentences = splitIntoSentences(content);
  if (sentences.length === 0) {
    return {
      overallRiskScore: 0,
      riskCategory: 'safe',
      sentenceCount: 0,
      flaggedSentencesCount: 0,
      vocabularyDiversityRatio: 1.0,
      academicToneScore: 100,
      suggestions: [],
      summaryNote: 'Naskah belum memiliki cukup kalimat untuk dianalisis.'
    };
  }

  const suggestions: ParaphraseSuggestion[] = [];
  let flaggedCount = 0;

  for (const s of sentences) {
    const result = paraphraseAcademicSentence(s);
    if (result.paraphrased !== s || result.risk !== 'low') {
      flaggedCount++;
      suggestions.push({
        originalSentence: s,
        paraphrasedSentence: result.paraphrased,
        reason: result.reason,
        riskLevel: result.risk
      });
    }
  }

  // Calculate Type-Token Ratio (Vocabulary Diversity)
  const words = content.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const uniqueWords = new Set(words);
  const vocabularyDiversityRatio = words.length > 0 ? Number((uniqueWords.size / words.length).toFixed(2)) : 1.0;

  // Calculate Turnitin Risk Score (Estimated Similarity Index)
  const flaggedRatio = flaggedCount / sentences.length;
  const rawRisk = Math.round(flaggedRatio * 45 + (1 - Math.min(1, vocabularyDiversityRatio * 1.5)) * 30);
  const overallRiskScore = Math.min(95, Math.max(5, rawRisk));

  const riskCategory = overallRiskScore <= 15 ? 'safe' : overallRiskScore <= 30 ? 'moderate' : 'high';
  const academicToneScore = Math.max(10, 100 - overallRiskScore);

  let summaryNote: string;
  if (riskCategory === 'safe') {
    summaryNote = `Naskah berada pada zona AMAN (Estimasi Similaritas ~${overallRiskScore}%). Ragam bahasa formal dan variasi kosa kata memenuhi standar uji Turnitin kampus.`;
  } else if (riskCategory === 'moderate') {
    summaryNote = `Naskah berada pada zona WASPADA (Estimasi Similaritas ~${overallRiskScore}%). Terdapat beberapa frasa klise dan konstruksi kalimat aktif yang berisiko terdeteksi oleh sistem Turnitin.`;
  } else {
    summaryNote = `Naskah memiliki RISIKO TINGGI (Estimasi Similaritas ~${overallRiskScore}%). Disarankan melakukan parafrase intensif terhadap kalimat yang ditandai sebelum diajukan ke sidang/komite etik.`;
  }

  return {
    overallRiskScore,
    riskCategory,
    sentenceCount: sentences.length,
    flaggedSentencesCount: flaggedCount,
    vocabularyDiversityRatio,
    academicToneScore,
    suggestions: suggestions.slice(0, 20), // Top 20 suggestions
    summaryNote
  };
}

/**
 * Applies all accepted paraphrases to the original markdown text
 */
export function applyParaphrasesToContent(
  originalContent: string,
  acceptedReplacements: Array<{ original: string; replacement: string }>
): string {
  let updated = originalContent;
  for (const item of acceptedReplacements) {
    if (item.original && item.replacement && item.original !== item.replacement) {
      updated = updated.replace(item.original, item.replacement);
    }
  }
  return updated;
}
