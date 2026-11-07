import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AcademicPaper } from '../../features/workspace/utils/citationEngine';

const { searchAcademicPapersWithStatus } = vi.hoisted(() => ({ searchAcademicPapersWithStatus: vi.fn() }));

vi.mock('../../features/workspace/utils/citationEngine', () => ({
  searchAcademicPapersWithStatus,
  formatAPA7: vi.fn(() => 'APA citation'),
  formatIEEE: vi.fn(() => 'IEEE citation'),
  formatHarvard: vi.fn(() => 'Harvard citation'),
  formatBibTeX: vi.fn(() => 'BibTeX citation')
}));

import { CitationSearchModal } from '../../features/workspace/components/CitationSearchModal';

const paper = (title: string): AcademicPaper => ({
  id: title,
  doi: '10.1234/example',
  title,
  authors: ['Example, A.'],
  year: 2024,
  journal: 'Example Journal',
  source: 'crossref',
  verified: true
});

describe('CitationSearchModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('aborts and ignores an older search response after the query changes', async () => {
    let resolveOlder: (results: AcademicPaper[]) => void = () => undefined;
    searchAcademicPapersWithStatus.mockImplementation((query: string) => query === 'older query'
      ? new Promise<{ papers: AcademicPaper[]; unavailable: boolean }>(resolve => {
          resolveOlder = results => resolve({ papers: results, unavailable: false });
        })
      : Promise.resolve({ papers: [paper('Newer result')], unavailable: false }));

    render(<CitationSearchModal isOpen onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText(/Cari judul paper/);
    fireEvent.change(input, { target: { value: 'older query' } });
    await waitFor(() => expect(searchAcademicPapersWithStatus).toHaveBeenCalledWith('older query', expect.any(AbortSignal)));
    const olderSignal = vi.mocked(searchAcademicPapersWithStatus).mock.calls[0][1];

    fireEvent.change(input, { target: { value: 'newer query' } });
    expect(await screen.findByRole('button', { name: /Newer result/ })).toBeInTheDocument();
    expect(olderSignal?.aborted).toBe(true);

    await act(async () => { resolveOlder([paper('Stale result')]); });
    expect(screen.queryByRole('button', { name: /Stale result/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Newer result/ })).toBeInTheDocument();
  });
});
