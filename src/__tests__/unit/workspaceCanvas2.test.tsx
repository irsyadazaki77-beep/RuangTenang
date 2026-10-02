import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ArtifactCanvas } from '../../features/workspace/components/ArtifactCanvas';
import { WorkspaceCanvasPane } from '../../features/workspace/components/WorkspaceCanvasPane';
import { WorkspaceArtifact } from '../../features/workspace/types';

vi.mock('../../components/common/LazyMarkdown', () => ({
  LazyMarkdown: ({ content }: { content: string }) => <div data-testid="markdown-content">{content}</div>
}));

const mockArtifact: WorkspaceArtifact = {
  id: 'art_123',
  title: 'Analisis Metodologi',
  type: 'DOCUMENT',
  content: '# Analisis Metodologi\n\nPenelitian ini menggunakan pendekatan kualitatif.',
  version: 2,
  versions: [
    {
      id: 'ver_1',
      artifactId: 'art_123',
      version: 1,
      title: 'Draf Awal',
      content: '# Analisis Draf\n\nIsi awal penelitian.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'ver_2',
      artifactId: 'art_123',
      version: 2,
      title: 'Analisis Metodologi',
      content: '# Analisis Metodologi\n\nPenelitian ini menggunakan pendekatan kualitatif.',
      createdAt: new Date().toISOString()
    }
  ],
  updatedAt: new Date().toISOString()
};

