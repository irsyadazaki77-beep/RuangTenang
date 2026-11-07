import { WorkspaceChapterScope } from '../types';

export interface InTextCitationMatch {
  raw: string;
  author: string;
  year: string;
  index: number;
}

export interface InTextCitationAuditResult {
  inTextCitations: InTextCitationMatch[];
  uniqueAuthors: string[];
  hasBibliographySection: boolean;
  bibliographyEntriesCount: number;
  matchedCount: number;
  unmatchedInText: string[];
  suggestions: string[];
}

export interface ChapterCoherenceIssue {
  chapter: WorkspaceChapterScope | string;
  type: 'QUESTION_GAP' | 'METHOD_MISMATCH' | 'ORPHAN_FINDING' | 'SUMMARY_DISCREPANCY';
  severity: 'WARNING' | 'SUGGESTION' | 'CRITICAL';
  title: string;
  description: string;
  recommendation: string;
}

export interface ChapterCoherenceAuditResult {
  coherenceScore: number; // 0 - 100
  overallAssessment: string;
  chapterCoverage: Record<string, boolean>;
  issues: ChapterCoherenceIssue[];
}

/**
 * 1. Audit Sitasi In-Text vs Daftar Pustaka
 * Memindai kutipan dalam kurung seperti (Santoso, 2024), Santoso et al. (2023), atau [1]
 * dan membandingkannya dengan entri pada bagian ## Daftar Pustaka / References.
 */
