import { describe, expect, it } from 'vitest';
import { verifyClaimsAgainstEvidence } from '../../services/file-intelligence/claimVerificationService.js';

describe('claim citation identity verification', () => {
  it('rejects unknown source IDs and never presents marker matching as semantic proof', () => {
    const result = verifyClaimsAgainstEvidence('A factual statement with a traceable source marker [cite:SRC_1]. Another factual statement references [cite:SRC_99].', [
      { citationId: 'SRC_1', documentId: 'file-a', filename: 'paper.pdf', sourceRef: 'paper.pdf [Halaman 2]' }
    ]);
    expect(result.acceptedCitationIds).toEqual(['SRC_1']);
    expect(result.rejectedCitationIds).toEqual(['SRC_99']);
    expect(result.claims[0]?.verificationStatus).toBe('unverified');
    expect(result.claims[1]?.verificationStatus).toBe('unsupported');
    expect(result.semanticSupportVerified).toBe(false);
  });
});