describe('Workspace Canvas 2.0 UX & Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders canvas header hierarchy with type icon, title, version, and save badge', () => {
    render(
      <ArtifactCanvas
        artifact={mockArtifact}
        onUpdateArtifact={vi.fn()}
        onSaveArtifact={vi.fn()}
      />
    );

    expect(screen.getByText('Analisis Metodologi')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('Tersimpan')).toBeInTheDocument();
  });

  it('allows inline title editing with Enter key to save', async () => {
    const onUpdateArtifact = vi.fn();
    const onSaveArtifact = vi.fn();

    render(
      <ArtifactCanvas
        artifact={mockArtifact}
        onUpdateArtifact={onUpdateArtifact}
        onSaveArtifact={onSaveArtifact}
      />
    );

    const titleBtn = screen.getByRole('button', { name: /Analisis Metodologi/ });
    fireEvent.click(titleBtn);

    const input = screen.getByDisplayValue('Analisis Metodologi');
    fireEvent.change(input, { target: { value: 'Metodologi Penelitian Baru' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onUpdateArtifact).toHaveBeenCalledWith({ title: 'Metodologi Penelitian Baru' });
    expect(onSaveArtifact).toHaveBeenCalledWith(mockArtifact.content, 'Metodologi Penelitian Baru');
  });

  it('switches seamlessly between view modes: preview, edit, raw, and diff', () => {
    render(
      <ArtifactCanvas
        artifact={mockArtifact}
        onUpdateArtifact={vi.fn()}
        onSaveArtifact={vi.fn()}
      />
    );

    // Default mode is preview
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();

    // Switch to edit mode via mode segmented control
    fireEvent.click(screen.getByTitle('Edit Dokumen Langsung (Autosave)'));
    const textarea = screen.getByPlaceholderText(/Ketik atau sesuaikan draf dokumen/);
    expect(textarea).toBeInTheDocument();

    // Switch to raw mode
    fireEvent.click(screen.getByRole('button', { name: 'Kode' }));
    expect(screen.getByText(/Raw Source/)).toBeInTheDocument();

    // Switch to diff mode
    fireEvent.click(screen.getByRole('button', { name: 'Diff' }));
    expect(screen.queryByPlaceholderText(/Ketik atau sesuaikan/)).not.toBeInTheDocument();
  });

  it('protects dirty state and provides a manual Save button with shortcut', async () => {
    const onSaveArtifact = vi.fn();
    render(
      <ArtifactCanvas
        artifact={mockArtifact}
        onUpdateArtifact={vi.fn()}
        onSaveArtifact={onSaveArtifact}
      />
    );

    // Switch to Edit
    fireEvent.click(screen.getByTitle('Edit Dokumen Langsung (Autosave)'));
    const textarea = screen.getByPlaceholderText(/Ketik atau sesuaikan draf dokumen/);

    // Type new text
    fireEvent.change(textarea, { target: { value: '# Teks Draf Terupdate' } });

    // Header should now show unsaved state and manual Save button
    expect(screen.getByText('Belum disimpan')).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /Simpan/ });
    expect(saveBtn).toBeInTheDocument();

    // Click manual save
    fireEvent.click(saveBtn);
    expect(onSaveArtifact).toHaveBeenCalledWith('# Teks Draf Terupdate', mockArtifact.title);
  });

  it('opens More menu with Version History, Duplicate, Export, and Delete actions', () => {
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();

    render(
      <ArtifactCanvas
        artifact={mockArtifact}
        onDuplicateArtifact={onDuplicate}
        onDeleteArtifact={onDelete}
      />
    );

    const moreBtn = screen.getByRole('button', { name: 'Menu Opsi Lainnya' });
    fireEvent.click(moreBtn);

    expect(screen.getByText('Riwayat Versi')).toBeInTheDocument();
    expect(screen.getByText('Pusat Ekspor (.docx, .pdf)')).toBeInTheDocument();
    expect(screen.getByText('Salin Seluruh Konten')).toBeInTheDocument();
    expect(screen.getByText('Duplikat Dokumen')).toBeInTheDocument();
    expect(screen.getByText('Hapus Artefak Ini')).toBeInTheDocument();

    // Trigger duplicate
    fireEvent.click(screen.getByText('Duplikat Dokumen'));
    expect(onDuplicate).toHaveBeenCalledWith(mockArtifact.id);
  });

  it('opens Version History modal with version snapshots and preview/diff options', () => {
    render(
      <ArtifactCanvas
        artifact={mockArtifact}
        onUpdateArtifact={vi.fn()}
      />
    );

    // Open version history
    const versionBadge = screen.getByRole('button', { name: 'v2' });
    fireEvent.click(versionBadge);

    expect(screen.getByText('Riwayat Versi Artefak')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('Draf Awal')).toBeInTheDocument();
    expect(screen.getByText('Versi Aktif')).toBeInTheDocument();
  });

  it('supports Tab Strip search and filter in WorkspaceCanvasPane when multiple artifacts exist', () => {
    const artCode: WorkspaceArtifact = {
      id: 'art_code',
      title: 'Skrip Python Data',
      type: 'CODE',
      language: 'python',
      content: 'print("data")',
      version: 1,
      updatedAt: new Date().toISOString()
    };
    const artCitation: WorkspaceArtifact = {
      id: 'art_cite',
      title: 'Daftar Referensi IEEE',
      type: 'CITATION',
      content: '[1] Author',
      version: 1,
      updatedAt: new Date().toISOString()
    };

    const onSelectArtifact = vi.fn();

    render(
      <WorkspaceCanvasPane
        artifacts={[mockArtifact, artCode, artCitation, { ...mockArtifact, id: 'art_4', title: 'Outline Skripsi', type: 'OUTLINE' }]}
        activeArtifact={mockArtifact}
        activeArtifactId={mockArtifact.id}
        isCanvasOpen={true}
        isCanvasExpanded={false}
        isStreaming={false}
        mobileActiveTab="canvas"
        onSelectArtifact={onSelectArtifact}
        onCloseCanvas={vi.fn()}
        onToggleExpand={vi.fn()}
        onUpdateActiveArtifact={vi.fn()}
        onSaveArtifact={vi.fn()}
        onRollbackVersion={vi.fn()}
        onRequestRevision={vi.fn()}
        onCreateNewArtifact={vi.fn()}
        onSetMobileActiveTab={vi.fn()}
      />
    );

    // Search input should be rendered because artifacts > 3
    const searchInput = screen.getByPlaceholderText('Cari...');
    expect(searchInput).toBeInTheDocument();

    // Type query to filter
    fireEvent.change(searchInput, { target: { value: 'Python' } });
    expect(screen.getByText('Skrip Python Data')).toBeInTheDocument();
    expect(screen.queryByText('Daftar Referensi IEEE')).not.toBeInTheDocument();
  });
});
