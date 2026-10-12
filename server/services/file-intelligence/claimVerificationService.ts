import type { ResearchClaim, FileSourceReference } from '../../../shared/contracts/files.js';
import { randomUUID } from 'node:crypto';

export interface ClaimVerificationResult {
  claims: ResearchClaim[];
  acceptedCitationIds: string[];
  rejectedCitationIds: string[];
  semanticSupportVerified: false;
  assessmentMethod: 'exact_text_match_and_identity' | 'identity_only';
}

function normalizeEvidenceText(value: string): string {
  return value.replace(/\[cite:[A-Za-z0-9_-]+\]/g, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

/** Validates source identity and exact quotation matches. It does not assess paraphrase or semantic entailment. */
export function verifyClaimsAgainstEvidence(answer: string, sources: FileSourceReference[]): ClaimVerificationResult {
  const allowed = new Set(sources.map(source => source.citationId).filter((id): id is string => Boolean(id)));
  const accepted = new Set<string>();
  const rejected = new Set<string>();
  let exactTextMatchFound = false;
  const claims = answer.split(/(?<=[.!?])\s+(?!\[cite:)|\n+/).map(text => text.trim()).filter(text => text.length > 10).map(text => {
    const markerIds = [...text.matchAll(/\[cite:([A-Za-z0-9_-]+)\]/g)].map(match => match[1]);
    const citationIds = markerIds.filter(id => allowed.has(id));
    for (const id of markerIds) (allowed.has(id) ? accepted : rejected).add(id);
    const claimText = text.replace(/\[cite:[A-Za-z0-9_-]+\]/g, '').trim();
    const normalizedClaim = normalizeEvidenceText(claimText);
    const evidence = sources.filter(source => source.citationId && citationIds.includes(source.citationId)).map(source => {
      const excerpt = source.snippet || '';
      const exactTextMatch = Boolean(normalizedClaim && normalizeEvidenceText(excerpt).includes(normalizedClaim));
      exactTextMatchFound ||= exactTextMatch;
      return { citationId: source.citationId!, documentId: source.documentId, filename: source.filename, sourceRef: source.sourceRef, excerpt, exactTextMatch };
    });
    const hasUnknownId = markerIds.some(id => !allowed.has(id));
    const verificationStatus = !citationIds.length || hasUnknownId
      ? 'unsupported' as const
      : evidence.some(item => item.exactTextMatch)
        ? 'supported' as const
        : 'unverified' as const;
    return { id: randomUUID(), text: claimText.slice(0, 2000), citationIds, verificationStatus, evidence };
  });
  return {
    claims, acceptedCitationIds: [...accepted], rejectedCitationIds: [...rejected], semanticSupportVerified: false,
    assessmentMethod: exactTextMatchFound ? 'exact_text_match_and_identity' : 'identity_only'
  };
}
