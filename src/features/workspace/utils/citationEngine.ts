/** Citation formatting and metadata lookup against Crossref's public API. */
export interface AcademicPaper {
  id: string;
  doi?: string;
  title: string;
  authors: string[];
  year: number;
  journal: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  abstract?: string;
  url?: string;
  citationCount?: number;
  source: 'crossref' | 'manual-doi';
  verified: boolean;
  retrievedAt?: string;
}

export type CitationFormat = 'APA7' | 'IEEE' | 'HARVARD' | 'BIBTEX';
export const DOI_REGEX = /\b(10\.\d{4,9}\/[-._;()/A-Za-z0-9]+)\b/i;
const CROSSREF_TIMEOUT_MS = 8_000;

export function normalizeDoi(value: string): string {
  return value.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').replace(/[.,;]+$/, '');
}

function textField(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) return value[0].trim();
  return undefined;
}

function validYear(value: unknown): number | undefined {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1000 && year <= new Date().getFullYear() + 1 ? year : undefined;
}

function parseCrossrefItem(item: any, retrievedAt: string): AcademicPaper | null {
  const doi = typeof item?.DOI === 'string' ? normalizeDoi(item.DOI) : '';
  const title = textField(item?.title);
  const journal = textField(item?.['container-title']) || textField(item?.publisher);
  const authors = Array.isArray(item?.author)
    ? item.author.map((author: any) => {
        const family = typeof author?.family === 'string' ? author.family.trim() : '';
        const given = typeof author?.given === 'string' ? author.given.trim() : '';
        if (family && given) return `${family}, ${given}`;
        return family || given || (typeof author?.name === 'string' ? author.name.trim() : '');
      }).filter(Boolean)
    : [];
  const dateParts = item?.['published-print']?.['date-parts']?.[0]
    || item?.['published-online']?.['date-parts']?.[0]
    || item?.created?.['date-parts']?.[0];
  const year = validYear(Array.isArray(dateParts) ? dateParts[0] : undefined);
  if (!/^10\.\d{4,9}\/.+/.test(doi) || !title || title.length < 3 || !authors.length || !year || !journal) return null;
  const url = typeof item.URL === 'string' && /^https?:\/\//i.test(item.URL) ? item.URL : `https://doi.org/${encodeURIComponent(doi)}`;
  return {
    id: `crossref:${doi.toLowerCase()}`, doi, title, authors, year, journal,
    volume: textField(item.volume), issue: textField(item.issue), pages: textField(item.page),
    publisher: textField(item.publisher),
    abstract: typeof item.abstract === 'string' ? item.abstract.replace(/<[^>]*>/g, '').trim() || undefined : undefined,
    url, citationCount: Number.isFinite(item['is-referenced-by-count']) ? item['is-referenced-by-count'] : undefined,
    source: 'crossref', verified: true, retrievedAt
  };
}

async function crossref(path: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CROSSREF_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.crossref.org/works/${path}`, {
      headers: { Accept: 'application/json' }, signal: controller.signal
    });
    if (!response.ok) return null;
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveDOI(doiString: string): Promise<AcademicPaper | null> {
  const doi = normalizeDoi(doiString);
  if (!/^10\.\d{4,9}\/[-._;()/A-Za-z0-9]+$/i.test(doi)) return null;
  try {
    const payload = await crossref(encodeURIComponent(doi));
    const item = payload?.message;
    const paper = parseCrossrefItem(item, new Date().toISOString());
    if (!paper || paper.doi?.toLowerCase() !== doi.toLowerCase()) return null;
    return paper;
  } catch {
    return null;
  }
}

export async function searchAcademicPapers(query: string): Promise<AcademicPaper[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const doiMatch = normalized.match(DOI_REGEX);
  if (doiMatch) {
    const paper = await resolveDOI(doiMatch[1]);
    return paper ? [paper] : [];
  }
  try {
    const payload = await crossref(`?query=${encodeURIComponent(normalized)}&rows=10`);
    const retrievedAt = new Date().toISOString();
    const items = Array.isArray(payload?.message?.items) ? payload.message.items : [];
    const unique = new Map<string, AcademicPaper>();
    for (const item of items) {
      const paper = parseCrossrefItem(item, retrievedAt);
      if (paper) unique.set(paper.doi!.toLowerCase(), paper);
    }
    return [...unique.values()];
  } catch {
    return [];
  }
}

export function formatAPA7(paper: AcademicPaper): string {
  const authors = formatAuthorsAPA(paper.authors);
  const volIssue = paper.volume ? (paper.issue ? `${paper.volume}(${paper.issue})` : paper.volume) : '';
  const pages = paper.pages ? `, ${paper.pages}` : '';
  const doi = paper.doi ? ` https://doi.org/${paper.doi}` : '';
  return `${authors} (${paper.year}). ${paper.title}. *${paper.journal}*${volIssue ? `, ${volIssue}` : ''}${pages}.${doi}`;
}

export function formatIEEE(paper: AcademicPaper, index = 1): string {
  const volume = paper.volume ? `, vol. ${paper.volume}` : '';
  const issue = paper.issue ? `, no. ${paper.issue}` : '';
  const pages = paper.pages ? `, pp. ${paper.pages}` : '';
  const doi = paper.doi ? `, doi: ${paper.doi}` : '';
  return `[${index}] ${paper.authors.join(', ')}, "${paper.title}," *${paper.journal}*${volume}${issue}${pages}, ${paper.year}${doi}.`;
}

export function formatHarvard(paper: AcademicPaper): string {
  const volIssue = paper.volume ? `, ${paper.volume}${paper.issue ? `(${paper.issue})` : ''}` : '';
  const pages = paper.pages ? `, pp. ${paper.pages}` : '';
  return `${paper.authors.join(' and ')} (${paper.year}) '${paper.title}', *${paper.journal}*${volIssue}${pages}.`;
}

export function formatBibTeX(paper: AcademicPaper): string {
  const firstAuthor = (paper.authors[0] || 'author').split(',')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const citeKey = `${firstAuthor}${paper.year}${paper.title.slice(0, 6).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  return `@article{${citeKey},\n  author = {${paper.authors.join(' and ')}},\n  title = {${paper.title}},\n  journal = {${paper.journal}},\n  year = {${paper.year}}${paper.doi ? `,\n  doi = {${paper.doi}}` : ''}\n}`;
}

function formatAuthorsAPA(authors: string[]): string {
  if (authors.length === 0) return 'Penulis tidak teridentifikasi';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  if (authors.length <= 20) return `${authors.slice(0, -1).join(', ')}, & ${authors[authors.length - 1]}`;
  return `${authors.slice(0, 19).join(', ')}, ... ${authors[authors.length - 1]}`;
}