export function auditInTextCitations(markdown: string): InTextCitationAuditResult {
  if (!markdown || !markdown.trim()) {
    return {
      inTextCitations: [],
      uniqueAuthors: [],
      hasBibliographySection: false,
      bibliographyEntriesCount: 0,
      matchedCount: 0,
      unmatchedInText: [],
      suggestions: ['Naskah dokumen masih kosong. Masukkan isi draf untuk memvalidasi sitasi.']
    };
  }

  // Pisahkan body naskah dengan bagian Daftar Pustaka
  const bibHeadingRegex = /(?:^|\n)#{1,3}\s*(?:Daftar\s+Pustaka|Referensi|References|Bibliografi)\b[\s\S]*$/i;
  const bibMatch = markdown.match(bibHeadingRegex);

  const bodyText = bibMatch ? markdown.slice(0, bibMatch.index) : markdown;
  const bibSection = bibMatch ? bibMatch[0] : '';
  const hasBibliographySection = bibMatch !== null;

  // Deteksi sitasi gaya Harvard / APA: (Nama, Tahun) atau Nama (Tahun) atau (Nama et al., Tahun)
  // Contoh: (Prasetyo & Wibowo, 2023), (Smith et al., 2021b), Rahardjo (2020)
  const apaRegex = /\b([A-Z][a-zA-Z\u00C0-\u017F'-]+(?:\s+(?:et\s+al\.|&\s+[A-Z][a-zA-Z\u00C0-\u017F'-]+|dan\s+[A-Z][a-zA-Z\u00C0-\u017F'-]+))?)\s*(?:\((?:tahun\s*)?(\d{4}[a-z]?)\)|,\s*(\d{4}[a-z]?)\))/g;

  // Deteksi sitasi numerik IEEE: [1], [2, 3], [4-6]
  const ieeeRegex = /\[(\d+(?:\s*[,-]\s*\d+)*)\]/g;

  const inTextCitations: InTextCitationMatch[] = [];
  const authorSet = new Set<string>();

  let match: RegExpExecArray | null;

  // Scan APA/Harvard style
  while ((match = apaRegex.exec(bodyText)) !== null) {
    const raw = match[0];
    const author = match[1].trim();
    const year = (match[2] || match[3] || '').trim();

    // Saring false positive dari istilah umum yang diawali kapital
    const lowerAuthor = author.toLowerCase();
    if (['gambar', 'tabel', 'grafik', 'lampiran', 'bab', 'pasal', 'undang-undang'].includes(lowerAuthor)) {
      continue;
    }

    inTextCitations.push({
      raw,
      author,
      year,
      index: match.index
    });
    authorSet.add(author);
  }

  // Scan IEEE style
  while ((match = ieeeRegex.exec(bodyText)) !== null) {
    const raw = match[0];
    inTextCitations.push({
      raw,
      author: raw,
      year: '',
      index: match.index
    });
    authorSet.add(raw);
  }

  // Hitung jumlah entri di daftar pustaka
  let bibliographyEntriesCount = 0;
  if (hasBibliographySection) {
    const bibLines = bibSection
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 10 && !l.startsWith('#'));
    bibliographyEntriesCount = bibLines.length;
  }

  // Periksa apakah penulis/kode in-text ditemukan di teks daftar pustaka
  const unmatchedInText: string[] = [];
  const uniqueAuthors = Array.from(authorSet);

  if (hasBibliographySection) {
    const bibLower = bibSection.toLowerCase();
    for (const author of uniqueAuthors) {
      // Ambil nama keluarga/kata pertama dari author untuk dicocokkan
      const primarySurname = author.split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (primarySurname.length > 2 && !bibLower.includes(primarySurname)) {
        unmatchedInText.push(author);
      }
    }
  } else {
    unmatchedInText.push(...uniqueAuthors);
  }

  const matchedCount = uniqueAuthors.length - unmatchedInText.length;
  const suggestions: string[] = [];

  if (!hasBibliographySection) {
    suggestions.push('Bagian "## Daftar Pustaka" belum ditemukan di akhir dokumen. Tambahkan sub-bab Daftar Pustaka.');
  }

  if (unmatchedInText.length > 0) {
    suggestions.push(
      `Ditemukan ${unmatchedInText.length} kutipan di naskah yang belum tercantum di Daftar Pustaka: ${unmatchedInText.slice(0, 3).join(', ')}${unmatchedInText.length > 3 ? ', dkk.' : ''}. Gunakan Crossref Search untuk melengkapinya.`
    );
  }

  if (hasBibliographySection && bibliographyEntriesCount > 0 && uniqueAuthors.length === 0) {
    suggestions.push('Daftar Pustaka sudah ada, namun belum ada sitasi in-text yang terdeteksi di dalam paragraf naskah.');
  }

  if (matchedCount > 0 && unmatchedInText.length === 0) {
    suggestions.push('Semua sitasi in-text terverifikasi konsisten dengan entri pada Daftar Pustaka.');
  }

  return {
    inTextCitations,
    uniqueAuthors,
    hasBibliographySection,
    bibliographyEntriesCount,
    matchedCount,
    unmatchedInText,
    suggestions
  };
}

/**
 * 2. Audit Konsistensi Antar-Bab Skripsi (Cross-Chapter Coherence)
 * Mengevaluasi kesinambungan rumusan masalah, metodologi, dan pembahasan.
 */
export function auditChapterCoherence(
  content: string,
  _currentChapterScope?: WorkspaceChapterScope
): ChapterCoherenceAuditResult {
  const issues: ChapterCoherenceIssue[] = [];
  const chapterCoverage: Record<string, boolean> = {
    BAB_1: /bab\s*(?:1|i)\b|pendahuluan/i.test(content),
    BAB_2: /bab\s*(?:2|ii)\b|tinjauan\s*pustaka|landasan\s*teori/i.test(content),
    BAB_3: /bab\s*(?:3|iii)\b|metode|metodologi/i.test(content),
    BAB_4: /bab\s*(?:4|iv)\b|hasil\s*(?:dan|&)?\s*pembahasan/i.test(content),
    BAB_5: /bab\s*(?:5|v)\b|kesimpulan|penutup/i.test(content)
  };

  // Rule 1: Periksa ketersediaan rumusan masalah / pertanyaan penelitian
  const hasResearchQuestions = /(?:rumusan\s*masalah|pertanyaan\s*penelitian|\bRQ\d*)/i.test(content);
  const hasConclusions = /kesimpulan|implikasi|simpulan/i.test(content);
  const hasMethodology = /populasi|sampel|kuesioner|metode\s*pengumpulan|analisis\s*data|algoritma|perancangan/i.test(content);

  if (chapterCoverage.BAB_1 && !hasResearchQuestions) {
    issues.push({
      chapter: 'BAB_1',
      type: 'QUESTION_GAP',
      severity: 'WARNING',
      title: 'Rumusan Masalah Belum Ditemukan',
      description: 'Bab 1 memuat pendahuluan namun tidak memiliki sub-bab atau butir rumusan masalah/pertanyaan penelitian yang eksplisit.',
      recommendation: 'Tambahkan sub-bab "1.2 Rumusan Masalah" dengan 2-3 poin pertanyaan yang terarah dan terukur.'
    });
  }

  if (chapterCoverage.BAB_3 && !hasMethodology) {
    issues.push({
      chapter: 'BAB_3',
      type: 'METHOD_MISMATCH',
      severity: 'SUGGESTION',
      title: 'Spesifikasi Metodologi Kurang Terperinci',
      description: 'Bab 3 belum mendefinisikan instrumen, populasi/sampel, atau tahapan perancangan secara eksplisit.',
      recommendation: 'Lengkapi metodologi dengan rincian teknik pengumpulan data, parameter instrumen, atau tahapan SDLC/eksperimen.'
    });
  }

  if (chapterCoverage.BAB_5 && hasResearchQuestions && !hasConclusions) {
    issues.push({
      chapter: 'BAB_5',
      type: 'SUMMARY_DISCREPANCY',
      severity: 'CRITICAL',
      title: 'Kesimpulan Belum Menjawab Rumusan Masalah',
      description: 'Bab 5 wajib merangkum temuan yang secara langsung menjawab setiap poin rumusan masalah di Bab 1.',
      recommendation: 'Petakan kesimpulan Anda menjadi butir-butir yang paralel langsung dengan pertanyaan di Rumusan Masalah Bab 1.'
    });
  }

  // Hitung Skor Koherensi
  let coherenceScore = 100;
  for (const issue of issues) {
    if (issue.severity === 'CRITICAL') coherenceScore -= 30;
    else if (issue.severity === 'WARNING') coherenceScore -= 15;
    else if (issue.severity === 'SUGGESTION') coherenceScore -= 5;
  }
  coherenceScore = Math.max(20, Math.min(100, coherenceScore));

  let overallAssessment = 'Struktur naskah cukup solid dan menunjukkan alur logis yang jelas.';
  if (coherenceScore < 60) {
    overallAssessment = 'Terdapat diskoneksi penting antara perumusan masalah, metode, atau simpulan akhir yang perlu diperbaiki.';
  } else if (coherenceScore < 85) {
    overallAssessment = 'Struktur bab sudah baik, tetapi beberapa bagian membutuhkan sinkronisasi variabel dan argumentasi yang lebih ketat.';
  }

  return {
    coherenceScore,
    overallAssessment,
    chapterCoverage,
    issues
  };
}

/**
 * 3. Pembuat Matriks Literatur Riset (Literature Synthesis Matrix)
 * Menghasilkan tabel komparasi standar akademik Markdown yang dapat diedit langsung di Canvas.
 */
export function generateLiteratureMatrixTemplate(
  entries?: Array<{
    authorYear?: string;
    title?: string;
    method?: string;
    findings?: string;
    researchGap?: string;
  }>
): string {
  const defaultEntries = entries && entries.length > 0 ? entries : [
    {
      authorYear: 'Santoso & Pratama (2023)',
      title: 'Penerapan Model Transformer untuk Klasifikasi Teks Akademik',
      method: 'Eksperimen Kuantitatif (Dataset 10.000 abstrak)',
      findings: 'Akurasi mencapai 94.2%, F1-Score unggul dibanding baseline CNN',
      researchGap: 'Belum diuji pada dataset multi-bahasa daerah Indonesia'
    },
    {
      authorYear: 'Wijaya et al. (2024)',
      title: 'Analisis Sentimen Evaluasi Pembelajaran Menggunakan Fine-Tuned LLM',
      method: 'Studi Komparasi (3 Arsitektur Model AI)',
      findings: 'Model parameter 7B memberikan trade-off latensi dan akurasi paling optimal',
      researchGap: 'Keterbatasan inferensi perangkat keras lokal berdaya rendah'
    },
    {
      authorYear: 'Handayani (2022)',
      title: 'Efektivitas Intervensi Self-Care Digital pada Mahasiswa Tingkat Akhir',
      method: 'Quasi-Experimental Pre-test Post-test Control Group',
      findings: 'Penurunan tingkat kecemasan akademik secara signifikan (p < 0.01)',
      researchGap: 'Periode observasi tindak lanjut terbatas pada 4 minggu'
    }
  ];

  let md = '# Matriks Sintesis Literatur Penelitian\n\n';
  md += '> Matriks ini memetakan perbandingan studi terdahulu untuk mengidentifikasi *State-of-the-Art* dan *Research Gap* tugas akhir Anda.\n\n';
  md += '| No | Penulis & Tahun | Judul Penelitian | Metodologi & Sampel | Temuan Utama | Research Gap / Keterbatasan |\n';
  md += '|---|---|---|---|---|---|\n';

  defaultEntries.forEach((e, idx) => {
    md += `| ${idx + 1} | ${e.authorYear || '-'} | ${e.title || '-'} | ${e.method || '-'} | ${e.findings || '-'} | ${e.researchGap || '-'} |\n`;
  });

  md += '\n## 🔍 Sintesis & Posisi Penelitian Ini\n';
  md += '- **Kesamaan Temuan:** Sebagian besar studi sepakat bahwa pendekatan terarah meningkatkan akurasi dan efisiensi intervensi.\n';
  md += '- **Kesenjangan (Research Gap) yang Diisi:** Penelitian ini melengkapi keterbatasan studi terdahulu dengan mengintegrasikan sistem real-time terdistribusi pada perangkat lokal.\n';

  return md;
}
