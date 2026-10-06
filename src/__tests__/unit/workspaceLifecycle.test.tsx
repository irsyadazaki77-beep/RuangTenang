import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkspaceArtifacts } from '../../features/workspace/hooks/useWorkspaceArtifacts';
import { useWorkspacePersistence } from '../../features/workspace/hooks/useWorkspacePersistence';
import { useWorkspaceStreaming } from '../../features/workspace/hooks/useWorkspaceStreaming';
import { useWorkspaceFileIngestion } from '../../features/workspace/hooks/useWorkspaceFileIngestion';
import { DEFAULT_WELCOME_ARTIFACT, DEFAULT_WELCOME_ARTIFACT_ID } from '../../features/workspace/constants/workspaceConstants';
import { WorkspaceApiService } from '../../features/workspace/services/workspaceApiService';
import { WorkspaceArtifact } from '../../features/workspace/types';
import { Message } from '../../features/chat/types';
import { ChatStreamingClient } from '../../features/chat/services/chatStreamingClient';

// Mock the WorkspaceApiService
vi.mock('../../features/workspace/services/workspaceApiService', () => ({
  WorkspaceApiService: {
    fetchArtifacts: vi.fn(),
    fetchMessages: vi.fn(),
    clearMessages: vi.fn(),
    createArtifact: vi.fn(),
    updateArtifact: vi.fn(),
    rollbackArtifact: vi.fn(),
    deleteArtifact: vi.fn(),
    fetchChatAttachments: vi.fn().mockResolvedValue([]),
    deleteAttachment: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock toast
vi.mock('../../components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

describe('Workspace Lifecycle & Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe('1. Fresh Workspace vs Existing Chat Lifecycle', () => {
    it('initializes fresh workspace with default welcome artifact and welcome message', () => {
      const { result: persistenceResult, unmount: unmountPersist } = renderHook(() => 
        useWorkspacePersistence({ userName: 'Ahmad' })
      );
      expect(persistenceResult.current.messages).toHaveLength(1);
      expect(persistenceResult.current.messages[0].role).toBe('assistant');
      expect(persistenceResult.current.messages[0].content).toContain('Halo Ahmad');
      unmountPersist();

      const { result: artifactResult, unmount: unmountArt } = renderHook(() => 
        useWorkspaceArtifacts({ persistedArtifacts: [] })
      );
      expect(artifactResult.current.artifacts).toHaveLength(1);
      expect(artifactResult.current.activeArtifactId).toBe(DEFAULT_WELCOME_ARTIFACT_ID);
      expect(artifactResult.current.activeArtifact?.title).toBe(DEFAULT_WELCOME_ARTIFACT.title);
      unmountArt();
    });

    it('never fetches the user artifact library for a new Workspace', async () => {
      const { result } = renderHook(() => useWorkspacePersistence({ workspaceIdentity: 'local:test' }));
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
      expect(WorkspaceApiService.fetchArtifacts).not.toHaveBeenCalled();
      expect(result.current.persistedArtifacts).toEqual([]);
    });

    it('does not display a legacy orphan even if one is supplied to a new Workspace', async () => {
      const orphan: WorkspaceArtifact = { id: 'art-orphan', chatId: null, title: 'Orphan', type: 'DOCUMENT', content: 'legacy', version: 1, updatedAt: '1' };
      const { result } = renderHook(() => useWorkspaceArtifacts({ workspaceIdentity: 'local:new', persistedArtifacts: [orphan] }));
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
      expect(result.current.artifacts.map(item => item.id)).not.toContain('art-orphan');
    });

    it('loads existing chat messages and artifacts without race conditions', async () => {
      const mockChatId = 'chat_test_123';
      const mockExistingArtifacts: WorkspaceArtifact[] = [
        {
          id: 'art_101',
          chatId: mockChatId,
          title: 'Skripsi Bab 1',
          type: 'DOCUMENT',
          content: '# Bab 1 Pendahuluan',
          version: 1,
          updatedAt: new Date().toISOString()
        }
      ];

      vi.mocked(WorkspaceApiService.fetchArtifacts).mockResolvedValueOnce(mockExistingArtifacts);
      vi.mocked(WorkspaceApiService.fetchMessages).mockResolvedValueOnce([
        { id: 'm1', role: 'user', content: 'Halo', createdAt: new Date() },
        { id: 'm2', role: 'assistant', content: 'Halo kembali', createdAt: new Date() }
      ]);

      const { result: persistenceResult } = renderHook(() => 
        useWorkspacePersistence({ chatId: mockChatId, userName: 'Budi' })
      );

      // Wait for async load
      await act(async () => {
        await new Promise(r => setTimeout(r, 20));
      });

      expect(WorkspaceApiService.fetchArtifacts).toHaveBeenCalledWith(mockChatId, expect.any(AbortSignal));
      expect(persistenceResult.current.messages).toHaveLength(2);
      expect(persistenceResult.current.persistedArtifacts).toHaveLength(1);

      // Pass into useWorkspaceArtifacts
      const { result: artifactResult } = renderHook(() => 
        useWorkspaceArtifacts({ chatId: mockChatId, persistedArtifacts: mockExistingArtifacts })
      );

      expect(artifactResult.current.artifacts).toHaveLength(2); // Welcome + art_101
      expect(artifactResult.current.activeArtifactId).toBe('art_101');
    });

    it('keeps a local draft through chat binding and retains it when migration fails', async () => {
      vi.mocked(WorkspaceApiService.createArtifact).mockRejectedValueOnce(new Error('offline'));
      const { result, rerender, unmount } = renderHook(
        ({ chatId, identity, persisted }) => useWorkspaceArtifacts({ chatId, workspaceIdentity: identity, persistedArtifacts: persisted }),
        { initialProps: { chatId: undefined as string | undefined, identity: 'local:draft-a', persisted: [] as WorkspaceArtifact[] } }
      );
      await act(async () => { await result.current.createNewArtifact('DOCUMENT'); });
      const created = result.current.activeArtifact!;
      expect(created.persistenceStatus).toBe('local');

      rerender({ chatId: 'chat-created', identity: 'local:draft-a', persisted: [] });
      await act(async () => { expect(await result.current.migrateLocalArtifacts('chat-created')).toBe(false); });
      expect(result.current.artifacts.some(item => item.id === created.id)).toBe(true);
      expect(result.current.artifacts.find(item => item.id === created.id)?.persistenceStatus).toBe('failed');
      expect(WorkspaceApiService.createArtifact).toHaveBeenCalledWith(expect.objectContaining({ id: created.id, chatId: 'chat-created' }));
      unmount();
      const reloaded = renderHook(() => useWorkspaceArtifacts({ chatId: 'chat-created', workspaceIdentity: 'chat:chat-created', persistedArtifacts: [] }));
      expect(reloaded.result.current.artifacts.find(item => item.id === created.id)?.persistenceStatus).toBe('failed');
    });

    it('migrates a stable local artifact ID and reloads it from the bound Workspace', async () => {
      const { result, rerender } = renderHook(
        ({ chatId, identity, persisted }) => useWorkspaceArtifacts({ chatId, workspaceIdentity: identity, persistedArtifacts: persisted }),
        { initialProps: { chatId: undefined as string | undefined, identity: 'local:migrate', persisted: [] as WorkspaceArtifact[] } }
      );
      await act(async () => { await result.current.createNewArtifact('DOCUMENT'); });
      const createdId = result.current.activeArtifact!.id;
      vi.mocked(WorkspaceApiService.createArtifact).mockImplementation(async payload => ({
        ...payload, id: payload.id || 'art-migrated', chatId: 'chat-bound', persistenceStatus: undefined, version: 1, updatedAt: '2026-01-01T00:00:00.000Z'
      }));
      rerender({ chatId: 'chat-bound', identity: 'local:migrate', persisted: [] });
      await act(async () => { expect(await result.current.migrateLocalArtifacts('chat-bound')).toBe(true); });
      expect(WorkspaceApiService.createArtifact).toHaveBeenCalledWith(expect.objectContaining({ id: createdId, chatId: 'chat-bound' }));

      const persisted: WorkspaceArtifact = { id: createdId, chatId: 'chat-bound', title: 'Reloaded', type: 'DOCUMENT', content: 'saved', version: 1, updatedAt: '2026-01-01T00:00:00.000Z' };
      rerender({ chatId: 'chat-bound', identity: 'chat:chat-bound', persisted: [persisted] });
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
      expect(result.current.artifacts.find(item => item.id === createdId)?.chatId).toBe('chat-bound');
    });

    it('persists a first AI response artifact directly to the newly created chat', async () => {
      vi.mocked(WorkspaceApiService.createArtifact).mockImplementation(async payload => ({
        ...payload, id: payload.id || 'art-ai', version: 1, updatedAt: new Date().toISOString()
      }));
      const { result } = renderHook(() => useWorkspaceArtifacts({ workspaceIdentity: 'local:first-ai', persistedArtifacts: [] }));
      const parsed: WorkspaceArtifact = { id: 'art_first_ai', title: 'Hasil AI', type: 'DOCUMENT', content: 'isi', version: 1, updatedAt: new Date().toISOString() };
      await act(async () => { expect(await result.current.syncParsedMessageArtifacts([parsed], 'chat-created-stream')).toBe(true); });
      expect(WorkspaceApiService.createArtifact).toHaveBeenCalledWith(expect.objectContaining({ id: parsed.id, chatId: 'chat-created-stream' }));
    });

    it('does not merge artifacts from the previous Workspace after a switch', async () => {
      const oldArtifact: WorkspaceArtifact = { id: 'art-a', chatId: 'chat-a', title: 'A', type: 'DOCUMENT', content: '', version: 1, updatedAt: '1' };
      const newArtifact: WorkspaceArtifact = { id: 'art-b', chatId: 'chat-b', title: 'B', type: 'DOCUMENT', content: '', version: 1, updatedAt: '2' };
      const { result, rerender } = renderHook(
        ({ chatId, identity, persisted }) => useWorkspaceArtifacts({ chatId, workspaceIdentity: identity, persistedArtifacts: persisted }),
        { initialProps: { chatId: 'chat-a', identity: 'chat:chat-a', persisted: [oldArtifact] } }
      );
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
      rerender({ chatId: 'chat-b', identity: 'chat:chat-b', persisted: [newArtifact] });
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
      expect(result.current.artifacts.map(item => item.id)).toContain('art-b');
      expect(result.current.artifacts.map(item => item.id)).not.toContain('art-a');
      expect(result.current.activeArtifactId).toBe('art-b');
    });

    it('cleans up old request when chatId switches rapidly', async () => {
      let resolveFirst: any;
      const firstPromise = new Promise<WorkspaceArtifact[]>((resolve) => {
        resolveFirst = resolve;
      });

      vi.mocked(WorkspaceApiService.fetchArtifacts)
        .mockImplementationOnce(() => firstPromise)
        .mockResolvedValueOnce([]);

      const { result, rerender } = renderHook(
        ({ chatId }) => useWorkspacePersistence({ chatId }),
        { initialProps: { chatId: 'chat_old' } }
      );

      // Switch chatId before first promise resolves
      rerender({ chatId: 'chat_new' });

      // Now resolve the old request
      resolveFirst([{ id: 'art_stale', chatId: 'chat_old', title: 'Stale', type: 'DOCUMENT', content: '', version: 1, updatedAt: '' }]);

      await act(async () => {
        await new Promise(r => setTimeout(r, 10));
      });

      expect(WorkspaceApiService.fetchArtifacts).toHaveBeenCalledTimes(2);
      expect(result.current.persistedArtifacts).toEqual([]);
    });
  });

  describe('2. Artifact CRUD & Deduplication', () => {
    it('creates a new draft and avoids duplicate persistence calls', async () => {
      vi.mocked(WorkspaceApiService.createArtifact).mockImplementation(async (payload) => ({
        ...payload,
        id: payload.id || 'generated_id',
        version: 1,
        updatedAt: new Date().toISOString()
      }));

      const { result } = renderHook(() => 
        useWorkspaceArtifacts({ chatId: 'chat_abc', persistedArtifacts: [] })
      );

      await act(async () => {
        await result.current.createNewArtifact('CODE');
      });

      expect(result.current.artifacts.length).toBe(2);
      expect(result.current.activeArtifact?.type).toBe('CODE');
      expect(result.current.activeArtifact?.language).toBe('python');
      expect(WorkspaceApiService.createArtifact).toHaveBeenCalledTimes(1);
    });

    it('deduplicates parsed artifacts from assistant messages', async () => {
      vi.mocked(WorkspaceApiService.createArtifact).mockImplementation(async (payload) => ({
        ...payload,
        id: payload.id || 'id_123',
        version: 1,
        updatedAt: new Date().toISOString()
      }));

      const { result } = renderHook(() => 
        useWorkspaceArtifacts({ chatId: 'chat_123', persistedArtifacts: [] })
      );

      const parsed: WorkspaceArtifact = {
        id: 'art_parsed_1',
        title: 'Outline Bab 2',
        type: 'OUTLINE',
        content: '# Outline',
        version: 1,
        updatedAt: new Date().toISOString()
      };

      // Call sync twice with same artifact
      await act(async () => {
        result.current.syncParsedMessageArtifacts([parsed]);
      });
      await act(async () => {
        result.current.syncParsedMessageArtifacts([parsed]);
      });

      expect(result.current.artifacts.filter(a => a.id === 'art_parsed_1')).toHaveLength(1);
    });

    it('updates active artifact optimistically and persists save', async () => {
      const mockInitial: WorkspaceArtifact = {
        id: 'art_existing',
        chatId: 'chat-existing',
        title: 'Existing Draft',
        type: 'DOCUMENT',
        content: 'Original content',
        version: 1,
        updatedAt: new Date().toISOString()
      };

      vi.mocked(WorkspaceApiService.updateArtifact).mockResolvedValueOnce({
        ...mockInitial,
        content: 'Updated content'
      });

      const { result } = renderHook(() => 
        useWorkspaceArtifacts({ chatId: 'chat-existing', persistedArtifacts: [mockInitial] })
      );

      act(() => {
        result.current.setActiveArtifactId('art_existing');
        result.current.updateActiveArtifact({ content: 'Updated content' });
      });

      expect(result.current.activeArtifact?.content).toBe('Updated content');

      await act(async () => {
        await result.current.saveArtifact('Updated content');
      });

      expect(WorkspaceApiService.updateArtifact).toHaveBeenCalledWith(
        'art_existing',
        expect.objectContaining({ content: 'Updated content' })
      );
    });

    it('uses each server confirmed timestamp for the next save in the same Canvas', async () => {
      const initial: WorkspaceArtifact = {
        id: 'art-sequenced', chatId: 'chat-sequenced', title: 'Sequence', type: 'DOCUMENT',
        content: 'initial', version: 1, updatedAt: '2026-01-01T00:00:00.000Z', persistenceStatus: 'persistent'
      };
      vi.mocked(WorkspaceApiService.updateArtifact)
        .mockResolvedValueOnce({ ...initial, content: 'first', updatedAt: '2026-01-01T00:00:01.000Z' })
        .mockResolvedValueOnce({ ...initial, content: 'second', updatedAt: '2026-01-01T00:00:02.000Z' });
      const { result } = renderHook(() => useWorkspaceArtifacts({ chatId: initial.chatId!, persistedArtifacts: [initial] }));
      await act(async () => { await result.current.saveArtifact('first'); });
      await act(async () => { await result.current.saveArtifact('second'); });

      expect(WorkspaceApiService.updateArtifact).toHaveBeenNthCalledWith(1, initial.id, expect.objectContaining({ expectedUpdatedAt: initial.updatedAt }));
      expect(WorkspaceApiService.updateArtifact).toHaveBeenNthCalledWith(2, initial.id, expect.objectContaining({ expectedUpdatedAt: '2026-01-01T00:00:01.000Z' }));
      expect(result.current.activeArtifact?.updatedAt).toBe('2026-01-01T00:00:02.000Z');
    });

    it('performs rollback to previous version safely', async () => {
      const mockArt: WorkspaceArtifact = {
        id: 'art_with_history',
        chatId: 'chat-history',
        title: 'Versioned Doc',
        type: 'DOCUMENT',
        content: 'Version 2 content',
        version: 2,
        updatedAt: new Date().toISOString()
      };

      vi.mocked(WorkspaceApiService.rollbackArtifact).mockResolvedValueOnce({
        ...mockArt,
        version: 1,
        content: 'Version 1 content'
      });

      const { result } = renderHook(() => 
        useWorkspaceArtifacts({ chatId: 'chat-history', persistedArtifacts: [mockArt] })
      );

      await act(async () => {
        result.current.setActiveArtifactId('art_with_history');
        await result.current.rollbackArtifact(1);
      });

      expect(WorkspaceApiService.rollbackArtifact).toHaveBeenCalledWith('art_with_history', 1, 'chat-history');
      expect(result.current.activeArtifact?.version).toBe(1);
      expect(result.current.activeArtifact?.content).toBe('Version 1 content');
    });

    it('keeps the artifact and active selection when server delete fails', async () => {
      const artifact: WorkspaceArtifact = {
        id: 'delete-me', chatId: 'delete-chat', title: 'Keep me', type: 'DOCUMENT',
        content: 'content', version: 1, updatedAt: new Date().toISOString(), persistenceStatus: 'persistent'
      };
      vi.mocked(WorkspaceApiService.deleteArtifact).mockRejectedValueOnce(new Error('500'));
      const { result } = renderHook(() => useWorkspaceArtifacts({ chatId: 'delete-chat', persistedArtifacts: [artifact] }));
      act(() => result.current.setActiveArtifactId(artifact.id));

      await act(async () => {
        await expect(result.current.deleteArtifact(artifact.id)).rejects.toThrow('500');
      });

      expect(result.current.artifacts.some(item => item.id === artifact.id)).toBe(true);
      expect(result.current.activeArtifactId).toBe(artifact.id);
    });

    it('inserts only the server returned duplicate after persistence succeeds', async () => {
      const artifact: WorkspaceArtifact = {
        id: 'source', chatId: 'duplicate-chat', title: 'Source', type: 'DOCUMENT',
        content: 'content', version: 3, updatedAt: new Date().toISOString(), persistenceStatus: 'persistent'
      };
      vi.mocked(WorkspaceApiService.createArtifact).mockResolvedValueOnce({
        ...artifact, id: 'server-copy', title: 'Source (Salinan)', version: 1
      });
      const { result } = renderHook(() => useWorkspaceArtifacts({ chatId: 'duplicate-chat', persistedArtifacts: [artifact] }));

      await act(async () => { await result.current.duplicateArtifact(artifact.id); });

      expect(result.current.artifacts.filter(item => item.title === 'Source (Salinan)')).toHaveLength(1);
      expect(result.current.activeArtifactId).toBe('server-copy');
    });

    it('does not retain a duplicate when server creation fails', async () => {
      const artifact: WorkspaceArtifact = {
        id: 'source', chatId: 'duplicate-chat', title: 'Source', type: 'DOCUMENT',
        content: 'content', version: 1, updatedAt: new Date().toISOString(), persistenceStatus: 'persistent'
      };
      vi.mocked(WorkspaceApiService.createArtifact).mockRejectedValueOnce(new Error('500'));
      const { result } = renderHook(() => useWorkspaceArtifacts({ chatId: 'duplicate-chat', persistedArtifacts: [artifact] }));

      await act(async () => { await result.current.duplicateArtifact(artifact.id); });

      expect(result.current.artifacts.filter(item => item.title.includes('(Salinan)'))).toHaveLength(0);
      expect(result.current.activeArtifactId).toBe(artifact.id);
    });
  });

  describe('3. File Ingestion & Boundary Safety', () => {
    it('manages multiple independent attachments and removes only the selected one', async () => {
      const { result } = renderHook(() => useWorkspaceFileIngestion());

      vi.mocked(WorkspaceApiService.deleteAttachment).mockResolvedValue(undefined);
      vi.mocked(WorkspaceApiService.fetchChatAttachments).mockResolvedValue([]);
      vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const uploadedFile = (init?.body as FormData).get('files') as File;
        return { ok: true, json: async () => ({ success: true, attachment: {
          id: `server-${uploadedFile.name}`, filename: uploadedFile.name, mimeType: 'text/plain', fileKind: 'text', size: uploadedFile.size, status: 'ready', url: '/file'
        } }) } as Response;
      }));
      const files = ['a.txt', 'b.txt', 'c.txt'].map(name => new File(['text'], name, { type: 'text/plain' }));
      await act(async () => result.current.handleDrop({ preventDefault: vi.fn(), dataTransfer: { files } } as unknown as React.DragEvent));
      expect(result.current.attachments).toHaveLength(3);
      const middle = result.current.attachments[1];
      await act(async () => result.current.removeAttachment(middle));
      expect(result.current.attachments.map(item => item.name)).toEqual(['a.txt', 'c.txt']);
      vi.unstubAllGlobals();
    });

    it('tracks drag over and drag leave correctly', () => {
      const { result } = renderHook(() => useWorkspaceFileIngestion());

      expect(result.current.isDraggingOver).toBe(false);

      act(() => {
        result.current.handleDragOver({ preventDefault: vi.fn() } as any);
      });
      expect(result.current.isDraggingOver).toBe(true);

      act(() => {
        result.current.handleDragLeave();
      });
      expect(result.current.isDraggingOver).toBe(false);
    });
  });

  describe('4. Streaming State & Abort', () => {
    it('initializes in idle state and allows abort', () => {
      const { result } = renderHook(() => useWorkspaceStreaming({ chatId: 'c1' }));

      expect(result.current.streamingStatus).toBe('idle');
      expect(result.current.isStreaming).toBe(false);

      act(() => {
        result.current.abortStream();
      });

      expect(result.current.streamingStatus).toBe('cancelled');
    });

    it('does not commit a late stream callback after clear aborts the stream', async () => {
      const onStreamCompleted = vi.fn();
      vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      })));
      const { result } = renderHook(() => useWorkspaceStreaming({ chatId: 'chat-race', onStreamCompleted }));

      await act(async () => {
        const pendingStream = result.current.sendMessageStream('Pertanyaan');
        result.current.abortStream(true);
        await pendingStream;
      });

      expect(onStreamCompleted).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('ignores late completion and error callbacks after switching Workspace identity', async () => {
      let callbacks: Parameters<ChatStreamingClient['stream']>[1] | undefined;
      let releaseStream!: () => void;
      const streamFinished = new Promise<void>(resolve => { releaseStream = resolve; });
      const streamSpy = vi.spyOn(ChatStreamingClient.prototype, 'stream').mockImplementation(async (_payload, streamCallbacks) => {
        callbacks = streamCallbacks;
        await streamFinished;
      });
      const onStreamCompleted = vi.fn();
      const { result, rerender } = renderHook(
        ({ workspaceIdentity }: { workspaceIdentity: string }) => useWorkspaceStreaming({ chatId: undefined, workspaceIdentity, onStreamCompleted }),
        { initialProps: { workspaceIdentity: 'workspace:A' } }
      );

      let pending!: Promise<void>;
      await act(async () => {
        pending = result.current.sendMessageStream('Pertanyaan');
        await Promise.resolve();
      });
      expect(callbacks).toBeDefined();
      rerender({ workspaceIdentity: 'workspace:B' });

      await act(async () => {
        await callbacks?.onMessageComplete?.('Jawaban terlambat');
        await callbacks?.onError?.('error terlambat');
        releaseStream();
        await pending;
      });

      expect(onStreamCompleted).not.toHaveBeenCalled();
      expect(result.current.streamingStatus).toBe('cancelled');
      streamSpy.mockRestore();
    });

    it('retries a server processing failure by the same attachment ID without uploading a duplicate', async () => {
      const { result } = renderHook(() => useWorkspaceFileIngestion('workspace-retry'));
      vi.mocked(WorkspaceApiService.fetchChatAttachments).mockResolvedValue([]);
      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/retry')) return { ok: true, json: async () => ({ success: true, attachment: {
          id: 'file-1', filename: 'retry.txt', mimeType: 'text/plain', fileKind: 'text', size: 4, status: 'ready', url: '/file'
        } }) } as Response;
        expect((init?.body as FormData).get('files')).toBeInstanceOf(File);
        return { ok: true, json: async () => ({ success: true, attachment: {
          id: 'file-1', filename: 'retry.txt', mimeType: 'text/plain', fileKind: 'text', size: 4, status: 'failed', errorMessage: 'Parser error', url: '/file'
        } }) } as Response;
      });
      vi.stubGlobal('fetch', fetchMock);

      await act(async () => result.current.handleDrop({ preventDefault: vi.fn(), dataTransfer: { files: [new File(['text'], 'retry.txt', { type: 'text/plain' })] } } as unknown as React.DragEvent));
      expect(result.current.attachments[0]).toMatchObject({ id: 'file-1', status: 'failed', failureStage: 'processing' });
      await act(async () => result.current.retryAttachment(result.current.attachments[0]));

      expect(result.current.attachments[0]).toMatchObject({ id: 'file-1', status: 'ready' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(String(fetchMock.mock.calls[1][0])).toContain('/chat/attachments/file-1/retry?chatId=workspace-retry');
      vi.unstubAllGlobals();
    });

    it('keeps an attachment visible when server deletion fails', async () => {
      const { result } = renderHook(() => useWorkspaceFileIngestion());
      vi.mocked(WorkspaceApiService.fetchChatAttachments).mockResolvedValue([]);
      vi.mocked(WorkspaceApiService.deleteAttachment).mockRejectedValue(new Error('delete failed'));
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ success: true, attachment: {
        id: 'file-delete', filename: 'keep.txt', mimeType: 'text/plain', fileKind: 'text', size: 4, status: 'ready', url: '/file'
      } }) } as Response)));
      await act(async () => result.current.handleDrop({ preventDefault: vi.fn(), dataTransfer: { files: [new File(['text'], 'keep.txt', { type: 'text/plain' })] } } as unknown as React.DragEvent));

      await act(async () => result.current.removeAttachment(result.current.attachments[0]));

      expect(result.current.attachments).toHaveLength(1);
      expect(result.current.attachments[0].id).toBe('file-delete');
      vi.unstubAllGlobals();
    });

    it('accepts eight active documents and rejects the ninth in the client queue', async () => {
      const { result } = renderHook(() => useWorkspaceFileIngestion());
      vi.mocked(WorkspaceApiService.fetchChatAttachments).mockResolvedValue([]);
      vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const file = (init?.body as FormData).get('files') as File;
        return { ok: true, json: async () => ({ success: true, attachment: {
          id: `server-${file.name}`, filename: file.name, mimeType: 'text/plain', fileKind: 'text', size: file.size, status: 'ready', url: '/file'
        } }) } as Response;
      }));
      const files = Array.from({ length: 9 }, (_, index) => new File(['text'], `doc-${index}.txt`, { type: 'text/plain' }));

      await act(async () => result.current.handleDrop({ preventDefault: vi.fn(), dataTransfer: { files } } as unknown as React.DragEvent));

      expect(result.current.attachments).toHaveLength(8);
      vi.unstubAllGlobals();
    });
  });

  describe('5. Clear Chat Session', () => {
    it('deletes persisted messages before resetting local state and stays empty after reload', async () => {
      vi.mocked(WorkspaceApiService.fetchArtifacts).mockResolvedValue([]);
      vi.mocked(WorkspaceApiService.fetchMessages).mockResolvedValue([
        { id: 'old-msg', role: 'user', content: 'Pesan lama', createdAt: new Date() }
      ]);
      vi.mocked(WorkspaceApiService.clearMessages).mockResolvedValue();
      const { result, unmount } = renderHook(() => useWorkspacePersistence({ chatId: 'chat-clear', userName: 'Test User' }));
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
      expect(result.current.messages.map(message => message.content)).toContain('Pesan lama');

      await act(async () => {
        expect(await result.current.clearWorkspaceConversation()).toBe(true);
      });
      expect(WorkspaceApiService.clearMessages).toHaveBeenCalledWith('chat-clear');
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toContain('Halo');

      unmount();
      vi.mocked(WorkspaceApiService.fetchMessages).mockResolvedValueOnce([]);
      const reloaded = renderHook(() => useWorkspacePersistence({ chatId: 'chat-clear', userName: 'Test User' }));
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
      expect(reloaded.result.current.messages).toHaveLength(1);
      expect(reloaded.result.current.messages[0].content).toContain('Halo');
      expect(reloaded.result.current.messages.some(message => message.content.includes('Pesan lama'))).toBe(false);
      reloaded.unmount();
    });

    it('keeps visible messages if the persistent clear request fails', async () => {
      vi.mocked(WorkspaceApiService.fetchArtifacts).mockResolvedValue([]);
      vi.mocked(WorkspaceApiService.fetchMessages).mockResolvedValue([
        { id: 'kept-msg', role: 'user', content: 'Riwayat tetap terlihat', createdAt: new Date() }
      ]);
      const { result } = renderHook(() => useWorkspacePersistence({ chatId: 'chat-fail-clear' }));
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
      vi.mocked(WorkspaceApiService.clearMessages).mockRejectedValueOnce(new Error('offline'));

      await act(async () => {
        expect(await result.current.clearWorkspaceConversation()).toBe(false);
      });
      expect(result.current.messages.some(message => message.content.includes('Riwayat tetap terlihat'))).toBe(true);
    });

    it('ignores an initial message response that arrives after a successful clear', async () => {
      let resolveFetch: (messages: Message[]) => void = () => undefined;
      vi.mocked(WorkspaceApiService.fetchArtifacts).mockResolvedValue([]);
      vi.mocked(WorkspaceApiService.fetchMessages).mockImplementationOnce(() => new Promise(resolve => { resolveFetch = resolve; }));
      vi.mocked(WorkspaceApiService.clearMessages).mockResolvedValue();
      const { result } = renderHook(() => useWorkspacePersistence({ chatId: 'chat-race', userName: 'Test User' }));
      await act(async () => { await result.current.clearWorkspaceConversation(); });
      await act(async () => {
        resolveFetch([{ id: 'late-msg', role: 'user', content: 'Respons fetch lama', createdAt: new Date() }]);
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      expect(result.current.messages.some(message => message.content.includes('Respons fetch lama'))).toBe(false);
    });
  });
});
