import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExportModal } from '../../features/workspace/components/ExportModal';

describe('academic export modal', () => {
  it('loads the editable PowerPoint outline on demand and previews its slide layouts', async () => {
    render(<ExportModal
      isOpen
      onClose={vi.fn()}
      artifact={{ id: 'artifact-1', title: 'Research findings', type: 'DOCUMENT', content: '', version: 1, updatedAt: '2026-10-11T00:00:00Z' }}
      content={'# Research findings\n\n## Findings\n- A grounded finding.\n\n## Conclusion\n- Further review is needed.'}
      showToast={vi.fn()}
    />);

    fireEvent.click(screen.getByRole('radio', { name: /PowerPoint editable/ }));
    await waitFor(() => expect(screen.getByText(/Pratinjau outline · 3 slide/)).toBeInTheDocument());
    expect(screen.getByText('Findings · content')).toBeInTheDocument();
    expect(screen.getByText('Conclusion · content')).toBeInTheDocument();
    expect(screen.getByText(/tidak mewakili render visual akhir/)).toBeInTheDocument();
  });

  it('enables Excel export only when the artifact contains tabular data', () => {
    const artifact = { id: 'artifact-2', title: 'Data', type: 'DOCUMENT' as const, content: '', version: 1, updatedAt: '2026-10-11T00:00:00Z' };
    const { unmount } = render(<ExportModal isOpen onClose={vi.fn()} artifact={artifact} content={'# Teks\n\nTanpa tabel.'} showToast={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /Excel/ })).toBeDisabled();
    unmount();
    render(<ExportModal isOpen onClose={vi.fn()} artifact={artifact} content={'| A | B |\n| --- | --- |\n| x | 1 |\n'} showToast={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /Excel/ })).toBeEnabled();
  });
});
