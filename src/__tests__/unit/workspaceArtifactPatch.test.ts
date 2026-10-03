import { describe, expect, it } from 'vitest';
import { applyArtifactPatch, getArtifactSelectionContext } from '../../features/workspace/utils/artifactPatch';
import { ArtifactPatch } from '../../features/workspace/types';

const baseContent = '# Report\n\nThe data is bad.\n\nConclusion: revise the plan.';
const patch: ArtifactPatch = {
  artifactId: 'report',
  baseVersion: 3,
  baseContent,
  start: baseContent.indexOf('The data is bad.'),
  end: baseContent.indexOf('The data is bad.') + 'The data is bad.'.length,
  originalText: 'The data is bad.',
  replacementText: 'The data is incomplete.'
};

describe('artifact patches', () => {
  it('changes only the selected range and preserves surrounding document content', () => {
    const result = applyArtifactPatch({ patch, artifactId: 'report', currentVersion: 3, currentContent: baseContent });
    expect(result).toEqual({ valid: true, content: '# Report\n\nThe data is incomplete.\n\nConclusion: revise the plan.' });
  });

  it('rejects patches for stale versions or locally edited content', () => {
    expect(applyArtifactPatch({ patch, artifactId: 'report', currentVersion: 4, currentContent: baseContent })).toEqual({ valid: false, reason: 'stale_version' });
    expect(applyArtifactPatch({ patch, artifactId: 'report', currentVersion: 3, currentContent: `${baseContent}\nManual edit` })).toEqual({ valid: false, reason: 'stale_content' });
  });

  it('rejects a selection that no longer matches its original text', () => {
    expect(applyArtifactPatch({ patch, artifactId: 'report', currentVersion: 3, currentContent: baseContent.replace('The data is bad.', 'The data changed.') })).toEqual({ valid: false, reason: 'stale_content' });
  });

  it('builds bounded context around the selected text', () => {
    const text = `before ${'x'.repeat(2000)} selected ${'y'.repeat(2000)} after`;
    const start = text.indexOf('selected');
    const context = getArtifactSelectionContext(text, start, start + 8, 40);
    expect(context).toContain('<selected_text>selected</selected_text>');
    expect(context.length).toBeLessThan(140);
  });
});
