import { describe, it, expect } from 'vitest';
import { ComparisonConsensusService } from '../../services/ai/comparisonConsensusService.js';
import type { FileSourceReference } from '../../../shared/contracts/files.js';

describe('FASE 13: Multi-Model Comparison & Consensus Service', () => {
  const mockSources: FileSourceReference[] = [
    {
      citationId: 'SRC_METODOLOGI',
      filename: 'pedoman_riset.pdf',
      documentId: 'doc_123',
      snippet: 'Metode blended learning terbukti meningkatkan pemahaman mahasiswa sebesar 24%.',
      sourceRef: 'Hal 15'
    }
  ];

  it('requires at least 2 completed candidates to perform consensus analysis', () => {
    const singleCandidate = [
      {
        candidateId: 'gemini-3.8-flash',
        modelId: 'gemini-3.8-flash',
        modelName: 'Gemini 3.8 Flash',
        output: 'Penjelasan awal skripsi.',
        status: 'completed' as const
      }
    ];

    const result = ComparisonConsensusService.analyzeCandidates('Jelaskan metodologi', singleCandidate, mockSources);
    expect(result.status).toBe('insufficient_candidates');
    expect(result.evaluations.length).toBe(0);
  });

  it('evaluates multiple candidates, checks citation support, and scores candidates objectively', () => {
    const candidates = [
      {
        candidateId: 'gemini-3.8-flash',
        modelId: 'gemini-3.8-flash',
        modelName: 'Gemini 3.8 Flash',
        output: 'Blended learning terbukti meningkatkan pemahaman [cite:SRC_METODOLOGI]. Pendekatan ini sangat efektif untuk skripsi.',
        status: 'completed' as const
      },
      {
        candidateId: 'deepseek-chat',
        modelId: 'deepseek-chat',
        modelName: 'DeepSeek V3',
        output: 'Penerapan blended learning meningkatkan pemahaman mahasiswa [cite:SRC_METODOLOGI]. Namun beberapa kajian menganggap ini kurang cocok jika infrastruktur kurang.',
        status: 'completed' as const
      }
    ];

    const result = ComparisonConsensusService.analyzeCandidates('Jelaskan efektivitas blended learning untuk skripsi', candidates, mockSources);

    expect(result.status).toBe('evaluated');
    expect(result.totalEvaluatedCandidates).toBe(2);
    expect(result.evaluations.length).toBe(2);
    expect(result.evaluations[0].verifiedCitationsCount).toBe(1);
    expect(result.evaluations[0].unverifiedCitationsCount).toBe(0);
    expect(result.evidenceVerificationSummary.disclaimer).toContain('bukan merupakan bukti validitas kebenaran faktual secara independen');
  });

  it('assigns 0 evidence support score and notes caveats when citations exist but no active sources are provided', () => {
    const candidates = [
      {
        candidateId: 'gemini-3.8-flash',
        modelId: 'gemini-3.8-flash',
        modelName: 'Gemini 3.8 Flash',
        output: 'Klaim dengan sitasi fiktif [cite:GHOST_SOURCE] tanpa dokumen.',
        status: 'completed' as const
      },
      {
        candidateId: 'deepseek-chat',
        modelId: 'deepseek-chat',
        modelName: 'DeepSeek V3',
        output: 'Klaim model lain tanpa dokumen sumber aktif.',
        status: 'completed' as const
      }
    ];

    const result = ComparisonConsensusService.analyzeCandidates('Bahas topik bebas', candidates, []);
    expect(result.status).toBe('evaluated');
    expect(result.evaluations[0].evidenceSupportScore).toBe(0);
    expect(result.evaluations[0].caveats.some(c => c.includes('tidak ada dokumen sumber'))).toBe(true);
  });

  it('detects disagreements when models express diverging views', () => {
    const candidates = [
      {
        candidateId: 'm1',
        modelId: 'gemini-3.8-flash',
        modelName: 'Gemini',
        output: 'Metode ini dinilai efektif untuk mahasiswa semester awal.',
        status: 'completed' as const
      },
      {
        candidateId: 'm2',
        modelId: 'deepseek-chat',
        modelName: 'DeepSeek',
        output: 'Metode ini dinilai tidak efektif untuk mahasiswa semester awal karena beban belajar meningkat.',
        status: 'completed' as const
      }
    ];

    const result = ComparisonConsensusService.analyzeCandidates('Evaluasi efektivitas metode', candidates);
    expect(result.disagreements.length).toBeGreaterThan(0);
    expect(result.disagreements[0].topic).toContain('efektif');
  });

  it('synthesizes the best answer while preserving provenance and verified citations', () => {
    const candidates = [
      {
        candidateId: 'm1',
        modelId: 'gemini-3.8-flash',
        modelName: 'Gemini 3.8 Flash',
        output: 'Metode blended learning terbukti meningkatkan pemahaman mahasiswa [cite:SRC_METODOLOGI].',
        status: 'completed' as const
      },
      {
        candidateId: 'm2',
        modelId: 'deepseek-chat',
        modelName: 'DeepSeek V3',
        output: 'Metode blended learning terbukti meningkatkan pemahaman mahasiswa dengan pendampingan dosen.',
        status: 'completed' as const
      }
    ];

    const synthesis = ComparisonConsensusService.synthesizeBestAnswer('Metodologi pembelajaran', candidates, mockSources);

    expect(synthesis.synthesizedText).toContain('## Sintesis Jawaban Terbaik');
    expect(synthesis.provenance.length).toBe(2);
    expect(synthesis.verifiedEvidenceSources).toContain('SRC_METODOLOGI');
    expect(synthesis.disclaimer).toBeDefined();
  });
});
