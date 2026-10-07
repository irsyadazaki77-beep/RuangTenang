import { describe, expect, it } from 'vitest';
import { validateResearchCitations } from '../../features/workspace/utils/citationIntegrity';

describe('workspace citation integrity', () => {
  it('keeps markers only when they resolve to evidence from this request', () => {
    const result = validateResearchCitations('Claim [cite:SRC_1]. Another claim [cite:SRC_FAKE].', [
      { citationId: 'SRC_1', documentId: 'att-a', filename: 'paper.pdf', sourceRef: 'paper.pdf [Halaman 2]' }
    ]);
    expect(result.content).toContain('[cite:SRC_1]');
    expect(result.content).toContain('[referensi sumber tidak dikenali]');
    expect(result.removedUnknownCitationCount).toBe(1);
    expect(result.validCitationIds).toEqual(['SRC_1']);
    expect(result.verification).toBe('unverified');
  });

  it('reports claims without source markers without inventing confidence', () => {
    const result = validateResearchCitations('A long factual sentence that contains no linked source citation.', []);
    expect(result.unreferencedSentenceCount).toBe(1);
    expect(result.verification).toBe('unverified');
  });
});
