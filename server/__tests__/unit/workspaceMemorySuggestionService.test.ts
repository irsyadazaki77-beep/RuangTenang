import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUserConsents = vi.fn();
const generateChatResponse = vi.fn();
const listMemories = vi.fn();

vi.mock('../../services/consentService.js', () => ({ consentService: { getUserConsents } }));
vi.mock('../../services/ai/aiRequestService.js', () => ({ aiRequestService: { generateChatResponse } }));
vi.mock('../../services/workspaceMemoryService.js', () => ({ WorkspaceMemoryService: { listMemories } }));

const { workspaceMemorySuggestionService } = await import('../../services/workspaceMemorySuggestionService.js');

const params = {
  userId: 'user-1',
  workspaceId: 'chat-1',
  userMessage: 'Skripsi saya tentang NLP bahasa Indonesia dan dosen minta sitasi APA 7.',
  assistantReply: 'Baik, saya akan memakai APA 7.'
};

const aiReturns = (suggestions: unknown) =>
  generateChatResponse.mockResolvedValue({ text: JSON.stringify({ suggestions }), modelUsed: 'm', isFallback: false });

describe('workspaceMemorySuggestionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserConsents.mockResolvedValue({ consentForAI: true, consentForAIMemory: true });
    listMemories.mockResolvedValue([]);
  });

  it('returns nothing and never calls the model without memory consent', async () => {
    getUserConsents.mockResolvedValue({ consentForAI: true, consentForAIMemory: false });
    expect(await workspaceMemorySuggestionService.suggest(params)).toEqual([]);
    expect(generateChatResponse).not.toHaveBeenCalled();
  });

  it('skips messages that mention mental-health or crisis topics', async () => {
    const result = await workspaceMemorySuggestionService.suggest({ ...params, userMessage: 'Saya merasa depresi karena skripsi ini sangat berat sekali.' });
    expect(result).toEqual([]);
    expect(generateChatResponse).not.toHaveBeenCalled();
  });

  it('returns valid suggestions and drops invalid categories, sensitive text, and duplicates', async () => {
    listMemories.mockResolvedValue([{ isActive: true, content: 'Dosen meminta sitasi APA 7' }]);
    aiReturns([
      { category: 'goal', content: 'Skripsi membahas NLP bahasa Indonesia' },
      { category: 'constraint', content: 'Dosen meminta sitasi APA 7' },
      { category: 'unknown', content: 'Kategori tidak dikenal' },
      { category: 'preference', content: 'Pengguna sedang depresi berat' },
      { category: 'goal', content: 'Skripsi membahas NLP bahasa Indonesia' }
    ]);
    const result = await workspaceMemorySuggestionService.suggest(params);
    expect(result).toEqual([{ category: 'goal', content: 'Skripsi membahas NLP bahasa Indonesia' }]);
  });

  it('caps suggestions at three and tolerates malformed model output', async () => {
    aiReturns(['satu', 'dua', 'tiga', 'empat'].map(word => ({ category: 'progress', content: `Progres ${word} selesai dikerjakan` })));
    expect(await workspaceMemorySuggestionService.suggest(params)).toHaveLength(3);
    generateChatResponse.mockResolvedValue({ text: 'bukan json', modelUsed: 'm', isFallback: false });
    expect(await workspaceMemorySuggestionService.suggest(params)).toEqual([]);
  });

  it('ignores fallback responses', async () => {
    generateChatResponse.mockResolvedValue({ text: '{"suggestions":[{"category":"goal","content":"Tujuan dari fallback"}]}', modelUsed: 'x', isFallback: true });
    expect(await workspaceMemorySuggestionService.suggest(params)).toEqual([]);
  });
});
