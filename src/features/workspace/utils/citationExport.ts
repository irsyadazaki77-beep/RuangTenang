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
  metadataProvenance: Partial<Record<'title' | 'authors' | 'year' | 'journal' | 'doi', 'parsed' | 'missing'>>;
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

function escapeBibTeX(value: string): string {
  return value.replace(/[{}]/g, '\\$&');
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
  const normalized = doiStr.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').trim().replace(/[.,;]+$/, '');
  return /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/i.test(normalized) ? normalized : undefined;
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
      metadataProvenance: { title: 'missing', authors: 'missing', year: 'missing', journal: 'missing', doi: 'missing' },
      raw: bibMatch[0]
    };

    // Ekstrak fields: author, title, journal, year, volume, number/issue, pages, doi, url
    const fieldRegex = /(\w+)\s*=\s*[{"]([^}"]*)[}"]/gi;
    let fieldMatch: RegExpExecArray | null;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const field = fieldMatch[1].toLowerCase();
      const value = fieldMatch[2].trim();

      if (field === 'title') { ref.title = value; ref.metadataProvenance.title = value ? 'parsed' : 'missing'; }
      else if (field === 'author') {
        ref.authors = value.split(/\s+and\s+/i).map(a => a.trim()).filter(Boolean);
        ref.metadataProvenance.authors = ref.authors.length ? 'parsed' : 'missing';
      } else if (field === 'year') { ref.year = value; ref.metadataProvenance.year = value ? 'parsed' : 'missing'; }
      else if (field === 'journal' || field === 'booktitle') { ref.journal = value; ref.metadataProvenance.journal = value ? 'parsed' : 'missing'; }
      else if (field === 'volume') ref.volume = value;
      else if (field === 'number' || field === 'issue') ref.issue = value;
      else if (field === 'pages') ref.pages = value;
      else if (field === 'doi') { ref.doi = cleanDOI(value); ref.metadataProvenance.doi = ref.doi ? 'parsed' : 'missing'; }
      else if (field === 'url') ref.url = value;
      else if (field === 'publisher') ref.publisher = value;
      else if (field === 'institution' || field === 'school') ref.institution = value;
    }

    results.push(ref);
  }

  if (foundBibtex && results.length > 0) {
    return results;
  }

  // 1b. Cek apakah teks mengandung struktur RIS (TY  - ... ER  -) dari Zotero / Mendeley / EndNote
  if (/^TY\s+-\s+/m.test(text)) {
    const risBlocks = text.split(/ER\s+-\s*$/m).map(b => b.trim()).filter(b => /TY\s+-\s+/i.test(b));
    risBlocks.forEach((block, idx) => {
      const lines = block.split(/\r?\n/);
      let risType = 'article';
      let citeKey = '';
      let title = '';
      const authors: string[] = [];
      let year = '';
      let journal = '';
      let volume = '';
      let issue = '';
      let sp = '';
      let ep = '';
      let doi: string | undefined;
      let url = '';
      let publisher = '';

      lines.forEach(line => {
        const match = line.match(/^([A-Z0-9]{2})\s+-\s+(.*)$/);
        if (!match) return;
        const tag = match[1].toUpperCase();
        const val = match[2].trim();
        if (!val) return;

        if (tag === 'TY') {
          if (val === 'BOOK') risType = 'book';
          else if (val === 'CONF' || val === 'CPAPER') risType = 'inproceedings';
          else if (val === 'THES') risType = 'phdthesis';
          else if (val === 'GEN') risType = 'misc';
          else risType = 'article';
        } else if (tag === 'ID') citeKey = val;
        else if (tag === 'TI' || tag === 'T1') title = title || val;
        else if (tag === 'AU' || tag === 'A1') authors.push(val);
        else if (tag === 'PY' || tag === 'Y1' || tag === 'DA') {
          const ym = val.match(/\b(\d{4})\b/);
          if (ym) year = ym[1];
        } else if (tag === 'JO' || tag === 'T2' || tag === 'JF') journal = journal || val;
        else if (tag === 'VL') volume = val;
        else if (tag === 'IS') issue = val;
        else if (tag === 'SP') sp = val;
        else if (tag === 'EP') ep = val;
        else if (tag === 'DO') doi = cleanDOI(val);
        else if (tag === 'UR') url = val;
        else if (tag === 'PB') publisher = val;
      });

      const pages = sp && ep ? `${sp}-${ep}` : sp || ep || undefined;
      if (!citeKey) {
        const firstAuthorLast = (authors[0] || 'ref').split(/[,\s]+/)[0].toLowerCase().replace(/[^\w]/g, '') || 'ref';
        citeKey = `${firstAuthorLast}${year || ''}_${idx + 1}`;
      }

      if (title || authors.length > 0 || doi) {
        results.push({
          id: `ref_ris_${Date.now()}_${idx + 1}`,
          type: risType,
          citeKey,
          title,
          authors,
          year,
          journal: journal || undefined,
          volume: volume || undefined,
          issue: issue || undefined,
          pages,
          doi,
          url: url || undefined,
          publisher: publisher || undefined,
          raw: `${block}\nER  -`,
          metadataProvenance: {
            title: title ? 'parsed' : 'missing',
            authors: authors.length ? 'parsed' : 'missing',
            year: year ? 'parsed' : 'missing',
            journal: journal ? 'parsed' : 'missing',
            doi: doi ? 'parsed' : 'missing'
          }
        });
      }
    });

    if (results.length > 0) {
      return results;
    }
  }

  // 2. Jika bukan BibTeX atau RIS, parsing baris per baris (APA, IEEE, Harvard, dsb.)
  const lines = text
    .split(/\n+/)
    .map(l => l.replace(/^[-*•\d+.\s[\]]+/, '').trim())
    .filter(l => l.length > 10);

  lines.forEach((line, idx) => {
    // Regex deteksi pola umum: Penulis (Tahun). Judul. Jurnal/Penerbit. DOI/URL
    const yearMatch = line.match(/\((\d{4}[a-z]?|n\.d\.)\)|(?:^|\s)(\d{4})(?:\.|,)/i);
    const matchedYear = yearMatch ? (yearMatch[1] || yearMatch[2]) : '';
    const year = /^n\.d\.$/i.test(matchedYear) ? '' : matchedYear;

    // Deteksi DOI atau URL
    const doiMatch = line.match(/(?:doi\.org\/|doi:\s*)(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i);
    const parsedDOI = doiMatch ? cleanDOI(doiMatch[1]) : undefined;
    const urlMatch = line.match(/https?:\/\/[^\s)]+/i);

    // Ambil perkiraan nama penulis & judul
    let authorsStr = '';
    let title = '';
    let journal = '';

    if (yearMatch && yearMatch.index !== undefined) {
      authorsStr = line.substring(0, yearMatch.index).trim().replace(/\.$/, '');
      const remainder = line.substring(yearMatch.index + yearMatch[0].length).replace(/^[\s.]+/, '').trim();
      const parts = remainder.split(/\.\s+/);
      if (parts.length > 0) {
        title = parts[0].replace(/^[:.\s]+/, '').trim();
        if (parts.length > 1) {
          journal = parts.slice(1).join('. ').trim();
        }
      }
    }

    const rawAuthors = authorsStr ? authorsStr.split(/\s*;\s*|\s+&\s+|\s+dan\s+/i).map(a => a.trim()).filter(Boolean) : [];
    const citeKeyBase = (rawAuthors[0] || 'ref').split(/\s+/).pop()?.toLowerCase().replace(/[^\w]/g, '') || 'ref';
    const citeKey = `${citeKeyBase}${year || ''}_${idx + 1}`;

    results.push({
      id: `ref_parsed_${idx + 1}`,
      type: 'misc',
      citeKey,
      title,
      authors: rawAuthors,
      year,
      journal: journal || undefined,
      doi: parsedDOI,
      url: urlMatch ? urlMatch[0] : undefined,
      raw: line,
      metadataProvenance: {
        title: title ? 'parsed' : 'missing',
        authors: rawAuthors.length ? 'parsed' : 'missing',
        year: year ? 'parsed' : 'missing',
        journal: journal ? 'parsed' : 'missing',
        doi: parsedDOI ? 'parsed' : 'missing'
      }
    });
  });

  return results;
}

