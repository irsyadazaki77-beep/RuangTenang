import type { ResearchClaim, FileSourceReference } from '../../../shared/contracts/files.js';
import { randomUUID } from 'node:crypto';

export interface ClaimVerificationResult {
  claims: ResearchClaim[];
  acceptedCitationIds: string[];
  rejectedCitationIds: string[];
  semanticSupportVerified: false;
}

/** Validates citation identity against one immutable retrieval result. It makes no semantic support claim. */
export function verifyClaimsAgainstEvidence(answer: string, sources: FileSourceReference[]): ClaimVerificationResult {
  const allowed = new Set(sources.map(source => source.citationId).filter((id): id is string => Boolean(id)));
  const accepted = new Set<string>();
  const rejected = new Set<string>();
  const claims = answer.split(/(?<=[.!?])\s+|\n+/).map(text => text.trim()).filter(text => text.length > 30).map(text => {
    const markerIds = [...text.matchAll(/\[cite:([A-Za-z0-9_-]+)\]/g)].map(match => match[1]);
    const citationIds = markerIds.filter(id => allowed.has(id));
    for (const id of markerIds) (allowed.has(id) ? accepted : rejected).add(id);
    return { id: randomUUID(), text: text.slice(0, 2000), citationIds, verificationStatus: citationIds.length ? 'unverified' as const : 'unsupported' as const };
  });
  return { claims, acceptedCitationIds: [...accepted], rejectedCitationIds: [...rejected], semanticSupportVerified: false };
}
