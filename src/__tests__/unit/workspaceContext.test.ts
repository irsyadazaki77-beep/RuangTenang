import { describe, expect, it } from 'vitest';
import { buildWorkspaceContextNote, buildWorkspaceRequestSnapshot } from '../../features/workspace/utils/workspaceContext';

describe('Workspace request context', () => {
  it('captures a request snapshot and prioritizes a selected Canvas passage', () => {
    const snapshot = buildWorkspaceRequestSnapshot({
      prompt: 'Perbaiki bagian ini',
      workspaceId: 'workspace-a',
      model: 'auto',
      config: { aiModel: 'auto', responseMode: 'Seimbang', responseStyle: 'Default', presetId: 'academic' },
      files: [{ id: 'file-1', name: 'Jurnal.pdf' }],
      artifact: { id: 'art-1', title: 'Laporan', type: 'DOCUMENT', version: 2, content: 'Seluruh isi laporan' },
      selectedText: 'Kesimpulan yang dipilih',
      requestId: 'request-1',
      createdAt: new Date('2026-10-03T00:00:00Z')
    });

    expect(snapshot.workspaceId).toBe('workspace-a');
    expect(snapshot.requestId).toBe('request-1');
    const note = buildWorkspaceContextNote(snapshot)!;
    expect(note.indexOf('Selected text')).toBeLessThan(note.indexOf('Active Canvas document'));
    expect(note).toContain('Jurnal.pdf');
    expect(note).toContain('Seluruh isi laporan');
  });

  it('omits a context note when there are no active sources', () => {
    const snapshot = buildWorkspaceRequestSnapshot({
      prompt: 'Halo', model: 'auto',
      config: { aiModel: 'auto', responseMode: 'Seimbang', responseStyle: 'Default' }
    });
    expect(buildWorkspaceContextNote(snapshot)).toBeUndefined();
  });
});
