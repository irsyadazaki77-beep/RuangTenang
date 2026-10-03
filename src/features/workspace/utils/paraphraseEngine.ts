/**
 * Meaning-preserving academic text assistant.
 * The local engine deliberately avoids lexical substitutions: wording changes
 * can alter scientific claims, so the safe modes retain source sentences.
 */

export type ParaphraseStyle = 'KONSERVATIF' | 'RESTRUKTURISASI' | 'SINTESIS';

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
}

function splitSentences(text: string): string[] {
  const placeholder = '__ACADEMIC_PARAPHRASE_PERIOD__';
  const protectedPeriods = text
    .replace(/\b(?:Dr|Prof|No|Vol|Fig|et al)\./gi, token => token.replace(/\./g, placeholder))
    .replace(/\b([A-Z])\.\s+(?=[A-Z][a-z])/g, `$1${placeholder} `);
  return protectedPeriods.split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.replaceAll(placeholder, '.').trim()).filter(Boolean);
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
    return { originalText: '', paraphrasedText: '', style, wordCountOriginal: 0, wordCountParaphrased: 0, readabilityScore: 0, lexicalDiversity: 0, changesCount: 0, wordCountChange: 0, sentenceStructureChange: 0 };
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
    sentenceStructureChange: Math.abs(splitSentences(paraphrasedText).length - sourceSentences.length)
  };
}
