import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceContract, WorkspaceTaskContract } from '../../../shared/contracts/workspace';
import { useWorkspaceMetadata } from '../../features/workspace/hooks/useWorkspaceMetadata';

const workspaceApi = vi.hoisted(() => ({
  fetchWorkspace: vi.fn(),
  createTask: vi.fn()
}));

vi.mock('../../features/workspace/services/workspaceApiService', () => ({ WorkspaceApiService: workspaceApi }));
vi.mock('../../components/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

const workspace = (chatId: string): WorkspaceContract => ({
  id: `workspace-${chatId}`,
  chatId,
  name: `Workspace ${chatId}`,
  createdAt: '2026-10-09T00:00:00.000Z',
  updatedAt: '2026-10-09T00:00:00.000Z',
  tasks: []
});

describe('Workspace metadata isolation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ignores a late task mutation after navigation to another workspace', async () => {
    workspaceApi.fetchWorkspace.mockImplementation(async (chatId: string) => workspace(chatId));
    const createTask = deferred<WorkspaceTaskContract>();
    workspaceApi.createTask.mockReturnValue(createTask.promise);

    const { result, rerender } = renderHook(({ chatId }: { chatId: string }) => useWorkspaceMetadata(chatId), {
      initialProps: { chatId: 'workspace-a' }
    });
    await waitFor(() => expect(result.current.workspace?.chatId).toBe('workspace-a'));

    let pendingMutation!: Promise<WorkspaceTaskContract>;
    act(() => { pendingMutation = result.current.createTask('Task lama'); });
    rerender({ chatId: 'workspace-b' });
    await waitFor(() => expect(result.current.workspace?.chatId).toBe('workspace-b'));

    createTask.resolve({ id: 'task-from-a', title: 'Task lama' } as WorkspaceTaskContract);
    await act(async () => { await pendingMutation; });

    expect(result.current.workspace?.chatId).toBe('workspace-b');
    expect(result.current.tasks).toEqual([]);
  });
});
