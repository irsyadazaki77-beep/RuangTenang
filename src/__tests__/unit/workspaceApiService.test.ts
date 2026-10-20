import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { WorkspaceApiService, type WorkspaceSearchPage, type WorkspaceTabularOverviewDto } from '../../features/workspace/services/workspaceApiService';
import type { WorkspaceContract } from '../../../shared/contracts/workspace';

vi.mock('../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), request: vi.fn() }
}));

const workspace = (index: number): WorkspaceContract => ({
  id: `workspace-${index}`,
  chatId: `chat-${index}`,
  name: `Workspace ${index}`,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z'
});

describe('WorkspaceApiService.listWorkspaces', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches one bounded list page and exposes the next offset', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => workspace(index));
    const firstResponse = { items: firstPage, hasMore: true, nextOffset: 100 };
    const secondResponse = { items: [workspace(100)], hasMore: false, nextOffset: 101 };
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ success: true, data: firstResponse })
      .mockResolvedValueOnce({ success: true, data: secondResponse });

    const result = await WorkspaceApiService.listWorkspaces();
    expect(result).toEqual(firstResponse);
    const nextPage = await WorkspaceApiService.listWorkspaces(result.nextOffset);

    expect(nextPage).toEqual(secondResponse);
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/v1/workspace?offset=0&limit=100', { signal: undefined });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/v1/workspace?offset=100&limit=100', { signal: undefined });
  });

  it('unwraps server { success: true, data: ... } envelopes returned by apiClient', async () => {
    const page = { items: [workspace(1)], hasMore: false, nextOffset: 1 };
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: { success: true, data: page } as any
    });

    const result = await WorkspaceApiService.listWorkspaces();
    expect(result).toEqual(page);
  });
});

describe('WorkspaceApiService envelope unwrapping', () => {
  beforeEach(() => vi.clearAllMocks());

  it('unwraps createWorkspace, fetchWorkspace, and fetchArtifacts envelopes from backend routes', async () => {
    const created = workspace(42);
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      success: true,
      data: { success: true, data: created } as any
    });
    await expect(WorkspaceApiService.createWorkspace('Riset Baru')).resolves.toEqual(created);

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: { success: true, data: created } as any
    });
    await expect(WorkspaceApiService.fetchWorkspace('chat-42')).resolves.toEqual(created);

    const artifacts = [{
      id: 'art-1',
      chatId: 'chat-42',
      title: 'Draf',
      type: 'DOCUMENT' as const,
      content: 'Isi dokumen',
      version: 1,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z'
    }];
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: { success: true, data: artifacts } as any
    });
    await expect(WorkspaceApiService.fetchArtifacts('chat-42')).resolves.toEqual(artifacts);
  });
});

describe('WorkspaceApiService.searchWorkspaces', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes the category and continuation cursor and returns a bounded search page', async () => {
    const page: WorkspaceSearchPage = {
      items: [{ kind: 'message', chatId: 'chat-1', itemId: 'message-101', title: 'Workspace', snippet: 'needle', updatedAt: '2026-10-17T00:00:00.000Z' }],
      hasMore: true,
      nextCursor: 'cursor-next'
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ success: true, data: page });
    const controller = new AbortController();

    await expect(WorkspaceApiService.searchWorkspaces('needle', controller.signal, 'message', 'cursor-prev')).resolves.toEqual(page);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/workspace/search?q=needle&kind=message&cursor=cursor-prev', { signal: controller.signal });
  });
});

describe('WorkspaceApiService.fetchMessagesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes the cursor and preserves the server continuation pointer', async () => {
    const messages = [{ id: 'message-51', role: 'user', content: 'Pesan lama' }];
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: { data: messages, nextCursor: 'cursor-message-51' }
    });
    const controller = new AbortController();

    await expect(WorkspaceApiService.fetchMessagesPage('chat-1', 'cursor-previous', controller.signal)).resolves.toEqual({
      messages,
      nextCursor: 'cursor-message-51'
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/chat/chat-1/messages?limit=50&cursor=cursor-previous',
      { signal: controller.signal }
    );
  });
});

describe('WorkspaceApiService.fetchTabularDatasetOverview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests the selected sheet profile and first row page in one cancellable call', async () => {
    const overview: WorkspaceTabularOverviewDto = {
      dataset: {
        id: 'att-1:Data', workspaceId: 'chat-1', sourceFileId: 'att-1', name: 'sales.csv', sheetName: 'Data', version: 'checksum-1',
        rowCount: 1, columnCount: 1, columns: [], sheets: [{ name: 'Data', rowCount: 1, columnCount: 1, empty: false }],
        activeSheet: 'Data', profileScope: 'complete',
        quality: { missingCellCount: 0, missingCellPercent: 0, duplicateRowCount: 0, emptyColumnCount: 0, inconsistentColumns: [], repeatedHeaderRows: 0, potentialOutlierCells: 0 },
        createdAt: '2026-10-17T00:00:00.000Z'
      },
      preview: { sheetName: 'Data', columns: ['category'], rows: [{ category: 'A' }], offset: 0, limit: 25, rowCount: 1 }
    };
    const controller = new AbortController();
    vi.mocked(apiClient.get).mockResolvedValueOnce({ success: true, data: overview });

    await expect(WorkspaceApiService.fetchTabularDatasetOverview('att/1', 'Data', controller.signal)).resolves.toEqual(overview);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/chat/attachments/att%2F1/dataset/overview?sheet=Data', { signal: controller.signal });
  });
});
