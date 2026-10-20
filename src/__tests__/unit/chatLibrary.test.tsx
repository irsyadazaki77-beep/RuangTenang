import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useChatLibrary } from '../../features/chat/hooks/useChatLibrary';
import { transitionAuthSession } from '../../lib/authSessionLifecycle';
import type { UserSession } from '../../types';

const { apiGet, saveEncrypted } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  saveEncrypted: vi.fn(async () => undefined)
}));

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: apiGet,
    delete: vi.fn(),
    put: vi.fn(),
    post: vi.fn()
  }
}));

vi.mock('../../lib/clientDb', () => ({
  clientDb: {
    saveEncrypted,
    getDecrypted: vi.fn(async () => null)
  }
}));

const user: UserSession = {
  id: 'student-1', name: 'Mahasiswa', email: 'student@example.test', role: 'mahasiswa', tier: 'Developer',
  usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 }
};

describe('chat library history', () => {
  afterEach(() => {
    vi.clearAllMocks();
    transitionAuthSession('unauthenticated');
  });

  it('merges Workspace records into the sidebar history after reload', async () => {
    transitionAuthSession('authenticated', { id: user.id, role: user.role });
    apiGet.mockImplementation(async (path: string) => {
      if (path === '/api/v1/chat/history') {
        return { success: true, data: [{ id: 'tenang-1', title: 'Obrolan', isPinned: false, isArchived: false, workspaceMode: 'RUANG_TENANG', updatedAt: '2026-10-16T00:00:00.000Z' }] };
      }
      if (path === '/api/v1/workspace') {
        return { success: true, data: [{ chatId: 'workspace-1', name: 'Proposal Riset', isPinned: true, isArchived: false, createdAt: '2026-10-15T00:00:00.000Z', updatedAt: '2026-10-16T01:00:00.000Z' }] };
      }
      return { success: false, data: [] };
    });

    const wrapper = ({ children }: React.PropsWithChildren) => <MemoryRouter>{children}</MemoryRouter>;
    const { result } = renderHook(() => useChatLibrary(user, vi.fn()), { wrapper });

    await waitFor(() => expect(result.current.chats).toHaveLength(2));
    expect(result.current.chats[0]).toMatchObject({
      id: 'workspace-1', title: 'Proposal Riset', workspaceMode: 'RUANG_KERJA', isPinned: true
    });
    expect(apiGet).toHaveBeenCalledWith('/api/v1/chat/history');
    expect(apiGet).toHaveBeenCalledWith('/api/v1/workspace');
    expect(saveEncrypted).toHaveBeenCalledOnce();
  });
});
