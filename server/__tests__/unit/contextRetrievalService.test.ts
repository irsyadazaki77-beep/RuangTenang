import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findAttachments, findChunks } = vi.hoisted(() => ({
  findAttachments: vi.fn(),
  findChunks: vi.fn()
}));

vi.mock('../../database.js', () => ({ prisma: {
  attachments: { findMany: findAttachments },
  documentChunks: { findMany: findChunks }
} }));
vi.mock('../../services/piiService.js', () => ({ scanAndSanitizePII: (text: string) => ({ sanitizedText: text }) }));
vi.mock('../../security.js', () => ({ detectPromptInjection: () => false }));
vi.mock('../../services/encryptionService.js', () => ({ encryptionService: { decryptSensitive: (text: string) => text } }));

import { contextRetrievalService } from '../../services/file-intelligence/contextRetrievalService.js';

describe('Workspace document context retrieval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findAttachments.mockResolvedValue([
      { id: 'file-agile', filename: 'Agile.pdf', mimeType: 'application/pdf', fileKind: 'pdf' },
      { id: 'file-waterfall', filename: 'Waterfall.pdf', mimeType: 'application/pdf', fileKind: 'pdf' }
    ]);
  });

  it('prioritizes relevant chunks and includes accurate source metadata in a reusable snapshot', async () => {
    findChunks.mockResolvedValue([
      { id: 'chunk-agile', attachmentId: 'file-agile', chunkIndex: 0, content: 'Agile uses iterative sprints and continuous feedback.', tokenCount: 14, isEncrypted: false, pageStart: 2, checksum: 'a' },
      { id: 'chunk-waterfall', attachmentId: 'file-waterfall', chunkIndex: 0, content: 'Waterfall progresses through requirements, design, implementation, verification, and maintenance.', tokenCount: 18, isEncrypted: false, pageStart: 4, checksum: 'b' }
    ]);
    const result = await contextRetrievalService.retrieveContext({
      userId: 'user-a', chatId: 'workspace-1', attachmentIds: ['file-agile', 'file-waterfall'],
      userQuery: 'Jelaskan tahapan Waterfall', maxTokens: 100
    });

    expect(result.chunksSelected[0]?.documentId).toBe('file-waterfall');
    expect(result.snapshot.selectedAttachmentIds).toContain('file-waterfall');
    expect(result.sourceReferences[0]).toMatchObject({ filename: 'Waterfall.pdf', page: 4, documentId: 'file-waterfall' });
    expect(result.contextBlock).toContain('Waterfall.pdf [Bagian 1]');
    expect(findAttachments).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 'user-a', chatId: 'workspace-1', id: { in: ['file-agile', 'file-waterfall'] } })
    }));
  });

  it('keeps selected context within the configured token budget', async () => {
    findChunks.mockResolvedValue(Array.from({ length: 6 }, (_, index) => ({
      id: `chunk-${index}`, attachmentId: 'file-agile', chunkIndex: index,
      content: `Agile sprint planning and review notes ${index}.`, tokenCount: 40,
      isEncrypted: false, checksum: String(index)
    })));
    const result = await contextRetrievalService.retrieveContext({
      userId: 'user-a', chatId: 'workspace-1', attachmentIds: ['file-agile'],
      userQuery: 'Agile sprint', maxTokens: 60, maxChunks: 8
    });
    expect(result.totalTokensUsed).toBeLessThanOrEqual(60);
    expect(result.snapshot.totalTokensUsed).toBeLessThanOrEqual(60);
  });

  it('does not fall back to every workspace document when the explicit active set is empty', async () => {
    const result = await contextRetrievalService.retrieveContext({ userId: 'user-a', chatId: 'workspace-1', attachmentIds: [] });
    expect(findAttachments).not.toHaveBeenCalled();
    expect(result.chunksSelected).toEqual([]);
  });

  it('rejects an attachment selected from a different workspace scope', async () => {
    findAttachments.mockResolvedValue([]);
    const result = await contextRetrievalService.retrieveContext({
      userId: 'user-a', chatId: 'workspace-b', attachmentIds: ['file-from-workspace-a'], userQuery: 'metode'
    });
    expect(findAttachments).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 'user-a', chatId: 'workspace-b', id: { in: ['file-from-workspace-a'] } })
    }));
    expect(result.chunksSelected).toEqual([]);
  });
});
