import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { WorkspaceHome } from '../../features/workspace/WorkspaceHome';
import { WorkspaceApiService } from '../../features/workspace/services/workspaceApiService';
import { STARTER_TASKS } from '../../features/workspace/constants/workspaceConstants';

vi.mock('../../features/workspace/services/workspaceApiService', () => ({
  WorkspaceApiService: {
    listWorkspaces: vi.fn(async () => ({ items: [], hasMore: false, nextOffset: 0 })),
    searchWorkspaces: vi.fn(async () => ({ items: [], hasMore: false, nextCursor: null }))
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

  it('uses the same first starter prompt as a fresh conversation', async () => {
    render(<MemoryRouter><WorkspaceHome chats={[]} /><LocationProbe /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: /Analisis dokumen/ }));
    const location = JSON.parse(screen.getByTestId('location').textContent || '{}');
    expect(location.state.initialPrompt).toBe(STARTER_TASKS[0].prompt);
  });

  it('routes search results to their matching object inside the workspace', async () => {
    vi.mocked(WorkspaceApiService.searchWorkspaces).mockResolvedValueOnce({ items: [{
      kind: 'artifact', chatId: 'chat-7', itemId: 'artifact-12', title: 'Rencana riset', snippet: 'Pendahuluan', updatedAt: '2026-10-08T10:00:00.000Z'
    }], hasMore: false, nextCursor: null });
    render(<MemoryRouter><WorkspaceHome chats={[]} /><LocationProbe /></MemoryRouter>);

    fireEvent.change(screen.getByRole('textbox', { name: /Cari workspace/ }), { target: { value: 'rencana' } });
    fireEvent.click(await screen.findByRole('button', { name: /Rencana riset/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/c/chat-7');
    expect(screen.getByTestId('location')).toHaveTextContent('artifact-12');
  });

  it('offers a task filter with an accurate pressed state', async () => {
    render(<MemoryRouter><WorkspaceHome chats={[]} /></MemoryRouter>);
    fireEvent.change(screen.getByRole('textbox', { name: /Cari workspace/ }), { target: { value: 'rencana' } });

    const taskFilter = await screen.findByRole('button', { name: 'Tugas' });
    expect(taskFilter).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(taskFilter);
    expect(taskFilter).toHaveAttribute('aria-pressed', 'true');
    await vi.waitFor(() => expect(WorkspaceApiService.searchWorkspaces).toHaveBeenCalledWith('rencana', expect.any(AbortSignal), 'task'));
  });

  it('keeps distinct workspaces with the same title visible and puts pinned work first', async () => {
    const chats = [
      { id: 'old-pinned', title: 'Proposal Riset', isPinned: true, isArchived: false, workspaceMode: 'RUANG_KERJA' as const, updatedAt: '2026-10-01T00:00:00.000Z' },
      { id: 'new-copy', title: 'Proposal Riset', isPinned: false, isArchived: false, workspaceMode: 'RUANG_KERJA' as const, updatedAt: '2026-10-16T00:00:00.000Z' },
      { id: 'newer', title: 'Catatan Kuliah', isPinned: false, isArchived: false, workspaceMode: 'RUANG_KERJA' as const, updatedAt: '2026-10-17T00:00:00.000Z' }
    ];
    render(<MemoryRouter><WorkspaceHome chats={chats} /><LocationProbe /></MemoryRouter>);

    const duplicates = await screen.findAllByRole('button', { name: /Proposal Riset/ });
    expect(duplicates).toHaveLength(2);
    const list = screen.getByRole('heading', { name: 'Lanjutkan pekerjaan' }).closest('section');
    const workspaceButtons = Array.from(list!.querySelectorAll('button')).filter(button => button.textContent?.includes('Proposal Riset') || button.textContent?.includes('Catatan Kuliah'));
    expect(workspaceButtons[0]).toBe(duplicates[0]);
    fireEvent.click(duplicates[0]);
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/c/old-pinned');
  });

  it('loads later Workspace pages only when the expanded list asks for them', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `workspace-${index}`, chatId: `chat-${index}`, name: `Workspace ${index}`,
      createdAt: '2026-10-01T00:00:00.000Z', updatedAt: `2026-10-${String((index % 27) + 1).padStart(2, '0')}T00:00:00.000Z`
    }));
    vi.mocked(WorkspaceApiService.listWorkspaces)
      .mockResolvedValueOnce({ items: firstPage, hasMore: true, nextOffset: 100 })
      .mockResolvedValueOnce({
        items: [{ id: 'workspace-100', chatId: 'chat-100', name: 'Workspace 100', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-17T00:00:00.000Z' }],
        hasMore: false, nextOffset: 101
      });
    render(<MemoryRouter><WorkspaceHome chats={[]} /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: /Tampilkan daftar Workspace/ }));
    expect(await screen.findByRole('button', { name: /Muat 100 Workspace lagi/ })).toBeInTheDocument();
    expect(WorkspaceApiService.listWorkspaces).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Muat 100 Workspace lagi/ }));
    expect(await screen.findByRole('button', { name: /Workspace 100/ })).toBeInTheDocument();
    expect(WorkspaceApiService.listWorkspaces).toHaveBeenNthCalledWith(2, 100, expect.any(AbortSignal));
  });

  it('clears previous results while a replacement search is pending', async () => {
    vi.mocked(WorkspaceApiService.searchWorkspaces).mockResolvedValueOnce({ items: [{
      kind: 'workspace', chatId: 'chat-old', title: 'Rencana Lama', snippet: 'Workspace', updatedAt: '2026-10-08T10:00:00.000Z'
    }], hasMore: false, nextCursor: null });
    render(<MemoryRouter><WorkspaceHome chats={[]} /></MemoryRouter>);

    const search = screen.getByRole('textbox', { name: /Cari workspace/ });
    fireEvent.change(search, { target: { value: 'rencana' } });
    expect(await screen.findByRole('button', { name: /Rencana Lama/ })).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'proposal' } });

    expect(screen.queryByRole('button', { name: /Rencana Lama/ })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Mencari');
  });

  it('continues a search page and appends later results', async () => {
    vi.mocked(WorkspaceApiService.searchWorkspaces)
      .mockResolvedValueOnce({ items: [], hasMore: true, nextCursor: 'cursor-1' })
      .mockResolvedValueOnce({ items: [{
        kind: 'message', chatId: 'chat-old', itemId: 'message-1', title: 'Proposal', snippet: 'hasil lama', updatedAt: '2026-10-08T10:00:00.000Z'
      }], hasMore: false, nextCursor: null });
    render(<MemoryRouter><WorkspaceHome chats={[]} /></MemoryRouter>);

    fireEvent.change(screen.getByRole('textbox', { name: /Cari workspace/ }), { target: { value: 'proposal' } });
    const continueButton = await screen.findByRole('button', { name: 'Telusuri data berikutnya' });
    fireEvent.click(continueButton);

    expect(await screen.findByRole('button', { name: /hasil lama/ })).toBeInTheDocument();
    await vi.waitFor(() => expect(WorkspaceApiService.searchWorkspaces).toHaveBeenLastCalledWith('proposal', expect.any(AbortSignal), 'all', 'cursor-1'));
    expect(screen.getByRole('status')).toHaveTextContent('1 hasil');
  });

  it('does not call authenticated workspace list or search endpoints in guest mode', async () => {
    render(<MemoryRouter><WorkspaceHome chats={[]} isGuest /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Apa yang ingin kamu kerjakan?' })).toBeInTheDocument();
    expect(WorkspaceApiService.listWorkspaces).not.toHaveBeenCalled();
    expect(screen.queryByText(/Workspace belum dapat dimuat/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: /Cari workspace/ }), { target: { value: 'skripsi' } });
    expect(WorkspaceApiService.searchWorkspaces).not.toHaveBeenCalled();
  });
});
