import { describe, expect, it } from 'vitest';
import { parseArtifactsFromText } from '../../features/workspace/utils/artifactParser';

describe('Workspace artifact streaming identity', () => {
  it('keeps a stable artifact ID as streamed content grows and finalizes', () => {
    const partial = '<artifact type="document" title="Ringkasan">Isi sebagian';
    const first = parseArtifactsFromText(partial, true, 'request_123');
    const next = parseArtifactsFromText(`${partial} lengkap</artifact>`, true, 'request_123');
    const final = parseArtifactsFromText(`${partial} lengkap</artifact>`, false, 'request_123');

    expect(first.activeStreamingArtifact?.id).toBe(next.artifacts[0].id);
    expect(next.artifacts[0].id).toBe(final.artifacts[0].id);
    expect(final.artifacts[0].content).toBe('Isi sebagian lengkap');
  });

  it('does not create empty artifacts', () => {
    const parsed = parseArtifactsFromText('<artifact type="document" title="Kosong"></artifact>', false, 'request_456');
    expect(parsed.artifacts).toHaveLength(0);
    expect(parsed.activeStreamingArtifact).toBeNull();
  });
});
