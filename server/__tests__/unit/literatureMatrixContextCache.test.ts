import { describe, expect, it, vi, beforeEach } from 'vitest';
import { geminiContextCacheService } from '../../services/ai/geminiContextCacheService.js';
import { literatureMatrixService } from '../../services/file-intelligence/literatureMatrixService.js';
import { literatureMatrixExportService } from '../../services/file-intelligence/literatureMatrixExportService.js';
import { aiRequestService } from '../../services/ai/aiRequestService.js';

describe('FASE 12: Literature Matrix & Context Caching Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    geminiContextCacheService.clearCache();
  });

  describe('1. Gemini Context Caching Layer', () => {
    it('computes deterministic fingerprint for documents', () => {
      const docs = [
        { id: 'doc_1', text: 'Studi mengenai efikasi mindfulness pada mahasiswa' },
        { id: 'doc_2', text: 'Analisis burnout akademik dan intervensi digital' }
      ];
      const fp1 = geminiContextCacheService.computeFingerprint(docs);
      const fp2 = geminiContextCacheService.computeFingerprint(docs);
      expect(fp1).toEqual(fp2);
      expect(typeof fp1).toBe('string');
      expect(fp1.length).toBe(64); // SHA-256
    });

    it('returns implicitEligible=true when document bundle is under 32k tokens', async () => {
      const docs = [
        { id: 'doc_1', filename: 'jurnal1.pdf', text: 'Teks pendek di bawah ambang batas explicit cache.' }
      ];
      const result = await geminiContextCacheService.getOrCreateCache({
        documents: docs,
        modelId: 'gemini-3.8-flash'
      });

      expect(result.isExplicitCached).toBe(false);
      expect(result.cacheName).toBeUndefined();
      expect(result.implicitEligible).toBe(true);
      expect(result.tokenCount).toBeGreaterThan(0);
    });
  });

  describe('2. Literature Matrix Synthesis', () => {
    it('synthesizes multi-document input into structured canvas artifact', async () => {
      const mockAiResponse = {
        text: `## Matriks Literatur
| No | Peneliti & Tahun | Variabel | Metodologi | Temuan | Research Gap | Relevansi |
| 1 | Hidayat (2024) [cite:SRC_1] | Burnout (X) -> IPK (Y) | Kuantitatif N=150 | Korelasi r=-0.42 | Sampel terbatas 1 prodi | Relevan sebagai rujukan utama |

## Draf Bab 2 Skripsi
Penelitian terdahulu yang dilakukan oleh Hidayat (2024) [cite:SRC_1] membuktikan adanya korelasi signifikan...`,
        modelUsed: 'gemini-3.8-flash',
        isFallback: false
      };

      vi.spyOn(aiRequestService, 'generateChatResponse').mockResolvedValue(mockAiResponse);

      const docs = [
        { id: 'doc_a', filename: 'Jurnal_Hidayat_2024.pdf', text: 'Penelitian ini meneliti pengaruh burnout terhadap indeks prestasi mahasiswa.' }
      ];

      const synthesis = await literatureMatrixService.synthesizeMatrix({
        userId: 'user_test_1',
        topicOrFocus: 'Pengaruh Burnout terhadap Prestasi Akademik',
        documents: docs
      });

      expect(synthesis.totalPapers).toBe(1);
      expect(synthesis.artifactMarkdown).toContain(':::artifact{type="markdown" title="Matriks Sintesis Literatur (Bab 2 Skripsi)"}');
      expect(synthesis.artifactMarkdown).toContain('Hidayat (2024)');
      expect(synthesis.artifactMarkdown).toContain('[cite:SRC_1]');
    });

    it('rejects synthesis if documents array is empty', async () => {
      await expect(literatureMatrixService.synthesizeMatrix({
        documents: []
      })).rejects.toThrow('MINIMUM_ONE_DOCUMENT_REQUIRED');
    });
  });

  describe('3. Literature Matrix Export (Excel & Word)', () => {
    const mockExportData = {
      title: 'Matriks Penelitian Terdahulu Mahasiswa',
      topic: 'Pengaruh Mindfulness terhadap Regulasi Emosi',
      rows: [
        {
          no: 1,
          citation: 'Rahmawati, S. (2025). Jurnal Psikologi Kampus, 12(1), 45-56.',
          variables: 'Mindfulness (X), Regulasi Emosi (Y)',
          methodology: 'Eksperimen Semu (N=80), Uji Paired T-Test',
          findings: 'Peningkatan regulasi emosi secara signifikan (t=4.25, p<0.01)',
          gap: 'Hanya meneliti mahasiswa tahun pertama',
          relevance: 'Menjadi rujukan intervensi pada Bab 3'
        }
      ],
      narrativeText: 'Kajian penelitian terdahulu menunjukkan bahwa latihan mindfulness berperan krusial dalam menstabilkan regulasi emosi mahasiswa.'
    };

    it('generates valid Excel (.xlsx) buffer with headers and borders', async () => {
      const buffer = await literatureMatrixExportService.generateExcel(mockExportData);
      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);
      // Valid ZIP/XLSX magic bytes (PK..)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4B);
    });

    it('generates valid Word (.docx) buffer in standard thesis format', async () => {
      const buffer = await literatureMatrixExportService.generateDocx(mockExportData);
      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);
      // Valid ZIP/DOCX magic bytes (PK..)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4B);
    });
  });
});
