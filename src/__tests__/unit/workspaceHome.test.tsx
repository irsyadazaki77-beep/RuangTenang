import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceHome } from '../../features/workspace/WorkspaceHome';

vi.mock('../../features/workspace/services/workspaceApiService', () => ({
  WorkspaceApiService: {
    listWorkspaces: vi.fn(async () => []),
    fetchAllArtifacts: vi.fn(async () => []),
    fetchChatAttachments: vi.fn(async () => []),
    searchWorkspaces: vi.fn(async () => [])
  }
}));

describe('Workspace home organization', () => {
  beforeEach(() => vi.clearAllMocks());

  it('organizes recent work into accessible collection tabs', async () => {
    render(<MemoryRouter><WorkspaceHome chats={[]} /></MemoryRouter>);

    expect(await screen.findByRole('tab', { name: /Workspace/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Task/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Dokumen/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /File/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Dokumen/ }));
    expect(screen.getByRole('tabpanel', { name: 'Dokumen' })).toHaveTextContent('Belum ada dokumen aktif');
  });

  it('keeps secondary starter tasks available in a compact disclosure', async () => {
    render(<MemoryRouter><WorkspaceHome chats={[]} /></MemoryRouter>);

    const disclosure = screen.getByText('Aktivitas lainnya');
    fireEvent.click(disclosure);
    expect(screen.getByRole('button', { name: /Review kode/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buat presentasi/ })).toBeInTheDocument();
  });
});
