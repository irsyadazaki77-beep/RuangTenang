import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceWorkflowPipeline } from '../../features/workspace/components/WorkspaceWorkflowPipeline';

describe('WorkspaceWorkflowPipeline component', () => {
  it('renders all four sequential steps in the integrated pipeline', () => {
    render(
      <WorkspaceWorkflowPipeline
        uploadedFilesCount={0}
        readyFilesCount={0}
        isAnalyzing={false}
        activeArtifact={null}
        isCanvasOpen={false}
        onUploadClick={vi.fn()}
        onAnalysisClick={vi.fn()}
        onCanvasClick={vi.fn()}
        onExportClick={vi.fn()}
      />
    );

    expect(screen.getByText(/1\. Unggah/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Analisis/)).toBeInTheDocument();
    expect(screen.getByText(/3\. Draf/)).toBeInTheDocument();
    expect(screen.getByText(/4\. Ekspor/)).toBeInTheDocument();
  });

  it('triggers step handlers when clicked and reflects ready documents', () => {
    const onUpload = vi.fn();
    const onAnalysis = vi.fn();
    const onCanvas = vi.fn();
    const onExport = vi.fn();

    render(
      <WorkspaceWorkflowPipeline
        uploadedFilesCount={2}
        readyFilesCount={2}
        isAnalyzing={false}
        activeArtifact={{
          id: 'art-1',
          title: 'Laporan Analisis Riset',
          type: 'DOCUMENT',
          content: '# Laporan',
          version: 1,
          updatedAt: '2026-10-11T00:00:00Z'
        }}
        isCanvasOpen={true}
        onUploadClick={onUpload}
        onAnalysisClick={onAnalysis}
        onCanvasClick={onCanvas}
        onExportClick={onExport}
      />
    );

    expect(screen.getByText(/1\. Unggah \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/3\. Draf ✓/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Unggah Dokumen/i }));
    expect(onUpload).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Analisis AI/i }));
    expect(onAnalysis).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Tinjau Draf/i }));
    expect(onCanvas).toHaveBeenCalledTimes(1);

    const exportBtn = screen.getByRole('button', { name: /Ekspor Dokumen/i });
    expect(exportBtn).not.toBeDisabled();
    fireEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('disables export when no artifact is present and reflects analyzing status', () => {
    const onExport = vi.fn();

    const { rerender } = render(
      <WorkspaceWorkflowPipeline
        uploadedFilesCount={1}
        readyFilesCount={1}
        isAnalyzing={true}
        activeArtifact={null}
        isCanvasOpen={false}
        onUploadClick={vi.fn()}
        onAnalysisClick={vi.fn()}
        onCanvasClick={vi.fn()}
        onExportClick={onExport}
      />
    );

    expect(screen.getByText(/2\. Menganalisis…/)).toBeInTheDocument();
    const exportBtn = screen.getByRole('button', { name: /Ekspor Dokumen/i });
    expect(exportBtn).toBeDisabled();
    fireEvent.click(exportBtn);
    expect(onExport).not.toHaveBeenCalled();

    // Rerender with welcome document (not real user draft)
    rerender(
      <WorkspaceWorkflowPipeline
        uploadedFilesCount={1}
        readyFilesCount={1}
        isAnalyzing={false}
        activeArtifact={{
          id: 'welcome-canvas-doc',
          title: 'Selamat Datang',
          type: 'DOCUMENT',
          content: 'Intro',
          version: 1,
          updatedAt: '2026-10-11T00:00:00Z'
        }}
        isCanvasOpen={false}
        onUploadClick={vi.fn()}
        onAnalysisClick={vi.fn()}
        onCanvasClick={vi.fn()}
        onExportClick={onExport}
      />
    );

    expect(screen.getByRole('button', { name: /Ekspor Dokumen/i })).toBeDisabled();
  });
});
