import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ArtifactDiffViewer } from '../../features/workspace/components/ArtifactDiffViewer';
import type { WorkspaceArtifact, ArtifactVersionRecord } from '../../features/workspace/types';

function makeArtifact(content: string, previousContent: string): WorkspaceArtifact {
  const previous: ArtifactVersionRecord = {
    id: 'version-1',
    artifactId: 'artifact-1',
    version: 1,
    title: 'Versi awal',
    content: previousContent,
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
  };

  return {
    id: 'artifact-1',
    title: 'Draf',
    type: 'DOCUMENT',
    content,
    version: 2,
    versions: [previous],
    updatedAt: new Date('2026-01-02T00:00:00.000Z').toISOString()
  };
}

describe('ArtifactDiffViewer', () => {
  it('explains when a large unmatched region is shown approximately', () => {
    const previousContent = Array.from({ length: 520 }, (_, index) => `Versi lama ${index}`).join('\n');
    const currentContent = Array.from({ length: 520 }, (_, index) => `Versi baru ${index}`).join('\n');

    render(<ArtifactDiffViewer currentArtifact={makeArtifact(currentContent, previousContent)} />);

    expect(screen.getByRole('note')).toHaveTextContent(/ditampilkan sebagai penghapusan dan penambahan/i);
  });

  it('does not show the approximation notice for an exact comparison', () => {
    render(<ArtifactDiffViewer currentArtifact={makeArtifact('Judul\nIsi baru', 'Judul\nIsi lama')} />);

    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.getByText('Isi baru')).toBeInTheDocument();
    expect(screen.getByText('Isi lama')).toBeInTheDocument();
  });

  it('keeps the full diff reachable while rendering only one page at a time', () => {
    const previousContent = ['judul sama', ...Array.from({ length: 520 }, (_, index) => `lama ${index}`), 'penutup sama'].join('\n');
    const currentContent = ['judul sama', ...Array.from({ length: 520 }, (_, index) => `baru ${index}`), 'penutup sama'].join('\n');

    const { container } = render(<ArtifactDiffViewer currentArtifact={makeArtifact(currentContent, previousContent)} />);
    const navigation = screen.getByRole('navigation', { name: 'Navigasi halaman perbandingan' });

    expect(within(navigation).getByText('Baris 1–250 dari 1042')).toBeInTheDocument();
    expect(container.querySelectorAll('div.flex.items-start.gap-2')).toHaveLength(250);
    fireEvent.change(within(navigation).getByRole('combobox', { name: 'Halaman perbandingan' }), { target: { value: '4' } });

    expect(within(navigation).getByText('Baris 1001–1042 dari 1042')).toBeInTheDocument();
    expect(container.querySelectorAll('div.flex.items-start.gap-2')).toHaveLength(42);
    expect(screen.getByText('baru 519')).toBeInTheDocument();
  });

  it('jumps past long unchanged sections to the next changed page', () => {
    const sharedLines = Array.from({ length: 600 }, (_, index) => `baris tetap ${index}`);
    const previousContent = sharedLines.join('\n');
    const currentContent = [...sharedLines, 'baris baru di akhir'].join('\n');

    render(<ArtifactDiffViewer currentArtifact={makeArtifact(currentContent, previousContent)} />);

    expect(screen.queryByText('baris baru di akhir')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Perubahan berikutnya' }));

    const navigation = screen.getByRole('navigation', { name: 'Navigasi halaman perbandingan' });
    expect(within(navigation).getByText('Baris 501–601 dari 601')).toBeInTheDocument();
    expect(screen.getByText('baris baru di akhir')).toBeInTheDocument();
  });
});
