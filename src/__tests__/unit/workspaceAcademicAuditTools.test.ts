import { describe, it, expect } from 'vitest';
import {
  auditInTextCitations,
  auditChapterCoherence,
  generateLiteratureMatrixTemplate
} from '../../features/workspace/utils/academicAuditTools';
import { WorkspaceToolRegistry } from '../../features/workspace/tools/toolRegistry';
import { WorkspaceToolExecutor } from '../../features/workspace/tools/toolExecutor';

describe('Next Update Ruang Kerja v3.7 — Academic Audit & Synthesis Tools', () => {
  describe('1. auditInTextCitations', () => {
    it('should detect empty documents gracefully', () => {
      const result = auditInTextCitations('');
      expect(result.inTextCitations).toHaveLength(0);
      expect(result.hasBibliographySection).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should extract APA style in-text citations and match with Daftar Pustaka', () => {
      const markdown = `
# Bab 1 Pendahuluan
Menurut penelitian sebelumnya (Santoso, 2024), adopsi teknologi pembelajaran cerdas dapat meningkatkan pemahaman mahasiswa.
Hal ini sejalan dengan temuan Wijaya et al. (2023) yang menunjukkan efisiensi belajar hingga 40%.
Namun, studi lain (Pratama, 2021) belum mempertimbangkan aspek kecemasan digital.

## Daftar Pustaka
Santoso, B. (2024). Transformasi Digital Pendidikan Tinggi. Jurnal Pendidikan, 12(3), 45-56.
Wijaya, A., & Kusuma, D. (2023). Efisiensi Pembelajaran dengan AI. Jurnal Teknologi, 8(1), 12-24.
      `.trim();

      const result = auditInTextCitations(markdown);

      expect(result.hasBibliographySection).toBe(true);
      expect(result.bibliographyEntriesCount).toBe(2);
      expect(result.inTextCitations.length).toBeGreaterThanOrEqual(3);

      // Santoso dan Wijaya ada di daftar pustaka, Pratama belum ada!
      expect(result.unmatchedInText).toContain('Pratama');
      expect(result.matchedCount).toBeGreaterThanOrEqual(2);
      expect(result.suggestions.some(s => s.includes('Pratama'))).toBe(true);
    });

    it('should extract IEEE numeric citations correctly', () => {
      const markdown = `
Implementasi model transformer menunjukkan akurasi optimal [1], [2].
Studi lanjutan telah membuktikan keunggulan arsitektur ini [3].

## References
[1] Smith, J. Neural Networks, 2022.
[2] Lee, K. Deep Learning, 2023.
[3] Garcia, M. Modern Transformers, 2024.
      `.trim();

      const result = auditInTextCitations(markdown);
      expect(result.hasBibliographySection).toBe(true);
      expect(result.inTextCitations.length).toBe(3);
    });
  });

  describe('2. auditChapterCoherence', () => {
    it('should detect when Bab 1 has missing research questions', () => {
      const content = `
# Bab 1 Pendahuluan
Latar belakang penelitian ini membahas pentingnya digitalisasi.
Penelitian ini bertujuan untuk memahami fenomena tersebut.
      `.trim();

      const result = auditChapterCoherence(content, 'BAB_1');
      expect(result.chapterCoverage.BAB_1).toBe(true);
      expect(result.issues.some(i => i.type === 'QUESTION_GAP')).toBe(true);
      expect(result.coherenceScore).toBeLessThan(100);
    });

    it('should give high score when chapters are well-aligned', () => {
      const content = `
# Bab 1 Pendahuluan
## 1.2 Rumusan Masalah
1. Bagaimana pengaruh intervensi AI terhadap retensi memori?

# Bab 3 Metodologi Penelitian
Populasi dan sampel terdiri dari 150 responden. Analisis data menggunakan regresi linier.

# Bab 4 Hasil dan Pembahasan
Hasil analisis menunjukkan p < 0.05.

# Bab 5 Kesimpulan dan Saran
Berdasarkan temuan, intervensi AI terbukti meningkatkan retensi secara signifikan.
      `.trim();

      const result = auditChapterCoherence(content, 'ALL');
      expect(result.chapterCoverage.BAB_1).toBe(true);
      expect(result.chapterCoverage.BAB_3).toBe(true);
      expect(result.chapterCoverage.BAB_4).toBe(true);
      expect(result.chapterCoverage.BAB_5).toBe(true);
      expect(result.coherenceScore).toBeGreaterThanOrEqual(85);
      expect(result.issues.length).toBe(0);
    });
  });

  describe('3. generateLiteratureMatrixTemplate', () => {
    it('should generate valid Markdown table for literature synthesis matrix', () => {
      const template = generateLiteratureMatrixTemplate();
      expect(template).toContain('# Matriks Sintesis Literatur Penelitian');
      expect(template).toContain('| No | Penulis & Tahun | Judul Penelitian | Metodologi & Sampel | Temuan Utama | Research Gap / Keterbatasan |');
      expect(template).toContain('Santoso & Pratama (2023)');
      expect(template).toContain('State-of-the-Art');
    });
  });

  describe('4. Tool Registry & Executor Integration', () => {
    it('should have new tools registered in WorkspaceToolRegistry', () => {
      const intextTool = WorkspaceToolRegistry.getTool('academic_citation_intext_audit');
      const coherenceTool = WorkspaceToolRegistry.getTool('academic_chapter_coherence');
      const matrixTool = WorkspaceToolRegistry.getTool('academic_lit_matrix_builder');

      expect(intextTool).toBeDefined();
      expect(intextTool?.category).toBe('Citation');
      expect(intextTool?.executionMode).toBe('client_utility');

      expect(coherenceTool).toBeDefined();
      expect(coherenceTool?.category).toBe('Research');

      expect(matrixTool).toBeDefined();
      expect(matrixTool?.outputType).toBe('ARTIFACT_CREATE');
    });

    it('should execute client utility for academic_citation_intext_audit', async () => {
      const tool = WorkspaceToolRegistry.getTool('academic_citation_intext_audit')!;
      const result = await WorkspaceToolExecutor.executeClientUtility(tool, {
        toolId: tool.id,
        context: {
          activeArtifact: {
            id: 'art_test',
            title: 'Draf Bab 1',
            type: 'DOCUMENT',
            version: 1,
            content: 'Penelitian oleh (Hidayat, 2023) menunjukkan signifikansi data.\n\n## Daftar Pustaka\nHidayat, R. (2023). Analisis Data Kampus.'
          }
        },
        input: {}
      });

      expect(result.success).toBe(true);
      expect(result.outputType).toBe('TEXT');
      expect(result.proposedContent).toContain('Hasil Audit Sitasi In-Text');
      expect(result.metadata?.matchedCount).toBe(1);
    });

    it('should execute client utility for academic_chapter_coherence', async () => {
      const tool = WorkspaceToolRegistry.getTool('academic_chapter_coherence')!;
      const result = await WorkspaceToolExecutor.executeClientUtility(tool, {
        toolId: tool.id,
        context: {
          activeArtifact: {
            id: 'art_test',
            title: 'Skripsi Bab 1-5',
            type: 'DOCUMENT',
            version: 1,
            content: 'Bab 1 Pendahuluan\nRumusan Masalah:\n1. Uji hipotesis?\n\nBab 3 Metodologi\nSampel 100 orang.\n\nBab 5 Kesimpulan\nHipotesis terbukti.'
          }
        },
        input: {}
      });

      expect(result.success).toBe(true);
      expect(result.proposedContent).toContain('Laporan Audit Konsistensi Antar-Bab');
      expect(result.metadata?.coherenceScore).toBeDefined();
    });

    it('should execute client utility for academic_lit_matrix_builder', async () => {
      const tool = WorkspaceToolRegistry.getTool('academic_lit_matrix_builder')!;
      const result = await WorkspaceToolExecutor.executeClientUtility(tool, {
        toolId: tool.id,
        context: {},
        input: {}
      });

      expect(result.success).toBe(true);
      expect(result.outputType).toBe('ARTIFACT_CREATE');
      expect(result.metadata?.artifactType).toBe('TABLE');
      expect(result.proposedContent).toContain('Matriks Sintesis Literatur');
    });
  });
});
