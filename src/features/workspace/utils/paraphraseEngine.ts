/**
 * Meaning-preserving academic text assistant.
 * The local engine deliberately avoids lexical substitutions: wording changes
 * can alter scientific claims, so the safe modes retain source sentences.
 */

export type ParaphraseStyle = 'KONSERVATIF' | 'RESTRUKTURISASI' | 'SINTESIS';
export type SimilarityRiskLevel = 'RENDAH' | 'SEDANG' | 'TINGGI';

export interface SentenceSimilarityItem {
  original: string;
  paraphrased: string;
  similarityPercent: number;
  ngramOverlapPercent: number;
}

export interface TextSimilarityAnalysis {
  /** Combined similarity percentage (0-100): weighted 55% n-gram overlap + 45% normalized Levenshtein */
  overallSimilarityPercent: number;
  /** Word n-gram (unigram + bigram) overlap percentage (0-100) */
  ngramOverlapPercent: number;
  /** Character/token Levenshtein structural similarity percentage (0-100) */
  structuralSimilarityPercent: number;
  /** Risk classification for academic similarity check */
  riskLevel: SimilarityRiskLevel;
  /** Per-sentence comparison breakdown */
  sentenceComparisons: SentenceSimilarityItem[];
}

export interface ParaphraseResult {
  originalText: string;
  paraphrasedText: string;
  style: ParaphraseStyle;
  wordCountOriginal: number;
  wordCountParaphrased: number;
  readabilityScore: number;
  lexicalDiversity: number;
  changesCount: number;
  wordCountChange: number;
  sentenceStructureChange: number;
  similarity: TextSimilarityAnalysis;
}

function splitSentences(text: string): string[] {
  const placeholder = '__ACADEMIC_PARAPHRASE_PERIOD__';
  const protectedPeriods = text
    .replace(/\b(?:Dr|Prof|No|Vol|Fig|et al)\./gi, token => token.replace(/\./g, placeholder))
    .replace(/\b([A-Z])\.\s+(?=[A-Z][a-z])/g, `$1${placeholder} `);
  return protectedPeriods.split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.replaceAll(placeholder, '.').trim()).filter(Boolean);
}

function tokenizeWords(text: string): string[] {
  return text
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function buildNGrams(tokens: string[], n: number): Set<string> {
  if (tokens.length === 0) return new Set();
  if (tokens.length < n) return new Set([tokens.join(' ')]);
  const grams = new Set<string>();
  for (let i = 0; i <= tokens.length - n; i++) {
    grams.add(tokens.slice(i, i + n).join(' '));
  }
  return grams;
}

function computeJaccardPercent(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : Math.round((intersection / union) * 100);
}

function computeTokenLevenshteinSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  // Cap token array length to 350 words to keep DP O(N*M) instantaneous in UI
  const a = tokensA.slice(0, 350);
  const b = tokensB.slice(0, 350);
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, curr] = [curr, prev];
  }
  const distance = prev[n];
  const maxLen = Math.max(m, n);
  return maxLen === 0 ? 0 : Math.max(0, Math.round(((maxLen - distance) / maxLen) * 100));
}

/**
 * Computes lightweight deterministic similarity metrics (N-Gram overlap + token Levenshtein)
 * between source text and paraphrased/edited output.
 */
export function calculateTextSimilarity(originalText: string, candidateText: string): TextSimilarityAnalysis {
  const cleanOrig = originalText.trim();
  const cleanCand = candidateText.trim();

  if (!cleanOrig || !cleanCand) {
    return {
      overallSimilarityPercent: 0,
      ngramOverlapPercent: 0,
      structuralSimilarityPercent: 0,
      riskLevel: 'RENDAH',
      sentenceComparisons: []
    };
  }

  const origTokens = tokenizeWords(cleanOrig);
  const candTokens = tokenizeWords(cleanCand);

  const origUnigrams = buildNGrams(origTokens, 1);
  const candUnigrams = buildNGrams(candTokens, 1);
  const origBigrams = buildNGrams(origTokens, 2);
  const candBigrams = buildNGrams(candTokens, 2);

  const unigramJaccard = computeJaccardPercent(origUnigrams, candUnigrams);
  const bigramJaccard = computeJaccardPercent(origBigrams, candBigrams);
  const ngramOverlapPercent = Math.round(unigramJaccard * 0.4 + bigramJaccard * 0.6);
  const structuralSimilarityPercent = computeTokenLevenshteinSimilarity(origTokens, candTokens);
  const overallSimilarityPercent = cleanOrig === cleanCand
    ? 100
    : Math.min(100, Math.max(0, Math.round(ngramOverlapPercent * 0.55 + structuralSimilarityPercent * 0.45)));

  const riskLevel: SimilarityRiskLevel = overallSimilarityPercent >= 70
    ? 'TINGGI'
    : overallSimilarityPercent >= 40
      ? 'SEDANG'
      : 'RENDAH';

  const origSentences = splitSentences(cleanOrig);
  const candSentences = splitSentences(cleanCand);
  const maxSentences = Math.max(origSentences.length, candSentences.length);
  const sentenceComparisons: SentenceSimilarityItem[] = [];

  for (let i = 0; i < maxSentences; i++) {
    const origSent = origSentences[i] || '';
    // Match against the closest candidate sentence or corresponding index
    let bestCandSent = candSentences[i] || '';
    let bestSim = -1;
    let bestNgram = 0;

    if (origSent && candSentences.length > 0) {
      const sOrigTokens = tokenizeWords(origSent);
      const sOrigBi = buildNGrams(sOrigTokens, 2);
      const sOrigUni = buildNGrams(sOrigTokens, 1);
      for (const candCandidate of candSentences) {
        const sCandTokens = tokenizeWords(candCandidate);
        const sCandBi = buildNGrams(sCandTokens, 2);
        const sCandUni = buildNGrams(sCandTokens, 1);
        const ng = Math.round(computeJaccardPercent(sOrigUni, sCandUni) * 0.4 + computeJaccardPercent(sOrigBi, sCandBi) * 0.6);
        const lev = computeTokenLevenshteinSimilarity(sOrigTokens, sCandTokens);
        const sim = origSent.trim() === candCandidate.trim() ? 100 : Math.round(ng * 0.55 + lev * 0.45);
        if (sim > bestSim) {
          bestSim = sim;
          bestNgram = ng;
          bestCandSent = candCandidate;
        }
      }
    }

    sentenceComparisons.push({
      original: origSent,
      paraphrased: bestCandSent,
      similarityPercent: Math.max(0, bestSim),
      ngramOverlapPercent: bestNgram
    });
  }

  return {
    overallSimilarityPercent,
    ngramOverlapPercent,
    structuralSimilarityPercent,
    riskLevel,
    sentenceComparisons
  };
}

