import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceFilePreviewModal } from '../../features/workspace/components/WorkspaceFilePreviewModal';

const api = vi.hoisted(() => ({
  fetchAttachmentPreview: vi.fn(), fetchTabularDataset: vi.fn(), fetchTabularDatasetOverview: vi.fn(), fetchTabularPreview: vi.fn(),
  previewTabularTransform: vi.fn(), confirmTabularTransform: vi.fn(), analyzeTabularDataset: vi.fn(), createArtifact: vi.fn()
}));

vi.mock('../../features/workspace/services/workspaceApiService', () => ({ WorkspaceApiService: api }));

describe('Workspace tabular modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchAttachmentPreview.mockResolvedValue({ id: 'att-1', filename: 'sales.csv', mimeType: 'text/csv', fileKind: 'csv', size: 100, chunkCount: 1, previewText: '' });
    const dataset = {
      id: 'att-1:Data', workspaceId: 'chat-1', sourceFileId: 'att-1', name: 'sales.csv', sheetName: 'Data', version: 'source-v1', rowCount: 2, columnCount: 2,
      columns: [
        { name: 'category', originalName: 'category', inferredType: 'string', nullable: false, uniqueCount: 2, missingCount: 0, sampleValues: ['A', 'B'], topValues: [] },
        { name: 'revenue', originalName: 'revenue', inferredType: 'number', nullable: false, uniqueCount: 2, missingCount: 0, sampleValues: [5, 8], min: 5, max: 8, mean: 6.5, median: 6.5 }
      ], sheets: [{ name: 'Data', rowCount: 2, columnCount: 2, empty: false }], activeSheet: 'Data', profileScope: 'complete' as const, quality: { missingCellCount: 0, missingCellPercent: 0, duplicateRowCount: 0, emptyColumnCount: 0, inconsistentColumns: [], repeatedHeaderRows: 0, potentialOutlierCells: 0 }, createdAt: '2026-01-01T00:00:00.000Z'
    };
    api.fetchTabularDataset.mockResolvedValue(dataset);
    api.fetchTabularDatasetOverview.mockResolvedValue({
      dataset,
      preview: { sheetName: 'Data', columns: ['category', 'revenue'], rows: [{ category: 'A', revenue: 5 }, { category: 'B', revenue: 8 }], offset: 0, limit: 25, rowCount: 2 }
    });
    api.fetchTabularPreview.mockResolvedValue({ sheetName: 'Data', columns: ['category', 'revenue'], rows: [{ category: 'A', revenue: 5 }, { category: 'B', revenue: 8 }], offset: 0, limit: 25, rowCount: 2 });
  });

  it('previews changes and requires confirmation before creating a derived artifact', async () => {
    api.previewTabularTransform.mockResolvedValue({ sourceFileId: 'att-1', sourceVersion: 'source-v1', sheetName: 'Data', operations: [{ type: 'remove_duplicates' }], sourceRowCount: 2, resultRowCount: 1, rowsRemoved: 1, cellsChanged: 0, previewRows: [{ category: 'A', revenue: 5 }], summary: [{ operation: 'remove_duplicates', affected: 1, message: '1 baris duplikat dihapus.' }] });
    const artifact = { id: 'art-derived', chatId: 'chat-1', title: 'sales.csv · Data (derived)', type: 'TABLE' as const, language: 'json', content: JSON.stringify({ type: 'table', columns: ['category', 'revenue'], rows: [{ category: 'A', revenue: 5 }], sourceVersion: 'source-v1' }), version: 1, updatedAt: '2026-01-01T00:00:00.000Z' };
    api.confirmTabularTransform.mockResolvedValue({ artifact, sourceUnchanged: true });
    const onArtifactCreated = vi.fn();
    render(<WorkspaceFilePreviewModal attachmentId="att-1" onClose={vi.fn()} onArtifactCreated={onArtifactCreated} />);

    await screen.findByText('A');
    expect(api.fetchTabularDatasetOverview).toHaveBeenCalledTimes(1);
    expect(api.fetchTabularDataset).not.toHaveBeenCalled();
    expect(api.fetchTabularPreview).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /transformasi/i }));
    fireEvent.click(screen.getByLabelText('Hapus baris duplikat'));
    fireEvent.click(screen.getByRole('button', { name: 'Preview perubahan' }));
    expect(await screen.findByText('1 baris duplikat dihapus.')).toBeTruthy();
    expect(api.confirmTabularTransform).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Konfirmasi dan buat dataset turunan' }));
    await waitFor(() => expect(api.confirmTabularTransform).toHaveBeenCalledWith('att-1', expect.objectContaining({ expectedVersion: 'source-v1' })));
    expect(onArtifactCreated).toHaveBeenCalledWith(artifact);
    expect(await screen.findByText(/dataset turunan tersimpan di canvas/i)).toBeTruthy();
  });

  it('resets file-specific preview state when switching between attachments', async () => {
    api.fetchAttachmentPreview.mockImplementation(async (attachmentId: string) => ({
      id: attachmentId, filename: attachmentId === 'att-1' ? 'first.csv' : 'second.csv',
      mimeType: 'text/csv', fileKind: 'csv', size: 100, chunkCount: 1, previewText: ''
    }));
    api.previewTabularTransform.mockResolvedValue({
      sourceFileId: 'att-1', sourceVersion: 'source-v1', sheetName: 'Data',
      operations: [{ type: 'remove_duplicates' }], sourceRowCount: 2, resultRowCount: 1,
      rowsRemoved: 1, cellsChanged: 0, previewRows: [{ category: 'A', revenue: 5 }],
      summary: [{ operation: 'remove_duplicates', affected: 1, message: '1 baris duplikat dihapus.' }]
    });

    const props = { onClose: vi.fn(), onArtifactCreated: vi.fn() };
    const { rerender } = render(<WorkspaceFilePreviewModal attachmentId="att-1" {...props} />);

    await screen.findByRole('heading', { name: 'first.csv' });
    fireEvent.click(screen.getByRole('button', { name: /Transformasi/i }));
    fireEvent.click(screen.getByLabelText('Hapus baris duplikat'));
    fireEvent.click(screen.getByRole('button', { name: 'Preview perubahan' }));
    expect(await screen.findByText('1 baris duplikat dihapus.')).toBeTruthy();

    rerender(<WorkspaceFilePreviewModal attachmentId="att-2" {...props} />);

    expect(await screen.findByRole('heading', { name: 'second.csv' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Data/i }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByText('1 baris duplikat dihapus.')).toBeNull();
    expect(api.fetchTabularDatasetOverview).toHaveBeenNthCalledWith(2, 'att-2', undefined, expect.any(AbortSignal));
  });
});
