import { describe, it, expect } from 'vitest';
import {
  splitIntoSentences,
  paraphraseAcademicSentence,
  auditDocumentIntegrity,
  applyParaphrasesToContent
} from '../../features/workspace/utils/academicIntegrityAuditor';

describe('Academic Integrity & Turnitin Readiness Auditor', () => {
  const informalParagraph = `Peneliti menganalisis data kuesioner dengan metode kuantitatif. Menurut saya hasilnya sangat banyak sekali variasi. Tapi data ini membuktikan secara mutlak bahwa model kita bagus sekali.`;

  describe('splitIntoSentences', () => {
    it('tokenizes text into meaningful sentences excluding markdown headers', () => {
      const text = `# Bab 1\nPeneliti menganalisis data. Hasilnya sangat memuaskan. Ada kesimpulan lain.`;
      const sentences = splitIntoSentences(text);
      expect(sentences).toHaveLength(3);
      expect(sentences[0]).toBe('Peneliti menganalisis data.');
    });
  });

  describe('paraphraseAcademicSentence', () => {
    it('detects and transforms colloquial phrases to formal academic equivalents', () => {
      const input = 'Menurut saya data ini sangat banyak sekali variasinya.';
      const result = paraphraseAcademicSentence(input);
      expect(result.paraphrased).toContain('berdasarkan perspektif analisis teoritis');
      expect(result.paraphrased).toContain('dalam kuantitas yang signifikan');
      expect(result.risk).toBe('high');
    });

    it('converts active researcher clauses into objective passive scientific sentences', () => {
      const input = 'Peneliti menganalisis kuesioner mahasiswa semester akhir.';
      const result = paraphraseAcademicSentence(input);
      expect(result.paraphrased).toContain('dianalisis secara sistematis guna menjamin objektivitas penelitian');
      expect(result.risk).toBe('medium');
    });

    it('hedges absolute claims into empirical tendencies', () => {
      const input = 'Data ini membuktikan secara mutlak kebenaran teori.';
      const result = paraphraseAcademicSentence(input);
      expect(result.paraphrased).toContain('mengindikasikan kecenderungan kuat bahwa');
    });
  });

  describe('auditDocumentIntegrity', () => {
    it('audits document and calculates risk score, academic tone, and suggestions', () => {
      const report = auditDocumentIntegrity(informalParagraph);
      expect(report.sentenceCount).toBeGreaterThanOrEqual(2);
      expect(report.flaggedSentencesCount).toBeGreaterThan(0);
      expect(report.suggestions.length).toBeGreaterThan(0);
      expect(report.overallRiskScore).toBeGreaterThan(15);
      expect(report.academicToneScore).toBeLessThan(85);
    });

    it('returns safe status for empty or minimal input', () => {
      const report = auditDocumentIntegrity('');
      expect(report.riskCategory).toBe('safe');
      expect(report.overallRiskScore).toBe(0);
      expect(report.suggestions).toHaveLength(0);
    });
  });

  describe('applyParaphrasesToContent', () => {
    it('substitutes accepted original sentences with their paraphrased replacements', () => {
      const original = 'Peneliti menguji 50 sampel. Menurut saya data sudah lengkap.';
      const replacements = [
        {
          original: 'Menurut saya data sudah lengkap.',
          replacement: 'Berdasarkan perspektif analisis teoritis, data telah terverifikasi lengkap.'
        }
      ];
      const updated = applyParaphrasesToContent(original, replacements);
      expect(updated).not.toContain('Menurut saya');
      expect(updated).toContain('Berdasarkan perspektif analisis teoritis');
    });
  });
});
