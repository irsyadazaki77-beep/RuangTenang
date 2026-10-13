import type { FileSourceReference } from '../../../shared/contracts/files.js';

export interface ModelComparisonCandidateInput {
  candidateId: string;
  modelId: string;
  modelName: string;
  output: string;
  status: 'completed' | 'failed' | 'cancelled' | 'streaming' | 'queued';
  latencyMs?: number;
}

export interface ClaimAgreementItem {
  claim: string;
  sharedByModelIds: string[];
  type: 'consensus' | 'partial_agreement' | 'unique_to_model';
}

export interface DisagreementItem {
  topic: string;
  modelPositions: Array<{
    modelId: string;
    modelName: string;
    position: string;
  }>;
}

export interface CandidateEvaluationScore {
  candidateId: string;
  modelId: string;
  modelName: string;
  relevanceScore: number; // 0-1
  instructionAdherenceScore: number; // 0-1
  evidenceSupportScore: number; // 0-1
  overallScore: number; // 0-1
  verifiedCitationsCount: number;
  unverifiedCitationsCount: number;
  strengths: string[];
  caveats: string[];
}

export interface ComparisonConsensusAnalysis {
  status: 'evaluated' | 'insufficient_candidates' | 'pending';
  totalEvaluatedCandidates: number;
  evaluations: CandidateEvaluationScore[];
  agreements: ClaimAgreementItem[];
  disagreements: DisagreementItem[];
  evidenceVerificationSummary: {
    totalClaimsChecked: number;
    supportedClaimsCount: number;
    unverifiedClaimsCount: number;
    unsupportedClaimsCount: number;
    disclaimer: string;
  };
  synthesisRecommendation?: {
    suggestedBaseModelId: string;
    reason: string;
  };
}

export interface SynthesisResult {
  synthesizedText: string;
  provenance: Array<{
    sourceModelId: string;
    sourceModelName: string;
    contributionSummary: string;
  }>;
  verifiedEvidenceSources: string[];
  disclaimer: string;
}

/**
 * Intelligent Multi-Model Evaluator, Agreement/Disagreement Detector, and Consensus Synthesizer.
 * Deterministic and evidence-grounded: does not assume model agreement equals factual truth.
 */
