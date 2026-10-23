import type { WorkspaceFileAttachment } from '../types';

/** True only when a ready attachment has a usable id and an analysis path. */
export function isWorkspaceAttachmentAnalyzable(
  file: WorkspaceFileAttachment
): file is WorkspaceFileAttachment & { id: string } {
  const hasDirectVisualPath = (file.fileKind === 'image' || file.mimeType?.startsWith('image/')) && file.visualAnalysisAvailable;
  return file.status === 'ready'
    && Boolean(file.id)
    && !(file.previewOnly && !file.ocrApplied && !hasDirectVisualPath);
}