/**
 * Menghasilkan teks format BibTeX (.bib) lengkap & valid
 */
export function generateBibTeX(content: string, _defaultTitle = 'Daftar Pustaka'): string {
  // Jika konten sudah valid BibTeX utuh, format dan bersihkan sedikit
  if (/@\w+\s*\{/i.test(content) && content.includes('}')) {
    return content.trim();
  }

  const refs = parseCitations(content);
  if (refs.length === 0) return '';

  return refs.map(ref => {
    const fields: string[] = [];

    if (ref.title) fields.push(`  title = {${escapeBibTeX(ref.title)}}`);
    if (ref.authors.length) fields.push(`  author = {${escapeBibTeX(ref.authors.join(' and '))}}`);
    if (ref.year) fields.push(`  year = {${escapeBibTeX(ref.year)}}`);

    if (ref.journal) fields.push(`  journal = {${escapeBibTeX(ref.journal)}}`);
    if (ref.volume) fields.push(`  volume = {${escapeBibTeX(ref.volume)}}`);
    if (ref.issue) fields.push(`  number = {${escapeBibTeX(ref.issue)}}`);
    if (ref.pages) fields.push(`  pages = {${escapeBibTeX(ref.pages)}}`);
    if (ref.doi) fields.push(`  doi = {${escapeBibTeX(ref.doi)}}`);
    if (ref.url) fields.push(`  url = {${escapeBibTeX(ref.url)}}`);
    if (ref.publisher) fields.push(`  publisher = {${escapeBibTeX(ref.publisher)}}`);
    if (ref.institution) fields.push(`  institution = {${escapeBibTeX(ref.institution)}}`);
    if (!ref.title && ref.raw) fields.push(`  note = {Original source text: ${escapeBibTeX(ref.raw)}}`);

    return `@${ref.type || 'article'}{${ref.citeKey},
${fields.join(',\n')}
}`;
  }).join('\n\n');
}

/**
 * Menghasilkan teks format RIS (.ris) untuk Zotero, Mendeley, EndNote
 */
export function generateRIS(content: string, _defaultTitle = 'Daftar Pustaka'): string {
  const refs = parseCitations(content);

  if (refs.length === 0) return '';

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
    if (ref.title) lines.push(`TI  - ${ref.title}`);

    if (ref.authors && ref.authors.length > 0) {
      ref.authors.forEach(auth => {
        lines.push(`AU  - ${auth}`);
      });
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
    if (!ref.title && ref.raw) lines.push(`N1  - Original source text: ${ref.raw}`);

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
    if (!ref.title) return ref.raw || '';
    const title = ref.title;
    if (!title) return '';
    const publication = [
      ref.journal ? `*${ref.journal}*` : '',
      ref.volume ? `*${ref.volume}*${ref.issue ? `(${ref.issue})` : ''}` : ref.issue ? `(${ref.issue})` : '',
      ref.pages ? ref.pages.replace(/--?/g, '–') : ''
    ].filter(Boolean).join(', ');
    const doi = ref.doi ? `https://doi.org/${ref.doi}` : (ref.url || '');
    return `${authors ? `${authors} ` : ''}${year}. ${title}.${publication ? ` ${publication}.` : ''}${doi ? ' ' + doi : ''}`.trim();
  }).filter(Boolean).join('\n\n');
}