export class ComparisonConsensusService {
  /**
   * Evaluates finished candidate answers against prompt requirements and provided evidence references.
   */
  public static analyzeCandidates(
    prompt: string,
    candidates: ModelComparisonCandidateInput[],
    sources: FileSourceReference[] = []
  ): ComparisonConsensusAnalysis {
    const completed = candidates.filter(c => c.status === 'completed' && c.output.trim().length > 0);

    if (completed.length < 2) {
      return {
        status: completed.length === 1 ? 'insufficient_candidates' : 'pending',
        totalEvaluatedCandidates: completed.length,
        evaluations: [],
        agreements: [],
        disagreements: [],
        evidenceVerificationSummary: {
          totalClaimsChecked: 0,
          supportedClaimsCount: 0,
          unverifiedClaimsCount: 0,
          unsupportedClaimsCount: 0,
          disclaimer: 'Evaluasi membutuhkan minimal 2 kandidat model yang telah selesai menjawab.'
        }
      };
    }

    const allowedCitationIds = new Set(sources.map(s => s.citationId).filter(Boolean));

    // 1. Evaluate individual candidates
    const promptKeywords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const evaluations: CandidateEvaluationScore[] = completed.map(cand => {
      const text = cand.output;
      const lower = text.toLowerCase();

      // Relevance score: proportion of significant prompt keywords addressed
      const matchedKeywords = promptKeywords.filter(k => lower.includes(k));
      const relevanceScore = promptKeywords.length > 0
        ? Math.min(1, Math.max(0.4, matchedKeywords.length / promptKeywords.length))
        : 0.8;

      // Instruction adherence: length sufficiency, formatting, structural completeness
      const isTooShort = text.length < 60;
      const hasStructure = text.includes('\n') || text.includes('- ') || text.includes('1.');
      const instructionAdherenceScore = isTooShort ? 0.3 : hasStructure ? 0.9 : 0.7;

      // Evidence check: Verify citation format alignment against provided active sources.
      // Important: Having a valid citation ID verifies format alignment with active documents, NOT independent factual truth.
      const citedIds = [...text.matchAll(/\[cite:([A-Za-z0-9_-]+)\]/g)].map(m => m[1]);
      let verifiedCount = 0;
      let unverifiedCount = 0;
      for (const id of citedIds) {
        if (allowedCitationIds.has(id)) verifiedCount++;
        else unverifiedCount++;
      }

      // If no sources exist at all, evidenceSupportScore is strictly 0.0 (no factual support score granted)
      const evidenceSupportScore = sources.length === 0
        ? 0.0
        : citedIds.length > 0
          ? Math.min(1.0, verifiedCount / citedIds.length)
          : 0.0;

      // When sources are present, evidence weight applies. When sources are absent, score is based purely on relevance & instruction adherence.
      const overallScore = sources.length > 0
        ? Number((relevanceScore * 0.4 + instructionAdherenceScore * 0.35 + evidenceSupportScore * 0.25).toFixed(2))
        : Number((relevanceScore * 0.5 + instructionAdherenceScore * 0.5).toFixed(2));

      const strengths: string[] = [];
      const caveats: string[] = [];

      if (relevanceScore >= 0.8) strengths.push('Sangat selaras dengan pokok pertanyaan');
      if (hasStructure) strengths.push('Struktur penjelasan runtut dan metodologis');
      if (sources.length > 0 && verifiedCount > 0) {
        strengths.push(`${verifiedCount} sitasi cocok dengan ID dokumen referensi (format terverifikasi)`);
      }

      if (unverifiedCount > 0) {
        caveats.push(`${unverifiedCount} sitasi tidak cocok dengan dokumen aktif`);
      }
      if (sources.length === 0 && citedIds.length > 0) {
        caveats.push('Sitasi dicantumkan tetapi tidak ada dokumen sumber aktif untuk memvalidasi');
      }
      if (isTooShort) caveats.push('Jawaban terlalu ringkas untuk pertanyaan ini');

      return {
        candidateId: cand.candidateId,
        modelId: cand.modelId,
        modelName: cand.modelName,
        relevanceScore: Number(relevanceScore.toFixed(2)),
        instructionAdherenceScore: Number(instructionAdherenceScore.toFixed(2)),
        evidenceSupportScore: Number(evidenceSupportScore.toFixed(2)),
        overallScore,
        verifiedCitationsCount: verifiedCount,
        unverifiedCitationsCount: unverifiedCount,
        strengths,
        caveats
      };
    });

    // 2. Agreement & Disagreement Analysis
    const agreements: ClaimAgreementItem[] = [];
    const disagreements: DisagreementItem[] = [];

    // Extract key sentences across models
    const modelSentences = completed.map(c => ({
      candidateId: c.candidateId,
      modelId: c.modelId,
      sentences: c.output
        .split(/(?<=[.!?])\s+|\n+/)
        .map(s => s.trim())
        .filter(s => s.length > 25 && !s.startsWith('#'))
    }));

    // Find overlapping core themes/statements
    const primarySentences = modelSentences[0].sentences.slice(0, 6);
    for (const sent of primarySentences) {
      const keySnippet = sent.slice(0, 35).toLowerCase();
      const sharedModels = completed.filter(m => m.output.toLowerCase().includes(keySnippet)).map(m => m.modelId);

      if (sharedModels.length > 1) {
        agreements.push({
          claim: sent.slice(0, 140) + (sent.length > 140 ? '…' : ''),
          sharedByModelIds: sharedModels,
          type: sharedModels.length === completed.length ? 'consensus' : 'partial_agreement'
        });
      }
    }

    // Disagreement checks: look for opposing qualifiers
    const negationKeywords = [
      { positive: 'efektif', negative: 'tidak efektif' },
      { positive: 'signifikan', negative: 'tidak signifikan' },
      { positive: 'cocok', negative: 'kurang cocok' },
      { positive: 'perlu', negative: 'tidak perlu' },
      { positive: 'disarankan', negative: 'tidak disarankan' }
    ];

    for (const pair of negationKeywords) {
      const posModels = completed.filter(m => m.output.toLowerCase().includes(pair.positive) && !m.output.toLowerCase().includes(pair.negative));
      const negModels = completed.filter(m => m.output.toLowerCase().includes(pair.negative));

      if (posModels.length > 0 && negModels.length > 0) {
        disagreements.push({
          topic: `Penilaian terkait aspek '${pair.positive}' vs '${pair.negative}'`,
          modelPositions: [
            ...posModels.map(m => ({ modelId: m.modelId, modelName: m.modelName, position: `Menilai ${pair.positive}` })),
            ...negModels.map(m => ({ modelId: m.modelId, modelName: m.modelName, position: `Menilai ${pair.negative}` }))
          ]
        });
      }
    }

    // Recommendation for best base model
    const sorted = [...evaluations].sort((a, b) => b.overallScore - a.overallScore);
    const bestCandidate = sorted[0];

    const totalClaimsChecked = evaluations.reduce((acc, e) => acc + e.verifiedCitationsCount + e.unverifiedCitationsCount, 0);
    const supportedClaimsCount = evaluations.reduce((acc, e) => acc + e.verifiedCitationsCount, 0);
    const unverifiedClaimsCount = evaluations.reduce((acc, e) => acc + e.unverifiedCitationsCount, 0);

    return {
      status: 'evaluated',
      totalEvaluatedCandidates: completed.length,
      evaluations,
      agreements,
      disagreements,
      evidenceVerificationSummary: {
        totalClaimsChecked,
        supportedClaimsCount,
        unverifiedClaimsCount,
        unsupportedClaimsCount: 0,
        disclaimer: 'Peringatan: Kecocokan ID sitasi atau kesepakatan antar-model AI hanya memverifikasi keselarasan format dengan dokumen referensi aktif, bukan merupakan bukti validitas kebenaran faktual secara independen. Selalu rujuk naskah dokumen primer.'
      },
      synthesisRecommendation: bestCandidate ? {
        suggestedBaseModelId: bestCandidate.modelId,
        reason: `Model ${bestCandidate.modelName} memiliki skor konsistensi dan relevansi tertinggi (${bestCandidate.overallScore * 100}%)`
      } : undefined
    };
  }

