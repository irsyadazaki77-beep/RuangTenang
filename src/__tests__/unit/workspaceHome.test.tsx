import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { WorkspaceHome } from '../../features/workspace/WorkspaceHome';
import { WorkspaceApiService } from '../../features/workspace/services/workspaceApiService';

vi.mock('../../features/workspace/services/workspaceApiService', () => ({
  WorkspaceApiService: {
    listWorkspaces: vi.fn(async () => []),
    searchWorkspaces: vi.fn(async () => [])
  }
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{JSON.stringify({ pathname: location.pathname, state: location.state })}</output>;
}

describe('Workspace home', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps the home focused on starting, continuing, and searching work', async () => {
    render(<MemoryRouter><WorkspaceHome chats={[]} /><LocationProbe /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Apa yang ingin kamu kerjakan?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Workspace baru/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lanjutkan pekerjaan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mulai dengan cepat' })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analisis dokumen/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tulis dokumen/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Review kode/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Riset topik/ })).toBeInTheDocument();
  });

  it('keeps secondary starters available under a compact disclosure', async () => {
    render(<MemoryRouter><WorkspaceHome chats={[]} /></MemoryRouter>);

    fireEvent.click(screen.getByText('Lihat aktivitas lainnya'));
    expect(screen.getByRole('button', { name: /Brainstorm ide/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bandingkan jawaban/ })).toBeInTheDocument();
  });

  it('routes search results to their matching object inside the workspace', async () => {
    vi.mocked(WorkspaceApiService.searchWorkspaces).mockResolvedValueOnce([{
      kind: 'artifact', chatId: 'chat-7', itemId: 'artifact-12', title: 'Rencana riset', snippet: 'Pendahuluan', updatedAt: '2026-10-08T10:00:00.000Z'
    }]);
    render(<MemoryRouter><WorkspaceHome chats={[]} /><LocationProbe /></MemoryRouter>);

    fireEvent.change(screen.getByRole('textbox', { name: /Cari workspace/ }), { target: { value: 'rencana' } });
    fireEvent.click(await screen.findByRole('button', { name: /Rencana riset/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/c/chat-7');
    expect(screen.getByTestId('location')).toHaveTextContent('artifact-12');
  });
});
