/**
 * Utilitas Parser & Generator Ekspor Sitasi Ilmiah (.bib & .ris)
 * Mendukung integrasi dengan Zotero, Mendeley, EndNote, serta konversi APA 7th, IEEE, dan Harvard.
 */

export interface ParsedReference {
  id: string;
  type: string; // 'article' | 'book' | 'inproceedings' | 'phdthesis' | 'misc'
  citeKey: string;
  title: string;
  authors: string[];
  year: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  institution?: string;
  raw?: string;
}

/**
 * Membersihkan nama file dari karakter terlarang
 */
function sanitizeFilename(title: string, ext: string): string {
  const clean = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
  return `${clean || 'daftar-pustaka'}.${ext}`;
}

/**
 * Mengunduh string sebagai file di peramban
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Membersihkan dan menstandarkan string DOI
 */
export function cleanDOI(doiStr?: string): string | undefined {
  if (!doiStr) return undefined;
  return doiStr.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').trim();
}

/**
 * Mengekstrak referensi dari blok teks BibTeX atau daftar teks sitasi standar
 */
export function parseCitations(rawText: string): ParsedReference[] {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.trim();
  const results: ParsedReference[] = [];

  // 1. Cek apakah teks mengandung struktur BibTeX (@article, @book, @inproceedings, @misc, dll.)
  const bibtexRegex = /@(\w+)\s*\{\s*([^,]+),\s*([\s\S]*?)\n\}/gi;
  let bibMatch: RegExpExecArray | null;
  let foundBibtex = false;

  while ((bibMatch = bibtexRegex.exec(text)) !== null) {
    foundBibtex = true;
    const entryType = bibMatch[1].toLowerCase();
    const citeKey = bibMatch[2].trim();
    const body = bibMatch[3];

    const ref: ParsedReference = {
      id: `ref_${Date.now()}_${results.length + 1}`,
      type: entryType,
      citeKey,
      title: '',
      authors: [],
      year: '',
      raw: bibMatch[0]
    };

    // Ekstrak fields: author, title, journal, year, volume, number/issue, pages, doi, url
    const fieldRegex = /(\w+)\s*=\s*[{"]([^}"]*)[}"]/gi;
    let fieldMatch: RegExpExecArray | null;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const field = fieldMatch[1].toLowerCase();
      const value = fieldMatch[2].trim();

      if (field === 'title') ref.title = value;
      else if (field === 'author') {
        ref.authors = value.split(/\s+and\s+/i).map(a => a.trim()).filter(Boolean);
      } else if (field === 'year') ref.year = value;
      else if (field === 'journal' || field === 'booktitle') ref.journal = value;
      else if (field === 'volume') ref.volume = value;
      else if (field === 'number' || field === 'issue') ref.issue = value;
      else if (field === 'pages') ref.pages = value;
      else if (field === 'doi') ref.doi = cleanDOI(value);
      else if (field === 'url') ref.url = value;
      else if (field === 'publisher') ref.publisher = value;
      else if (field === 'institution' || field === 'school') ref.institution = value;
    }

    if (!ref.title) ref.title = citeKey;
    results.push(ref);
  }

  if (foundBibtex && results.length > 0) {
    return results;
  }

  // 2. Jika bukan BibTeX, parsing baris per baris (APA, IEEE, Harvard, dsb.)
  const lines = text
    .split(/\n+/)
    .map(l => l.replace(/^[-*•\d+.\s[\]]+/, '').trim())
    .filter(l => l.length > 10);

  lines.forEach((line, idx) => {
    // Regex deteksi pola umum: Penulis (Tahun). Judul. Jurnal/Penerbit. DOI/URL
    const yearMatch = line.match(/\((\d{4}[a-z]?)\)|(?:^|\s)(\d{4})(?:\.|,)/);
    const year = yearMatch ? (yearMatch[1] || yearMatch[2]) : new Date().getFullYear().toString();

    // Deteksi DOI atau URL
    const doiMatch = line.match(/(?:doi\.org\/|doi:\s*)(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i);
    const urlMatch = line.match(/https?:\/\/[^\s)]+/i);

    // Ambil perkiraan nama penulis & judul
    let authorsStr = '';
    let title = line;
    let journal = '';

    if (yearMatch && yearMatch.index !== undefined) {
      authorsStr = line.substring(0, yearMatch.index).trim().replace(/\.$/, '');
      const remainder = line.substring(yearMatch.index + yearMatch[0].length).trim();
      const parts = remainder.split(/\.\s+/);
      if (parts.length > 0) {
        title = parts[0].replace(/^[:.\s]+/, '').trim();
        if (parts.length > 1) {
          journal = parts.slice(1).join('. ').trim();
        }
      }
    }

    const rawAuthors = authorsStr ? authorsStr.split(/,|&| dan /i).map(a => a.trim()).filter(Boolean) : ['Penulis'];
    const citeKeyBase = (rawAuthors[0] || 'referensi').split(/\s+/).pop()?.toLowerCase().replace(/[^\w]/g, '') || 'ref';
    const citeKey = `${citeKeyBase}${year}_${idx + 1}`;

    results.push({
      id: `ref_parsed_${idx + 1}`,
      type: 'article',
      citeKey,
      title: title || `Sitasi Ilmiah ${idx + 1}`,
      authors: rawAuthors.length ? rawAuthors : ['Penulis'],
      year,
      journal: journal || undefined,
      doi: doiMatch ? cleanDOI(doiMatch[1]) : undefined,
      url: urlMatch ? urlMatch[0] : undefined,
      raw: line
    });
  });

  return results;
}

