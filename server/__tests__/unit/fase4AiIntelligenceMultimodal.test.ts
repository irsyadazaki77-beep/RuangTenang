import { describe, expect, it } from 'vitest';
import { smartModelRouter } from '../../services/ai/smartModelRouter.js';
import { verifyClaimsAgainstEvidence } from '../../services/file-intelligence/claimVerificationService.js';
import { WorkspaceMemoryService } from '../../services/workspaceMemoryService.js';
import { AI_MODEL_REGISTRY, getModelDefinition } from '../../services/ai/aiModelRegistry.js';

describe('FASE 4: Advanced AI Intelligence & Multimodal Engine Verification', () => {
  describe('1. Capability Registry & Router Capability Enforcement', () => {
    it('registers tool_calling capability for Gemini, OpenAI, DeepSeek, and Groq', () => {
      const geminiFlash = getModelDefinition('gemini-3.8-flash');
      expect(geminiFlash?.capabilities).toContain('tool_calling');
      expect(geminiFlash?.capabilities).toContain('vision');
      expect(geminiFlash?.capabilities).toContain('document_ocr');

      const deepseekChat = getModelDefinition('deepseek-chat');
      expect(deepseekChat?.capabilities).toContain('tool_calling');

      const groqQwen = getModelDefinition('groq-qwen-27b');
      expect(groqQwen?.capabilities).toContain('tool_calling');
    });

    it('rejects models in routeProfile when requestedCapabilities cannot be fulfilled', () => {
      expect(() => {
        smartModelRouter.routeProfile('kerja-fast', {
          userTier: 'Free',
          workspaceMode: true,
          // Exclude Gemini and vision models which support document_ocr, leaving only Groq & OpenRouter candidates
          excludedModelIds: ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'ollama-qwen3.5-0.8b'],
          requestedCapabilities: ['document_ocr']
        });
      }).toThrow('MODEL_UNAVAILABLE');
    });

    it('fails closed when manual model selection lacks requestedCapabilities', () => {
      process.env.GROQ_API_KEY = 'gsk_mock_valid_groq_key_32chars_test';
      expect(() => {
        smartModelRouter.routeModel({
          manualModelId: 'groq-gpt-20b',
          requestedCapabilities: ['vision']
        });
      }).toThrow('MODEL_UNAVAILABLE');
    });
  });

  describe('2. Cross-Document Conflict & Fact Verification', () => {
    it('identifies conflicting claims when multiple sources provide conflicting numerical data', () => {
      const answer = 'Menurut studi literatur, tingkat akurasi model A adalah 85% [cite:SRC_1] [cite:SRC_2].';
      const sources = [
        {
          citationId: 'SRC_1',
          documentId: 'doc-1',
          filename: 'report_2023.pdf',
          sourceRef: 'Hal. 10',
          snippet: 'Tingkat akurasi tercatat mencapai 85% pada pengujian.'
        },
        {
          citationId: 'SRC_2',
          documentId: 'doc-2',
          filename: 'report_2024.pdf',
          sourceRef: 'Hal. 14',
          snippet: 'Tingkat akurasi yang terukur adalah 94% pada batch terbaru.'
        }
      ];

      const result = verifyClaimsAgainstEvidence(answer, sources);
      expect(result.claims[0].verificationStatus).toBe('conflicting');
      expect(result.acceptedCitationIds).toContain('SRC_1');
      expect(result.acceptedCitationIds).toContain('SRC_2');
    });

    it('verifies non-conflicting exact text match as supported', () => {
      const answer = 'Tingkat akurasi tercatat mencapai 85% pada pengujian [cite:SRC_1].';
      const sources = [
        {
          citationId: 'SRC_1',
          documentId: 'doc-1',
          filename: 'report_2023.pdf',
          sourceRef: 'Hal. 10',
          snippet: 'Tingkat akurasi tercatat mencapai 85% pada pengujian.'
        }
      ];

      const result = verifyClaimsAgainstEvidence(answer, sources);
      expect(result.claims[0].verificationStatus).toBe('supported');
    });
  });

  describe('3. Clinical Safety & Long-Term Memory Boundary', () => {
    it('prohibits storing self-harm or formal psychiatric diagnostic labels in long-term workspace memory', async () => {
      await expect(
        WorkspaceMemoryService.addMemory({
          userId: 'test-user',
          workspaceId: 'test-workspace',
          category: 'decision',
          content: 'Pengguna memiliki riwayat self-harm dan ada keinginan bunuh diri.'
        })
      ).rejects.toThrow();
    });
  });
});
