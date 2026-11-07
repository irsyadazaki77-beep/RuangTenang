import { geminiContextCacheService } from '../ai/geminiContextCacheService.js';
import { aiRequestService } from '../ai/aiRequestService.js';
import { DEFAULT_AI_MODEL_ID } from '../ai/aiModelRegistry.js';
import { scanAndSanitizePII } from '../piiService.js';
import { detectPromptInjection } from '../../security.js';

export interface LiteratureDocument {
  id: string;
  filename: string;
  text: string;
}

export interface LiteratureMatrixRow {
  sourceId: string;
  citation: string;
  variables: string;
  methodology: string;
  findings: string;
  limitations: string;
  gapContribution: string;
}

export interface LiteratureSynthesisResult {
  markdownTable: string;
  narrativeDraft: string;
  artifactMarkdown: string;
  rows: LiteratureMatrixRow[];
  totalPapers: number;
  cachedContentUsed?: string;
  isExplicitCached: boolean;
}

export const literatureMatrixService = {
  /**
   * Synthesizes 2 to 5 academic documents into a comparative literature review matrix
   * and thesis Chapter 2 (Bab 2) narrative draft.
   */
  async synthesizeMatrix(params: {
    userId?: string;
    userTier?: string;
    topicOrFocus?: string;
    documents: LiteratureDocument[];
    abortSignal?: AbortSignal;
  }): Promise<LiteratureSynthesisResult> {
    const { userId, userTier = 'Free', topicOrFocus = '', documents, abortSignal } = params;

    if (!documents || documents.length === 0) {
      throw new Error('MINIMUM_ONE_DOCUMENT_REQUIRED');
    }

    // 1. Sanitize text inputs & verify injection safety
    const sanitizedDocs = documents.slice(0, 5).map((doc, idx) => {
      const cleanText = scanAndSanitizePII(doc.text.slice(0, 50_000)).sanitizedText;
      if (detectPromptInjection(cleanText)) {
        throw new Error(`PROMPT_INJECTION_IN_DOC_${idx + 1}`);
      }
      return {
        id: doc.id || `SRC_${idx + 1}`,
        filename: doc.filename,
        text: cleanText
      };
    });

    // 2. Leverage Gemini Context Caching if documents bundle >= 32k tokens
    const cacheResult = await geminiContextCacheService.getOrCreateCache({
      documents: sanitizedDocs,
      modelId: DEFAULT_AI_MODEL_ID,
      ttlSeconds: 1800
    });

    // 3. Build synthesis prompt
    const docSummaries = sanitizedDocs
      .map((d, i) => `=== [cite:SRC_${i + 1}] BERKAS: ${d.filename} ===\n${d.text.slice(0, 12_000)}`)
      .join('\n\n');

    const prompt = `Bertindaklah sebagai Analis Literatur Ilmiah dan Dosen Pembimbing Skripsi untuk mahasiswa Indonesia.
Tugasmu: Bedah dan bandingkan ${sanitizedDocs.length} artikel ilmiah berikut untuk Bab 2 (Kajian Penelitian Terdahulu / Tinjauan Pustaka).
${topicOrFocus ? `Fokus / Topik Skripsi Mahasiswa: "${topicOrFocus}"` : ''}

Dokumen Sumber:
${docSummaries}

INSTRUKSI OUTPUT WAJIB:
Sajikan keluaran dalam 3 bagian terstruktur:
1. Ringkasan Eksekutif & Peta Persamaan/Perbedaan Riset (1-2 paragraf singkat).
2. Tabel Matriks Komparatif Markdown dengan kolom:
| No | Peneliti & Tahun [Sitasi] | Variabel / Fokus Penelitian | Metodologi & Sampel | Temuan Kunci Empiris | Keterbatasan & Research Gap | Relevansi dengan Skripsi |
(Gunakan marker [cite:SRC_N] pada setiap baris sesuai sumber).
3. Template Narasi Paragraf Bab 2 Skripsi siap pakai yang menghubungkan temuan penelitian-penelitian di atas dengan riset mahasiswa.`;

    const systemInstruction = `[CONTEXT_BOUNDARIES]
Kamu adalah AI Spesialis Tinjauan Pustaka & Metodologi Skripsi Mahasiswa.
Prinsip Etika & Akademik:
- Gunakan marker [cite:SRC_N] HANYA untuk fakta yang secara literal ada di teks dokumen sumber.
- Dilarang keras mengarang DOI, jumlah sampel, atau signifikansi statistik yang tidak ada dalam teks.
- Tulis dalam Bahasa Indonesia formal akademik yang santun, objektif, dan terstruktur.`;

    // 4. Generate structured synthesis
    const response = await aiRequestService.generateChatResponse({
      userId,
      userTier,
      requestedModelId: DEFAULT_AI_MODEL_ID,
      prompt,
      systemInstruction,
      cachedContent: cacheResult.cacheName,
      maxOutputTokens: 3500,
      abortSignal
    });

    const fullText = response.text || '';

    // 5. Wrap into interactive Canvas artifact format
    const artifactMarkdown = `:::artifact{type="markdown" title="Matriks Sintesis Literatur (Bab 2 Skripsi)"}
# 📊 Matriks Sintesis Literatur & Penelitian Terdahulu

*Dihasilkan dari analisis komparatif ${sanitizedDocs.length} dokumen rujukan ilmiah.*
${cacheResult.isExplicitCached ? '\n> ⚡ *Dioptimalkan dengan Gemini Explicit Context Caching (Biaya hemat 75%)*' : ''}

${fullText}
:::`;

    return {
      markdownTable: fullText,
      narrativeDraft: fullText,
      artifactMarkdown,
      rows: [],
      totalPapers: sanitizedDocs.length,
      cachedContentUsed: cacheResult.cacheName,
      isExplicitCached: cacheResult.isExplicitCached
    };
  }
};