/**
 * Menghasilkan teks format BibTeX (.bib) lengkap & valid
 */
export function generateBibTeX(content: string, defaultTitle = 'Daftar Pustaka'): string {
  // Jika konten sudah valid BibTeX utuh, format dan bersihkan sedikit
  if (/@\w+\s*\{/i.test(content) && content.includes('}')) {
    return content.trim();
  }

  const refs = parseCitations(content);
  if (refs.length === 0) {
    const safeKey = defaultTitle.toLowerCase().replace(/[^\w]/g, '') || 'ruangkerja';
    return `@misc{${safeKey}_${new Date().getFullYear()},
  title = {${defaultTitle}},
  author = {RuangKerja Mahasiswa},
  year = {${new Date().getFullYear()}},
  note = {Disusun melalui Asisten RuangKerja RuangTenang}
}`;
  }

  return refs.map(ref => {
    const authorStr = ref.authors.length > 0 ? ref.authors.join(' and ') : 'Anonim';
    const fields: string[] = [
      `  title = {${ref.title}}`,
      `  author = {${authorStr}}`,
      `  year = {${ref.year || new Date().getFullYear()}}`
    ];

    if (ref.journal) fields.push(`  journal = {${ref.journal}}`);
    if (ref.volume) fields.push(`  volume = {${ref.volume}}`);
    if (ref.issue) fields.push(`  number = {${ref.issue}}`);
    if (ref.pages) fields.push(`  pages = {${ref.pages}}`);
    if (ref.doi) fields.push(`  doi = {${ref.doi}}`);
    if (ref.url) fields.push(`  url = {${ref.url}}`);
    if (ref.publisher) fields.push(`  publisher = {${ref.publisher}}`);
    if (ref.institution) fields.push(`  institution = {${ref.institution}}`);

    return `@${ref.type || 'article'}{${ref.citeKey},
${fields.join(',\n')}
}`;
  }).join('\n\n');
}

/**
 * Menghasilkan teks format RIS (.ris) untuk Zotero, Mendeley, EndNote
 */
export function generateRIS(content: string, defaultTitle = 'Daftar Pustaka'): string {
  const refs = parseCitations(content);

  if (refs.length === 0) {
    return `TY  - GEN
TI  - ${defaultTitle}
AU  - RuangKerja Mahasiswa
PY  - ${new Date().getFullYear()}
N1  - Disusun via RuangKerja RuangTenang
ER  - `;
  }

  return refs.map(ref => {
    const lines: string[] = [];
    
    // Tag Tipe Dokumen RIS
    let risType = 'JOUR';
    if (ref.type === 'book') risType = 'BOOK';
    else if (ref.type === 'inproceedings') risType = 'CONF';
    else if (ref.type === 'phdthesis' || ref.type === 'thesis') risType = 'THES';
    else if (ref.type === 'misc') risType = 'GEN';

    lines.push(`TY  - ${risType}`);
    lines.push(`ID  - ${ref.citeKey}`);
    lines.push(`TI  - ${ref.title}`);

    if (ref.authors && ref.authors.length > 0) {
      ref.authors.forEach(auth => {
        lines.push(`AU  - ${auth}`);
      });
    } else {
      lines.push(`AU  - Anonim`);
    }

    if (ref.year) lines.push(`PY  - ${ref.year}`);
    if (ref.journal) lines.push(`JO  - ${ref.journal}`);
    if (ref.volume) lines.push(`VL  - ${ref.volume}`);
    if (ref.issue) lines.push(`IS  - ${ref.issue}`);
    
    if (ref.pages) {
      const parts = ref.pages.split(/[-–—]+/);
      if (parts[0]) lines.push(`SP  - ${parts[0].trim()}`);
      if (parts[1]) lines.push(`EP  - ${parts[1].trim()}`);
    }

    if (ref.doi) lines.push(`DO  - ${ref.doi}`);
    if (ref.url) lines.push(`UR  - ${ref.url}`);
    if (ref.publisher) lines.push(`PB  - ${ref.publisher}`);
    if (ref.institution) lines.push(`PB  - ${ref.institution}`);

    lines.push(`ER  - `);
    return lines.join('\n');
  }).join('\n\n');
}

/**
 * Format teks sitasi cepat ke APA 7th
 */
export function formatAsAPA7(refs: ParsedReference[]): string {
  if (refs.length === 0) return '';
  return refs.map(ref => {
    const authors = ref.authors.join(', ');
    const year = ref.year ? `(${ref.year})` : '(n.d.)';
    const title = ref.title;
    const journal = ref.journal ? `*${ref.journal}*` : '';
    const doi = ref.doi ? `https://doi.org/${ref.doi}` : (ref.url || '');
    return `${authors} ${year}. ${title}. ${journal}${doi ? ' ' + doi : ''}`.trim();
  }).join('\n\n');
}

/**
 * Format teks sitasi cepat ke IEEE
 */
export function formatAsIEEE(refs: ParsedReference[]): string {
  if (refs.length === 0) return '';
  return refs.map((ref, i) => {
    const authors = ref.authors.join(', ');
    const title = `"${ref.title},"`;
    const journal = ref.journal ? `*${ref.journal}*,` : '';
    const year = ref.year ? ` ${ref.year}.` : '.';
    const doi = ref.doi ? ` doi: ${ref.doi}.` : (ref.url ? ` [Online]. Tersedia: ${ref.url}` : '');
    return `[${i + 1}] ${authors}, ${title} ${journal}${year}${doi}`.trim();
  }).join('\n\n');
}

/**
 * Format teks sitasi cepat ke Harvard
 */
export function formatAsHarvard(refs: ParsedReference[]): string {
  if (refs.length === 0) return '';
  return refs.map(ref => {
    const authors = ref.authors.join(', ');
    const year = ref.year ? `${ref.year}.` : 'n.d.';
    const title = `'${ref.title}',`;
    const journal = ref.journal ? `*${ref.journal}*,` : '';
    const url = ref.url ? `Tersedia di: <${ref.url}>` : (ref.doi ? `https://doi.org/${ref.doi}` : '');
    return `${authors} ${year} ${title} ${journal} ${url}`.trim();
  }).join('\n\n');
}

/**
 * Eksekusi unduhan file BibTeX (.bib)
 */
export function downloadBibTeXFile(content: string, title = 'daftar-pustaka'): void {
  const bibData = generateBibTeX(content, title);
  const filename = sanitizeFilename(title, 'bib');
  triggerFileDownload(bibData, filename, 'application/x-bibtex');
}

/**
 * Eksekusi unduhan file RIS (.ris) untuk Zotero / Mendeley / EndNote
 */
export function downloadRISFile(content: string, title = 'daftar-pustaka'): void {
  const risData = generateRIS(content, title);
  const filename = sanitizeFilename(title, 'ris');
  triggerFileDownload(risData, filename, 'application/x-research-info-systems');
}
