import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ArtifactCanvas } from '../../features/workspace/components/ArtifactCanvas';
import { WorkspaceCanvasPane } from '../../features/workspace/components/WorkspaceCanvasPane';
import { WorkspaceArtifact } from '../../features/workspace/types';
import { ArtifactPatch } from '../../features/workspace/types';

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

function CanvasDraftHarness() {
  const [isOpen, setIsOpen] = React.useState(true);
  const [draft, setDraft] = React.useState<string>();
  return <>
    {!isOpen && <button type="button" onClick={() => setIsOpen(true)}>Buka Canvas</button>}
    <WorkspaceCanvasPane
      artifacts={[mockArtifact]} activeArtifact={mockArtifact} activeArtifactId={mockArtifact.id} draftContent={draft}
      isCanvasOpen={isOpen} isCanvasExpanded={false} isStreaming={false} mobileActiveTab="chat"
      onSelectArtifact={vi.fn()} onCloseCanvas={() => setIsOpen(false)} onToggleExpand={vi.fn()}
      onUpdateActiveArtifact={vi.fn()} onSaveArtifact={vi.fn()} onRollbackVersion={vi.fn()}
      onRequestRevision={vi.fn()} onCreateNewArtifact={vi.fn()} onSetMobileActiveTab={vi.fn()}
      onDraftContentChange={(_artifactId, content) => setDraft(content)}
    />
  </>;
}

