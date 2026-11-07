import { describe, it, expect } from 'vitest';
import {
  getMentionQuery,
  buildMentionItems,
  filterMentionItems
} from '../../features/workspace/components/WorkspaceMentionMenu';
import { WorkspaceArtifact } from '../../features/workspace/types';

describe('WorkspaceMentionMenu Logic', () => {
  it('extracts mention query correctly when typing @', () => {
    expect(getMentionQuery('@', 1)).toEqual({ query: '', mentionStartIndex: 0 });
    expect(getMentionQuery('@bab', 4)).toEqual({ query: 'bab', mentionStartIndex: 0 });
    expect(getMentionQuery('tolong jelaskan @metode', 23)).toEqual({ query: 'metode', mentionStartIndex: 16 });
    expect(getMentionQuery('halo email@test.com', 19)).toBeNull();
  });

  it('builds items from artifacts and attachments', () => {
    const mockArtifacts: WorkspaceArtifact[] = [
      {
        id: 'art-1',
        title: 'Bab 1 Pendahuluan',
        type: 'DOCUMENT',
        content: 'Isi bab 1',
        version: 1,
        chatId: 'c-1',
        createdAt: '2026-10-31',
        updatedAt: '2026-10-31'
      }
    ];
    const mockAttachments = [
      {
        id: 'att-1',
        name: 'Jurnal_Metode.pdf',
        size: 1048576,
        isText: true
      }
    ];

    const items = buildMentionItems(mockArtifacts, mockAttachments);
    expect(items.length).toBe(2);
    expect(items[0].title).toBe('Bab 1 Pendahuluan');
    expect(items[0].kind).toBe('artifact');
    expect(items[1].title).toBe('Jurnal_Metode.pdf');
    expect(items[1].kind).toBe('attachment');
  });

  it('filters mention items by keyword', () => {
    const mockArtifacts: WorkspaceArtifact[] = [
      { id: '1', title: 'Bab 1 Pendahuluan', type: 'DOCUMENT', content: '', version: 1, chatId: 'c-1', createdAt: '', updatedAt: '' },
      { id: '2', title: 'Bab 2 Tinjauan Pustaka', type: 'DOCUMENT', content: '', version: 1, chatId: 'c-1', createdAt: '', updatedAt: '' }
    ];
    const items = buildMentionItems(mockArtifacts, []);
    const filtered = filterMentionItems(items, 'bab 2');
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('Bab 2 Tinjauan Pustaka');
  });
});
