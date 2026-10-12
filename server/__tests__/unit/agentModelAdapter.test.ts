import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/ai/aiRequestService.js', () => ({
  aiRequestService: { generateChatResponse: vi.fn() }
}));

import { aiRequestService } from '../../services/ai/aiRequestService.js';
import { requestAgentDecision } from '../../services/agent/agentModelAdapter.js';

describe('agent model structured response adapter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests JSON mode and validates the complete decision shape', async () => {
    vi.mocked(aiRequestService.generateChatResponse).mockResolvedValue({
      text: JSON.stringify({ type: 'tool', toolId: 'search_workspace_documents', arguments: { query: 'annual review' } }),
      modelUsed: 'gemini-3.8-flash', isFallback: false
    });

    const result = await requestAgentDecision({
      userId: 'user-1', userTier: 'Pro', requestedModelId: 'gemini-3.8-flash',
      prompt: '{"request":"Compare documents"}', allowedToolIds: new Set(['search_workspace_documents']), abortSignal: new AbortController().signal
    });

    expect(result.decision).toEqual({ type: 'tool', toolId: 'search_workspace_documents', arguments: { query: 'annual review' } });
    expect(aiRequestService.generateChatResponse).toHaveBeenCalledWith(expect.objectContaining({ responseFormat: 'json', comparisonMode: true, maxOutputTokens: expect.any(Number) }));
  });

  it('rejects free text and invalid JSON without turning it into a tool call', async () => {
    vi.mocked(aiRequestService.generateChatResponse).mockResolvedValue({
      text: 'Please run search_workspace_documents now.', modelUsed: 'gemini-3.8-flash', isFallback: false
    });

    await expect(requestAgentDecision({
      userId: 'user-1', userTier: 'Pro', requestedModelId: 'gemini-3.8-flash',
      prompt: 'request', allowedToolIds: new Set(['search_workspace_documents']), abortSignal: new AbortController().signal
    })).rejects.toMatchObject({ code: 'AGENT_DECISION_INVALID' });
  });

  it('rejects fallback text rather than treating it as model output', async () => {
    vi.mocked(aiRequestService.generateChatResponse).mockResolvedValue({
      text: '{"type":"final","content":"fallback"}', modelUsed: 'local-empathetic-fallback', isFallback: true
    });

    await expect(requestAgentDecision({
      userId: 'user-1', userTier: 'Pro', requestedModelId: 'gemini-3.8-flash',
      prompt: 'request', allowedToolIds: new Set(), abortSignal: new AbortController().signal
    })).rejects.toMatchObject({ code: 'AGENT_MODEL_UNAVAILABLE' });
  });
});