describe('Workspace Canvas 2.0 UX & Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the canvas header focused on the document and save state', () => {
    render(
      <ArtifactCanvas
        artifact={mockArtifact}
        onUpdateArtifact={vi.fn()}
        onSaveArtifact={vi.fn()}
      />
    );

    expect(screen.getByText('Analisis Metodologi')).toBeInTheDocument();
    expect(screen.getByText('Tersimpan')).toBeInTheDocument();
    expect(screen.queryByText('v2')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Menu Opsi Lainnya' }));
    expect(screen.getByText('Riwayat Versi')).toBeInTheDocument();
  });

  it('restores an unsaved document draft after closing and reopening Canvas', async () => {
    render(<CanvasDraftHarness />);
    fireEvent.click(await screen.findByTitle('Edit Dokumen Langsung (Autosave)'));
    const textarea = screen.getByPlaceholderText(/Ketik atau sesuaikan draf dokumen/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '# Draf yang belum disimpan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tutup Canvas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buka Canvas' }));
    fireEvent.click(screen.getByTitle('Edit Dokumen Langsung (Autosave)'));
    expect(screen.getByPlaceholderText(/Ketik atau sesuaikan draf dokumen/)).toHaveValue('# Draf yang belum disimpan');
    expect(screen.getByText('Belum disimpan')).toBeInTheDocument();
  });

  it('allows inline title editing with Enter key to save', async () => {
    const onUpdateArtifact = vi.fn();
    const onSaveArtifact = vi.fn().mockResolvedValue({ ...mockArtifact, title: 'Metodologi Penelitian Baru' });

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

    await waitFor(() => expect(onUpdateArtifact).toHaveBeenCalledWith(expect.objectContaining({ title: 'Metodologi Penelitian Baru' })));
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

    // Advanced views stay available from More.
    fireEvent.click(screen.getByRole('button', { name: 'Menu Opsi Lainnya' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lihat Markdown atau kode' }));
    expect(screen.getByText(/Raw Source/)).toBeInTheDocument();

    // Switch to diff mode
    fireEvent.click(screen.getByRole('button', { name: 'Menu Opsi Lainnya' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bandingkan perubahan' }));
    expect(screen.queryByPlaceholderText(/Ketik atau sesuaikan/)).not.toBeInTheDocument();
  });

  it('protects dirty state and provides a manual Save button with shortcut', async () => {
    const onSaveArtifact = vi.fn().mockResolvedValue({ ...mockArtifact, content: '# Teks Draf Terupdate' });
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

  it('proposes a scoped rewrite and applies it as a saved version only after acceptance', async () => {
    const selected = 'Penelitian ini menggunakan pendekatan kualitatif.';
    const start = mockArtifact.content.indexOf(selected);
    const patch: ArtifactPatch = {
      artifactId: mockArtifact.id,
      baseVersion: mockArtifact.version,
      baseContent: mockArtifact.content,
      start,
      end: start + selected.length,
      originalText: selected,
      replacementText: 'Studi ini menerapkan pendekatan kualitatif.'
    };
    const onRequestInlineEdit = vi.fn();
    const onSaveArtifact = vi.fn().mockResolvedValue({ ...mockArtifact, version: mockArtifact.version + 1, updatedAt: new Date().toISOString() });
    const onDismissInlineEdit = vi.fn();
    const { rerender } = render(<ArtifactCanvas artifact={mockArtifact} onRequestInlineEdit={onRequestInlineEdit} onSaveArtifact={onSaveArtifact} />);

    fireEvent.click(screen.getByTitle('Edit Dokumen Langsung (Autosave)'));
    const textarea = screen.getByPlaceholderText(/Ketik atau sesuaikan draf dokumen/) as HTMLTextAreaElement;
    textarea.setSelectionRange(start, start + selected.length);
    fireEvent.select(textarea);
    fireEvent.click(screen.getByRole('button', { name: 'Improve teks terpilih' }));
    expect(onRequestInlineEdit).toHaveBeenCalledWith({ artifactId: mockArtifact.id, start, end: start + selected.length, text: selected }, expect.any(String), mockArtifact);

    rerender(<ArtifactCanvas artifact={mockArtifact} onRequestInlineEdit={onRequestInlineEdit} onSaveArtifact={onSaveArtifact} inlineEditPatch={patch} onDismissInlineEdit={onDismissInlineEdit} />);
    expect(screen.getByText('Studi ini menerapkan pendekatan kualitatif.')).toBeInTheDocument();
    expect(screen.getByText(selected)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }));

    await waitFor(() => expect(onSaveArtifact).toHaveBeenCalledWith(
      mockArtifact.content.replace(selected, 'Studi ini menerapkan pendekatan kualitatif.'), mockArtifact.title, true, mockArtifact.updatedAt
    ));
    expect(onDismissInlineEdit).toHaveBeenCalled();
  });

  it('rejects a stale inline proposal without saving', async () => {
    const oldText = 'Penelitian ini menggunakan pendekatan kualitatif.';
    const start = mockArtifact.content.indexOf(oldText);
    const onSaveArtifact = vi.fn();
    const stalePatch: ArtifactPatch = {
      artifactId: mockArtifact.id,
      baseVersion: mockArtifact.version,
      baseContent: mockArtifact.content,
      start,
      end: start + oldText.length,
      originalText: oldText,
      replacementText: 'Teks revisi.'
    };
    render(<ArtifactCanvas artifact={mockArtifact} onSaveArtifact={onSaveArtifact} inlineEditPatch={stalePatch} />);
    fireEvent.click(screen.getByTitle('Edit Dokumen Langsung (Autosave)'));
    fireEvent.change(screen.getByPlaceholderText(/Ketik atau sesuaikan draf dokumen/), { target: { value: `${mockArtifact.content}\nPerubahan manual` } });
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Dokumen telah berubah sejak revisi dibuat');
    expect(onSaveArtifact).not.toHaveBeenCalled();
  });

  it('rejects a proposed edit without changing or saving the artifact', () => {
    const onSaveArtifact = vi.fn();
    const onDismissInlineEdit = vi.fn();
    const patch: ArtifactPatch = {
      artifactId: mockArtifact.id,
      baseVersion: mockArtifact.version,
      baseContent: mockArtifact.content,
      start: 0,
      end: 1,
      originalText: '#',
      replacementText: '##'
    };
    render(<ArtifactCanvas artifact={mockArtifact} onSaveArtifact={onSaveArtifact} inlineEditPatch={patch} onDismissInlineEdit={onDismissInlineEdit} />);
    fireEvent.click(screen.getByTitle('Edit Dokumen Langsung (Autosave)'));
    fireEvent.click(screen.getByRole('button', { name: 'Tolak' }));
    expect(onDismissInlineEdit).toHaveBeenCalledOnce();
    expect(onSaveArtifact).not.toHaveBeenCalled();
  });

  it('restores an earlier version through the version-history action', async () => {
    const rollback = vi.fn().mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ArtifactCanvas artifact={mockArtifact} onRollbackVersion={rollback} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu Opsi Lainnya' }));
    fireEvent.click(screen.getByText('Riwayat Versi'));
    fireEvent.click(screen.getByRole('button', { name: 'Pulihkan' }));
    await waitFor(() => expect(rollback).toHaveBeenCalledWith(1));
    confirmSpy.mockRestore();
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
    expect(screen.getByText('Ekspor dokumen')).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Menu Opsi Lainnya' }));
    fireEvent.click(screen.getByText('Riwayat Versi'));

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

  it('provides honest static check on code artifacts without fake execution claims', async () => {
    const artPy: WorkspaceArtifact = {
      id: 'art_py_test',
      title: 'Validasi Python',
      type: 'CODE',
      language: 'python',
      content: 'def proses():\n    return 42',
      version: 1,
      updatedAt: new Date().toISOString()
    };

    render(
      <ArtifactCanvas
        artifact={artPy}
        onUpdateArtifact={vi.fn()}
      />
    );

    const checkBtn = screen.getByRole('button', { name: /Periksa kode secara statis/i });
    expect(checkBtn).toBeInTheDocument();
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /Panel Hasil Pemeriksaan Kode/i })).toBeInTheDocument();
      expect(screen.getByText(/Eksekusi Python belum tersedia di browser/i)).toBeInTheDocument();
    });

    // Ensure no fake claims exist
    expect(screen.queryByText(/Optimal O\(n\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Index Scan verified/i)).not.toBeInTheDocument();
  });

  it('renders Jalankan aman button specifically for JavaScript artifacts', async () => {
    const artJs: WorkspaceArtifact = {
      id: 'art_js_test',
      title: 'Skrip JS Aman',
      type: 'CODE',
      language: 'javascript',
      content: 'console.log("Halo RuangKerja");',
      version: 1,
      updatedAt: new Date().toISOString()
    };

    render(
      <ArtifactCanvas
        artifact={artJs}
        onUpdateArtifact={vi.fn()}
      />
    );

    const checkBtn = screen.getByRole('button', { name: /Periksa kode secara statis/i });
    const runBtn = screen.getByRole('button', { name: /Jalankan kode di sandbox lokal aman/i });
    expect(checkBtn).toBeInTheDocument();
    expect(runBtn).toBeInTheDocument();

    fireEvent.click(runBtn);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /Panel Hasil Pemeriksaan Kode/i })).toBeInTheDocument();
    });
  });

  it('resets validation result and isolates state when switching artifacts', async () => {
    const artA: WorkspaceArtifact = {
      id: 'art_A',
      title: 'Dokumen A',
      type: 'CODE',
      language: 'python',
      content: 'def a(): pass',
      version: 1,
      updatedAt: new Date().toISOString()
    };
    const artB: WorkspaceArtifact = {
      id: 'art_B',
      title: 'Dokumen B',
      type: 'CODE',
      language: 'python',
      content: 'def b(): pass',
      version: 1,
      updatedAt: new Date().toISOString()
    };

    const { rerender } = render(<ArtifactCanvas artifact={artA} onUpdateArtifact={vi.fn()} />);

    // Click check on A
    fireEvent.click(screen.getByRole('button', { name: /Periksa kode secara statis/i }));
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /Panel Hasil Pemeriksaan Kode/i })).toBeInTheDocument();
    });

    // Switch to artifact B
    rerender(<ArtifactCanvas artifact={artB} onUpdateArtifact={vi.fn()} />);

    // Panel from A should be cleared immediately
    expect(screen.queryByRole('region', { name: /Panel Hasil Pemeriksaan Kode/i })).not.toBeInTheDocument();
  });
});
