/**
 * Academic Citation Sentinel
 * 
 * Modul audit dan standarisasi integritas sitasi ilmiah untuk RuangTenang & RuangKerja.
 * Menegakkan standar APA 7th Edition, mencocokkan sitasi dalam teks (in-text citations)
 * dengan Daftar Pustaka, serta mencegah fabrikasi referensi akademik oleh AI.
 */

export interface DetectedCitation {
  raw: string;
  author: string;
  year: number;
  hasMatchingReference: boolean;
}

export interface CitationAuditResult {
  hasCitations: boolean;
  totalCitations: number;
  verifiedCount: number;
  unmatchedCitations: DetectedCitation[];
  hasReferenceSection: boolean;
  complianceScore: number; // 0 - 100
  notes: string[];
}

// Regex deteksi in-text citation gaya APA 7th (e.g. "Sugiyono (2019)", "(Santoso & Wijaya, 2021)", "(Vaswani et al., 2017)")
const IN_TEXT_PARENTHETICAL_REGEX = /\(([A-Z][a-zA-Z\s&.,]+?),\s*([12][0-9]{3})\)/g;
const IN_TEXT_NARRATIVE_REGEX = /\b([A-Z][a-zA-Z]+(?:\s+et\s+al\.)?)\s*\(([12][0-9]{3})\)/g;

export class AcademicCitationSentinel {
  /**
   * Menganalisis teks akademik dan memverifikasi konsistensi sitasi dengan daftar pustaka.
   */
  static auditText(text: string): CitationAuditResult {
    if (!text || typeof text !== 'string') {
      return {
        hasCitations: false,
        totalCitations: 0,
        verifiedCount: 0,
        unmatchedCitations: [],
        hasReferenceSection: false,
        complianceScore: 100,
        notes: ['Teks kosong atau bukan merupakan naskah ilmiah.']
      };
    }

    const hasReferenceSection = /\b(daftar pustaka|references|referensi|bibliografi)\b/i.test(text);
    const referencesText = hasReferenceSection
      ? text.slice(text.search(/\b(daftar pustaka|references|referensi|bibliografi)\b/i))
      : '';

    const detectedMap = new Map<string, DetectedCitation>();

    // 1. Scan Parenthetical citations: (Author, Year)
    let match: RegExpExecArray | null;
    IN_TEXT_PARENTHETICAL_REGEX.lastIndex = 0;
    while ((match = IN_TEXT_PARENTHETICAL_REGEX.exec(text)) !== null) {
      const raw = match[0];
      const author = match[1].replace(/\s+et\s+al\.?/i, '').trim();
      const year = parseInt(match[2], 10);
      const key = `${author.toLowerCase()}_${year}`;

      if (!detectedMap.has(key)) {
        const hasMatching = hasReferenceSection && Boolean(
          referencesText.toLowerCase().includes(author.toLowerCase()) &&
          referencesText.includes(match[2])
        );
        detectedMap.set(key, { raw, author, year, hasMatchingReference: hasMatching });
      }
    }

    // 2. Scan Narrative citations: Author (Year)
    IN_TEXT_NARRATIVE_REGEX.lastIndex = 0;
    while ((match = IN_TEXT_NARRATIVE_REGEX.exec(text)) !== null) {
      const raw = match[0];
      const author = match[1].replace(/\s+et\s+al\.?/i, '').trim();
      const year = parseInt(match[2], 10);
      const key = `${author.toLowerCase()}_${year}`;

      if (!detectedMap.has(key)) {
        const hasMatching = hasReferenceSection && Boolean(
          referencesText.toLowerCase().includes(author.toLowerCase()) &&
          referencesText.includes(match[2])
        );
        detectedMap.set(key, { raw, author, year, hasMatchingReference: hasMatching });
      }
    }

    const allCitations = Array.from(detectedMap.values());
    const unmatched = allCitations.filter(c => !c.hasMatchingReference);
    const verifiedCount = allCitations.length - unmatched.length;

    let score = 100;
    const notes: string[] = [];

    if (allCitations.length > 0) {
      if (!hasReferenceSection) {
        score = Math.max(30, 100 - allCitations.length * 15);
        notes.push('Ditemukan sitasi dalam teks, namun belum ada bagian "Daftar Pustaka" yang disertakan.');
      } else if (unmatched.length > 0) {
        const ratio = verifiedCount / allCitations.length;
        score = Math.round(ratio * 100);
        notes.push(`${unmatched.length} sitasi belum ditemukan di Daftar Pustaka: ${unmatched.map(u => u.raw).slice(0, 3).join(', ')}.`);
      } else {
        notes.push('Semua sitasi dalam teks sinkron 100% dengan bagian Daftar Pustaka.');
      }
    } else {
      notes.push('Tidak terdeteksi sitasi formal dalam naskah.');
    }

    return {
      hasCitations: allCitations.length > 0,
      totalCitations: allCitations.length,
      verifiedCount,
      unmatchedCitations: unmatched,
      hasReferenceSection,
      complianceScore: score,
      notes
    };
  }

  /**
   * Mengembalikan instruksi baku sitasi ilmiah untuk diinjeksi ke context builder.
   */
  static getAcademicPromptGuideline(): string {
    return `[PANDUAN INTEGRITAS AKADEMIK & SITASI APA 7th]:
1. Gunakan format sitasi APA 7th Edition: (NamaBelakang, Tahun) atau NamaBelakang (Tahun).
2. DILARANG membuat referensi fiktif/halusinasi. Rujuk hanya literatur yang mapan dan riil.
3. Jika menulis draf bab skripsi lengkap, pastikan setiap nama yang dikutip dalam teks memiliki entri Daftar Pustaka yang sesuai.`;
  }
}

export const academicCitationSentinel = AcademicCitationSentinel;