/**
 * Format teks sitasi cepat ke IEEE
 */
export function formatAsIEEE(refs: ParsedReference[]): string {
  if (refs.length === 0) return '';
  return refs.map((ref, i) => {
    const authors = ref.authors.join(', ');
    if (!ref.title) return ref.raw || '';
    const title = `"${ref.title},"`;
    if (!title) return '';
    const publication = [
      ref.journal ? `*${ref.journal}*` : '',
      ref.volume ? `vol. ${ref.volume}` : '', ref.issue ? `no. ${ref.issue}` : '',
      ref.pages ? `pp. ${ref.pages.replace(/--?/g, '–')}` : '', ref.year
    ].filter(Boolean).join(', ');
    const doi = ref.doi ? ` doi: ${ref.doi}.` : (ref.url ? ` [Online]. Tersedia: ${ref.url}` : '');
    return `[${i + 1}] ${authors ? `${authors}, ` : ''}${title}${publication ? ` ${publication}.` : ''}${doi}`.trim();
  }).filter(Boolean).join('\n\n');
}

/**
 * Format teks sitasi cepat ke Harvard
 */
export function formatAsHarvard(refs: ParsedReference[]): string {
  if (refs.length === 0) return '';
  return refs.map(ref => {
    const authors = ref.authors.join(', ');
    const year = ref.year ? `${ref.year}.` : 'n.d.';
    if (!ref.title) return ref.raw || '';
    const titleValue = ref.title;
    const title = `'${titleValue}',`;
    const journal = ref.journal ? `*${ref.journal}*,` : '';
    const url = ref.url ? `Tersedia di: <${ref.url}>` : (ref.doi ? `https://doi.org/${ref.doi}` : '');
    return `${authors ? `${authors} ` : ''}${year} ${title} ${journal} ${url}`.trim();
  }).filter(Boolean).join('\n\n');
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
