import { ArtifactPatch } from '../types';

export type ArtifactPatchValidation =
  | { valid: true; content: string }
  | { valid: false; reason: 'artifact_mismatch' | 'stale_version' | 'stale_content' | 'invalid_range' | 'target_mismatch' };

/** Validate the request snapshot before applying a scoped edit. Never falls back to a whole-document replacement. */
export function applyArtifactPatch(args: {
  patch: ArtifactPatch;
  artifactId: string;
  currentVersion: number;
  currentContent: string;
}): ArtifactPatchValidation {
  const { patch, artifactId, currentVersion, currentContent } = args;
  if (patch.artifactId !== artifactId) return { valid: false, reason: 'artifact_mismatch' };
  if (patch.baseVersion !== currentVersion) return { valid: false, reason: 'stale_version' };
  if (patch.baseContent !== currentContent) return { valid: false, reason: 'stale_content' };
  if (!Number.isInteger(patch.start) || !Number.isInteger(patch.end) || patch.start < 0 || patch.end < patch.start || patch.end > currentContent.length) {
    return { valid: false, reason: 'invalid_range' };
  }
  if (currentContent.slice(patch.start, patch.end) !== patch.originalText) return { valid: false, reason: 'target_mismatch' };
  return {
    valid: true,
    content: `${currentContent.slice(0, patch.start)}${patch.replacementText}${currentContent.slice(patch.end)}`
  };
}

/** Limit inline requests to the selection and nearby text so large documents are not sent unnecessarily. */
export function getArtifactSelectionContext(content: string, start: number, end: number, radius = 700): string {
  const safeStart = Math.max(0, Math.min(content.length, start));
  const safeEnd = Math.max(safeStart, Math.min(content.length, end));
  const from = Math.max(0, safeStart - radius);
  const to = Math.min(content.length, safeEnd + radius);
  return `${from > 0 ? '…' : ''}${content.slice(from, safeStart)}<selected_text>${content.slice(safeStart, safeEnd)}</selected_text>${content.slice(safeEnd, to)}${to < content.length ? '…' : ''}`;
}
