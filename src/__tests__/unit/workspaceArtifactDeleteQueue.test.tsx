import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWorkspaceArtifacts } from '../../features/workspace/hooks/useWorkspaceArtifacts';
import { WorkspaceApiService } from '../../features/workspace/services/workspaceApiService';
import type { WorkspaceArtifact } from '../../features/workspace/types';

vi.mock('../../features/workspace/services/workspaceApiService', () => ({
  WorkspaceApiService: {
    createArtifact: vi.fn(), updateArtifact: vi.fn(), deleteArtifact: vi.fn(), fetchArtifacts: vi.fn(), rollbackArtifact: vi.fn()
  }
}));
vi.mock('../../components/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

afterEach(() => vi.clearAllMocks());

describe('workspace artifact delete ordering', () => {
  it('waits for an in-flight save before deleting the server artifact', async () => {
    let resolveSave!: (value: WorkspaceArtifact) => void;
    const saveResponse = new Promise<WorkspaceArtifact>(resolve => { resolveSave = resolve; });
    const artifact: WorkspaceArtifact = {
      id: 'art-delete-race', chatId: 'chat-delete-race', title: 'Draf', type: 'DOCUMENT', content: 'lama',
      version: 1, updatedAt: '2026-10-10T00:00:00.000Z', persistenceStatus: 'persistent'
    };
    vi.mocked(WorkspaceApiService.updateArtifact).mockReturnValue(saveResponse);
    vi.mocked(WorkspaceApiService.deleteArtifact).mockResolvedValue(undefined);
    const { result } = renderHook(() => useWorkspaceArtifacts({ chatId: artifact.chatId!, persistedArtifacts: [artifact] }));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

    let save!: Promise<WorkspaceArtifact | undefined>;
    let deletion!: Promise<void>;
    act(() => { save = result.current.saveArtifact('baru'); });
    act(() => { deletion = result.current.deleteArtifact(artifact.id); });
    expect(WorkspaceApiService.deleteArtifact).not.toHaveBeenCalled();

    await act(async () => {
      resolveSave({ ...artifact, content: 'baru', updatedAt: '2026-10-10T00:00:01.000Z', persistenceStatus: 'persistent' });
      await save;
      await deletion;
    });

    expect(WorkspaceApiService.deleteArtifact).toHaveBeenCalledOnce();
    expect(vi.mocked(WorkspaceApiService.deleteArtifact).mock.invocationCallOrder[0]).toBeGreaterThan(vi.mocked(WorkspaceApiService.updateArtifact).mock.invocationCallOrder[0]);
    expect(result.current.artifacts.map(item => item.id)).not.toContain(artifact.id);
  });
});