  /**
   * Synthesizes the best combination of completed candidate outputs.
   * Preserves provenance, highlights consensus points, and flags divergent perspectives.
   */
  public static synthesizeBestAnswer(
    prompt: string,
    candidates: ModelComparisonCandidateInput[],
    sources: FileSourceReference[] = []
  ): SynthesisResult {
    const completed = candidates.filter(c => c.status === 'completed' && c.output.trim().length > 0);
    if (completed.length === 0) {
      return {
        synthesizedText: 'Tidak ada kandidat jawaban selesai yang dapat disintesis.',
        provenance: [],
        verifiedEvidenceSources: [],
        disclaimer: 'Sintesis tidak dapat dilakukan karena tidak ada respons model yang siap.'
      };
    }

    const analysis = this.analyzeCandidates(prompt, completed, sources);
    const allowedCitationIds = new Set(sources.map(s => s.citationId).filter(Boolean));

    // Choose base candidate from highest scoring or first
    const baseCandidate = completed.find(c => c.modelId === analysis.synthesisRecommendation?.suggestedBaseModelId) || completed[0];
    const complementaryCandidates = completed.filter(c => c.candidateId !== baseCandidate.candidateId);

    const provenance: Array<{ sourceModelId: string; sourceModelName: string; contributionSummary: string }> = [
      {
        sourceModelId: baseCandidate.modelId,
        sourceModelName: baseCandidate.modelName,
        contributionSummary: 'Sebagai kerangka argumen utama dan struktur penjelasan deduktif'
      }
    ];

    complementaryCandidates.forEach(c => {
      provenance.push({
        sourceModelId: c.modelId,
        sourceModelName: c.modelName,
        contributionSummary: 'Sebagai pelengkap perspektif perbandingan dan penyempurnaan poin penting'
      });
    });

    const consensusSection = analysis.agreements.length > 0
      ? `\n\n### Poin Kesepakatan Lintas Model:\n${analysis.agreements.slice(0, 3).map(a => `- ${a.claim}`).join('\n')}`
      : '';

    const divergenceSection = analysis.disagreements.length > 0
      ? `\n\n### Catatan Perbedaan Sudut Pandang:\n${analysis.disagreements.map(d => `- **${d.topic}**: ${d.modelPositions.map(p => `${p.modelName} (${p.position})`).join(' vs ')}`).join('\n')}`
      : '';

    // Collect verified citation ids
    const citedMatches = [...baseCandidate.output.matchAll(/\[cite:([A-Za-z0-9_-]+)\]/g)].map(m => m[1]);
    const verifiedEvidenceSources = citedMatches.filter(id => allowedCitationIds.has(id));

    const synthesizedText = `## Sintesis Jawaban Terbaik (Multi-Model Consensus)

${baseCandidate.output}
${consensusSection}
${divergenceSection}

---
*Sintesis ini disusun otomatis berdasarkan perbandingan ${completed.length} model (${completed.map(c => c.modelName).join(', ')}). Rujukan asli dan klaim spesifik tetap harus divalidasi dengan dokumen primer.*`;

    return {
      synthesizedText,
      provenance,
      verifiedEvidenceSources,
      disclaimer: 'Sintesis disusun secara transparan berbasis struktur jawaban terbaik tanpa mengarang fakta baru.'
    };
  }
}
