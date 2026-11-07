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

export interface InTextCitationMatch {
  raw: string;
  author: string;
  year: string;
  index: number;
}

export interface BibliographyEntryMatch {
  raw: string;
  author: string;
  year?: string;
  titleSnippet?: string;
}

export interface ThesisCitationAuditReport {
  healthScore: number; // 0 - 100
  totalInTextCitations: number;
  totalBibliographyEntries: number;
  matchedCitations: Array<{ author: string; year: string; inTextRaw: string; bibRaw: string }>;
  ghostReferences: BibliographyEntryMatch[]; // Listed in bibliography but never cited
  missingBibliography: InTextCitationMatch[]; // Cited in text but missing from bibliography
  hasBibliographySection: boolean;
  warnings: string[];
}

/**
 * Perform a rigorous bidirectional audit of citations in a thesis/article document.
 * Checks whether every in-text citation (e.g. APA 7th "(Santoso, 2023)") has a corresponding
 * entry in the Bibliography, and detects "Ghost References" (entries never cited).
 */
export function auditThesisCitations(content: string): ThesisCitationAuditReport {
  const warnings: string[] = [];
  if (!content || !content.trim()) {
    return {
      healthScore: 100,
      totalInTextCitations: 0,
      totalBibliographyEntries: 0,
      matchedCitations: [],
      ghostReferences: [],
      missingBibliography: [],
      hasBibliographySection: false,
      warnings: ['Dokumen kosong']
    };
  }

  // Split into body text and bibliography section
  const bibHeaderRegex = /(?:^|\n)(?:#{1,4}\s*(?:daftar\s+pustaka|referensi|references|rujukan)[\s\S]*)/i;
  const matchBib = content.match(bibHeaderRegex);

  let bodyText = content;
  let bibText = '';
  const hasBibliographySection = Boolean(matchBib);

  if (matchBib && matchBib.index !== undefined) {
    bodyText = content.slice(0, matchBib.index);
    bibText = content.slice(matchBib.index);
  } else {
    warnings.push('Bagian Daftar Pustaka belum ditemukan dalam dokumen.');
  }

  // 1. Extract In-Text Citations from body
  // Matches "(Author, Year)" or "(Author et al., Year)" or "(Author & Author, Year)"
  const inTextRegex = /\(([A-Z][A-Za-zÀ-ÿ\-']+(?:\s+(?:et\s+al\.|dan\s+[A-Z][A-Za-zÀ-ÿ\-']+|&\s+[A-Z][A-Za-zÀ-ÿ\-']+))?),\s*([12]\d{3}[a-z]?)\)/g;
  const inTextList: InTextCitationMatch[] = [];
  let m: RegExpExecArray | null;

  while ((m = inTextRegex.exec(bodyText)) !== null) {
    inTextList.push({
      raw: m[0],
      author: m[1].trim(),
      year: m[2].trim(),
      index: m.index
    });
  }

  // 2. Extract Bibliography Entries
  const bibEntries: BibliographyEntryMatch[] = [];
  if (bibText) {
    const lines = bibText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      // Ignore markdown headers
      if (/^#{1,6}\s+/.test(line)) continue;
      // Match typical APA entry: "Author, X. (Year). Title..."
      const authorYearMatch = line.match(/^([A-Z][A-Za-zÀ-ÿ\-'\s,.]+?)\s*\(([12]\d{3}[a-z]?)\)/);
      if (authorYearMatch) {
        bibEntries.push({
          raw: line,
          author: authorYearMatch[1].replace(/,\s*[A-Z].*$/, '').trim(), // get primary surname
          year: authorYearMatch[2].trim(),
          titleSnippet: line.slice(authorYearMatch[0].length).trim().slice(0, 50)
        });
      } else if (line.length > 25) {
        // Fallback for informal reference entry
        const genericAuthor = line.split(/[.,(]/)[0]?.trim();
        const genericYear = line.match(/\b([12]\d{3})\b/)?.[1];
        if (genericAuthor && genericAuthor.length > 2) {
          bibEntries.push({
            raw: line,
            author: genericAuthor,
            year: genericYear,
            titleSnippet: line.slice(0, 50)
          });
        }
      }
    }
  }

  // 3. Bidirectional Matching
  const matchedCitations: Array<{ author: string; year: string; inTextRaw: string; bibRaw: string }> = [];
  const missingBibliography: InTextCitationMatch[] = [];
  const matchedBibIndices = new Set<number>();

  const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const inText of inTextList) {
    const authorNorm = normalizeName(inText.author.split(/\s+/)[0]);
    let foundMatch = false;

    for (let i = 0; i < bibEntries.length; i++) {
      const bib = bibEntries[i];
      const bibAuthorNorm = normalizeName(bib.author.split(/\s+/)[0]);

      const isAuthorMatch = authorNorm.includes(bibAuthorNorm) || bibAuthorNorm.includes(authorNorm);
      const isYearMatch = !inText.year || !bib.year || inText.year.startsWith(bib.year.slice(0, 4));

      if (isAuthorMatch && isYearMatch) {
        matchedCitations.push({
          author: inText.author,
          year: inText.year,
          inTextRaw: inText.raw,
          bibRaw: bib.raw
        });
        matchedBibIndices.add(i);
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      missingBibliography.push(inText);
    }
  }

  // 4. Detect Ghost References (entries in bib never cited in body)
  const ghostReferences: BibliographyEntryMatch[] = [];
  bibEntries.forEach((bib, idx) => {
    if (!matchedBibIndices.has(idx)) {
      ghostReferences.push(bib);
    }
  });

  // 5. Calculate Health Score
  const totalItems = (inTextList.length + bibEntries.length) || 1;
  const issues = (missingBibliography.length * 1.5) + ghostReferences.length;
  const healthScore = Math.max(20, Math.min(100, Math.round(100 - (issues / totalItems * 100))));

  if (ghostReferences.length > 0) {
    warnings.push(`Ditemukan ${ghostReferences.length} rujukan di Daftar Pustaka yang tidak pernah dikutip dalam naskah (Ghost References).`);
  }
  if (missingBibliography.length > 0) {
    warnings.push(`Ditemukan ${missingBibliography.length} kutipan di dalam naskah yang belum terdaftar di Daftar Pustaka.`);
  }

  return {
    healthScore,
    totalInTextCitations: inTextList.length,
    totalBibliographyEntries: bibEntries.length,
    matchedCitations,
    ghostReferences,
    missingBibliography,
    hasBibliographySection,
    warnings
  };
}

/**
 * Appends a missing reference entry to the Bibliography section of a markdown document.
 * If no Bibliography section exists, creates one at the end.
 */
export function addBibliographyEntry(content: string, authorSurname: string, year: string, title = 'Judul Artikel / Buku', journal = 'Nama Publikasi Ilmiah'): string {
  const newEntry = `${authorSurname}, Inisial. (${year}). ${title}. *${journal}*, Volume(Nomor), Halaman. https://doi.org/10.xxxx/placeholder`;
  const bibHeaderRegex = /(?:^|\n)(#{1,4}\s*(?:daftar\s+pustaka|referensi|references|rujukan)[\s\S]*)/i;

  if (bibHeaderRegex.test(content)) {
    return content.trimEnd() + `\n${newEntry}\n`;
  } else {
    return content.trimEnd() + `\n\n### Daftar Pustaka\n${newEntry}\n`;
  }
}

/**
 * Removes a ghost reference line from the document's bibliography section.
 */
export function removeGhostReferenceLine(content: string, rawLine: string): string {
  return content
    .split(/\r?\n/)
    .filter(line => line.trim() !== rawLine.trim())
    .join('\n');
}

/**
 * Injects an in-text citation string at the current cursor position or appends it.
 */
export function injectCitationAtCursor(content: string, citationText: string, cursorOffset?: number): string {
  const insert = ` ${citationText} `;
  if (cursorOffset === undefined || cursorOffset < 0 || cursorOffset > content.length) {
    return content + insert;
  }
  return content.slice(0, cursorOffset) + insert + content.slice(cursorOffset);
}
