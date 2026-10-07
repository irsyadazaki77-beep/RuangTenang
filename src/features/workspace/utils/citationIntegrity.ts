import type { FileSourceReference } from '../../../../shared/contracts/files';

export interface CitationIntegrityResult {
  content: string;
  validCitationIds: string[];
  removedUnknownCitationCount: number;
  unreferencedSentenceCount: number;
  verification: 'unverified';
}

/** Resolve only request-scoped retrieval IDs. This checks identity, not semantic support. */
export function validateResearchCitations(content: string, sources: FileSourceReference[]): CitationIntegrityResult {
  const allowed = new Set(sources.map(source => source.citationId).filter((id): id is string => Boolean(id)));
  const found = new Set<string>();
  let removedUnknownCitationCount = 0;
  const sanitized = content.replace(/\[cite:([A-Za-z0-9_-]+)\]/g, (marker, id: string) => {
    if (!allowed.has(id)) { removedUnknownCitationCount += 1; return '[referensi sumber tidak dikenali]'; }
    found.add(id);
    return marker;
  });
  const sentences = sanitized.split(/[.!?\n]+/).map(sentence => sentence.trim()).filter(sentence => sentence.length > 30);
  const unreferencedSentenceCount = sentences.filter(sentence => !/\[cite:[A-Za-z0-9_-]+\]/.test(sentence)).length;
  return { content: sanitized, validCitationIds: [...found], removedUnknownCitationCount, unreferencedSentenceCount, verification: 'unverified' };
}
