import { describe, it, expect, beforeEach } from 'vitest';
import { smartModelRouter, classifyRequest } from '../../services/ai/smartModelRouter.js';
import { ResponseQualityValidator } from '../../services/ai/responseQualityValidator.js';
import { verifyClaimsAgainstEvidence } from '../../services/file-intelligence/claimVerificationService.js';
import { AiModelError } from '../../services/ai/aiModelRegistry.js';
import type { FileSourceReference } from '../../../shared/contracts/files.js';

describe('FASE 12: AI Model Intelligence & Response Quality Suite', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  });

  describe('1. Reasoning Quality & Task Classification', () => {
    it('classifies complex algorithmic and mathematical proofs into structured_reasoning with deep latency', () => {
      const prompt = 'Buktikan secara logis dan matematika step by step proof mengapa algoritma Dijkstra bekerja optimal untuk graf tanpa bobot negatif';
      const classification = classifyRequest({
        workspaceMode: false,
        latencyPreference: 'deep'
      }, prompt);

      expect(classification.category).toBe('structured_reasoning');
      expect(classification.latencyPreference).toBe('deep');
      expect(classification.qualityPreference).toBe('very_high');
    });

    it('routes structured reasoning prompts to high-reasoning tier models', () => {
      const decision = smartModelRouter.routeModel({
        workspaceMode: false,
        taskCategory: 'structured_reasoning',
        latencyPreference: 'deep'
      }, 'Jelaskan logika deduksi dan analisis mendalam terkait sistem ini');

      expect(decision.selectedModelId).toBeDefined();
      expect(decision.routingReason).toContain('Model dipilih otomatis');
      expect(decision.routingMode).toBe('auto');
    });
  });

  describe('2. Coding Intelligence & Diagnostics', () => {
    it('accurately identifies coding queries in chat and workspace modes', () => {
      const codeQuery = 'Tolong debug error stack trace berikut di backend TypeScript Express: Cannot find module ./service.js';
      const classification = classifyRequest({
        workspaceMode: false
      }, codeQuery);

      expect(classification.category).toBe('coding');
      expect(classification.qualityPreference).toBe('high');
    });

    it('detects unclosed code fences and provides a safe repaired response', () => {
      const truncatedCodeResponse = 'Berikut adalah fungsi yang Anda butuhkan:\n```typescript\nfunction calculateSum(a: number, b: number) {\n  return a + b;\n}\n';
      const assessment = ResponseQualityValidator.assessQuality(truncatedCodeResponse);

      expect(assessment.isValid).toBe(true);
      expect(assessment.flags.isTruncatedCodeBlock).toBe(true);
      expect(assessment.suggestedAction).toBe('repair');
      expect(assessment.repairedText?.endsWith('```')).toBe(true);
    });

    it('validates complete, closed code blocks without flagging truncation', () => {
      const cleanCodeResponse = 'Solusi:\n```typescript\nfunction calculateSum(a: number, b: number) {\n  return a + b;\n}\n```';
      const assessment = ResponseQualityValidator.assessQuality(cleanCodeResponse);

      expect(assessment.isValid).toBe(true);
      expect(assessment.flags.isTruncatedCodeBlock).toBe(false);
      expect(assessment.suggestedAction).toBe('pass');
    });
  });

  describe('3. Research Grounding & Citation Integrity', () => {
    const mockSources: FileSourceReference[] = [
      {
        citationId: 'SRC_1',
        filename: 'skripsi_bab1.pdf',
        documentId: 'doc_1',
        snippet: 'Penggunaan metode blended learning meningkatkan retensi materi sebesar 24 persen pada mahasiswa tingkat akhir.',
        sourceRef: 'Halaman 12'
      },
      {
        citationId: 'SRC_2',
        filename: 'metodologi.docx',
        documentId: 'doc_2',
        snippet: 'Sampel penelitian berjumlah 120 responden yang dipilih menggunakan purposive sampling.',
        sourceRef: 'Halaman 4'
      }
    ];

    it('accepts legitimate citations and marks exact text matches as supported', () => {
      const answer = 'Penggunaan metode blended learning meningkatkan retensi materi sebesar 24 persen pada mahasiswa tingkat akhir [cite:SRC_1].';
      const result = verifyClaimsAgainstEvidence(answer, mockSources);

      expect(result.acceptedCitationIds).toContain('SRC_1');
      expect(result.rejectedCitationIds.length).toBe(0);
      expect(result.claims[0].verificationStatus).toBe('supported');
    });

    it('flags unapproved or hallucinated citation markers in validator', () => {
      const answerWithHallucinatedCite = 'Berdasarkan studi terdahulu [cite:SRC_FAKE], tingkat keberhasilan mencapai 99 persen.';
      const assessment = ResponseQualityValidator.assessQuality(answerWithHallucinatedCite, {
        allowedSources: mockSources,
        strictCitationVerification: true
      });

      expect(assessment.flags.hasUnverifiedCitations).toBe(true);
      expect(assessment.reasons.some(r => r.includes('UNVERIFIED_CITATION_IDS'))).toBe(true);
      expect(assessment.repairedText).not.toContain('[cite:SRC_FAKE]');
    });
  });

  describe('4. Adaptive Depth & Uncertainty Handling', () => {
    it('routes requests requesting brief answers to fast latency preference', () => {
      const classification = classifyRequest({
        workspaceMode: false,
        responseStyle: 'Singkat'
      }, 'Apa itu paradigma OOP secara ringkas?');

      expect(classification.latencyPreference).toBe('fast');
      expect(classification.category).toBe('general_chat');
    });

    it('rejects empty and whitespace-only generation', () => {
      const assessment = ResponseQualityValidator.assessQuality('   \n\t  ');

      expect(assessment.isValid).toBe(false);
      expect(assessment.flags.isEmpty).toBe(true);
      expect(assessment.suggestedAction).toBe('block');
    });

    it('flags abruptly truncated sentences ending on conjunctions', () => {
      const danglingResponse = 'Pendekatan ini memiliki kelebihan karena';
      const assessment = ResponseQualityValidator.assessQuality(danglingResponse);

      expect(assessment.flags.isTruncatedSentence).toBe(true);
      expect(assessment.reasons).toContain('ABRUPT_SENTENCE_TRUNCATION');
    });
  });

  describe('5. Multi-Model Selection & Manual Selection Sanctity', () => {
    it('honors manual model selection strictly regardless of prompt classification', () => {
      const decision = smartModelRouter.routeModel({
        workspaceMode: true,
        manualModelId: 'gemini-3.5-pro',
        userTier: 'Pro'
      }, 'Tulis kode python sederhana');

      expect(decision.selectedModelId).toBe('gemini-3.5-pro');
      expect(decision.routingMode).toBe('manual');
      expect(decision.routingReason).toContain('secara manual');
    });

    it('restricts models exceeding the user tier and throws MODEL_NOT_ALLOWED', () => {
      expect(() => {
        smartModelRouter.routeModel({
          workspaceMode: false,
          manualModelId: 'gemini-3.5-pro',
          userTier: 'Free'
        }, 'Bantu analisis');
      }).toThrowError(AiModelError);
    });
  });
});