function summarizeExtractively(sentences: string[]): string {
  if (sentences.length <= 2) return sentences.join(' ');

  // Keep the central claim and its immediate support verbatim. This lightweight
  // ranking prefers informative sentences without inventing connecting claims.
  const ranked = sentences.map((sentence, index) => ({
    sentence,
    index,
    score: sentence.split(/\s+/).length + (/(menunjukkan|menyatakan|menemukan|berpengaruh|meningkat|menurun|adalah|merupakan)/i.test(sentence) ? 4 : 0)
  }));
  const protectedSentenceIndexes = new Set(ranked
    .filter(({ sentence }) => /\b\d+(?:[.,]\d+)?\s*%?|\b(?:https?:\/\/|www\.)|\b10\.\d{4,9}\//i.test(sentence)
      || /\([^)]*\b\d{4}\b[^)]*\)|\[\d+\]|`[^`]+`|\$[^$]+\$|\bMenurut\s+[A-Z][a-z]+|\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/.test(sentence))
    .map(item => item.index));
  const selectedIndexes = new Set(protectedSentenceIndexes);
  for (const item of ranked.sort((a, b) => b.score - a.score || a.index - b.index)) {
    if (selectedIndexes.size >= Math.max(2, protectedSentenceIndexes.size)) break;
    selectedIndexes.add(item.index);
  }
  const selected = ranked
    .filter(item => selectedIndexes.has(item.index))
    .sort((a, b) => a.index - b.index);
  return selected.map(item => item.sentence).join(' ');
}

/** Executes paraphrasing deterministically while preserving claims and entities. */
export function paraphraseAcademicText(text: string, style: ParaphraseStyle = 'KONSERVATIF'): ParaphraseResult {
  const cleanInput = text.trim();
  if (!cleanInput) {
    return {
      originalText: '',
      paraphrasedText: '',
      style,
      wordCountOriginal: 0,
      wordCountParaphrased: 0,
      readabilityScore: 0,
      lexicalDiversity: 0,
      changesCount: 0,
      wordCountChange: 0,
      sentenceStructureChange: 0,
      similarity: calculateTextSimilarity('', '')
    };
  }

  const sourceSentences = splitSentences(cleanInput);
  let paraphrasedText: string;
  if (style === 'SINTESIS') {
    paraphrasedText = summarizeExtractively(sourceSentences);
  } else {
    // Both local modes preserve each claim and its ordering. Restructuring is
    // intentionally limited until a semantic-aware editor is available.
    paraphrasedText = cleanInput;
  }

  const originalWords = cleanInput.split(/\s+/).filter(Boolean);
  const outputWords = paraphrasedText.split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(outputWords.map(word => word.toLocaleLowerCase()));
  const lexicalDiversity = Math.min(100, Math.round((uniqueWords.size / Math.max(1, outputWords.length)) * 100));
  const avgWordsPerSentence = outputWords.length / Math.max(1, splitSentences(paraphrasedText).length);
  const readabilityScore = Math.max(40, Math.min(95, Math.round(100 - avgWordsPerSentence * 1.8)));
  const similarity = calculateTextSimilarity(cleanInput, paraphrasedText);

  return {
    originalText: cleanInput,
    paraphrasedText,
    style,
    wordCountOriginal: originalWords.length,
    wordCountParaphrased: outputWords.length,
    readabilityScore,
    lexicalDiversity,
    changesCount: paraphrasedText === cleanInput ? 0 : 1,
    wordCountChange: outputWords.length - originalWords.length,
    sentenceStructureChange: Math.abs(splitSentences(paraphrasedText).length - sourceSentences.length),
    similarity
  };
}
