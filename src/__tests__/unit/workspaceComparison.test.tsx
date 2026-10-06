import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkspaceComparisonPanel } from '../../features/workspace/components/WorkspaceComparisonPanel';
import { WorkspaceCompareModelSelector } from '../../features/workspace/components/WorkspaceCompareModelSelector';
import type { WorkspaceComparisonRun } from '../../features/workspace/types';

vi.mock('../../lib/aiModelCatalog', () => ({
  useAiModelCatalog: () => ({ models: [
    { id: 'gemini-3.8-flash', name: 'Gemini Flash', selectable: true, capabilities: ['chat', 'streaming'], provider: 'gemini' },
    { id: 'deepseek-chat', name: 'DeepSeek Chat', selectable: true, capabilities: ['chat', 'streaming'], provider: 'deepseek' },
    { id: 'groq-gpt-120b', name: 'Groq GPT OSS', selectable: true, capabilities: ['chat', 'streaming'], provider: 'groq' },
    { id: 'groq-qwen-27b', name: 'Groq Qwen', selectable: true, capabilities: ['chat', 'streaming'], provider: 'groq' }
  ] })
}));

const run: WorkspaceComparisonRun = {
  comparisonId: '11111111-1111-4111-8111-111111111111',
  snapshotId: '22222222-2222-4222-8222-222222222222',
  chatId: 'chat-1', prompt: 'Ringkas artikel ini', selectedModelIds: ['gemini-3.8-flash', 'deepseek-chat'],
  responseStyle: 'Akademik', activeContext: { title: 'Artikel', content: 'Isi sama' }
};

function streamResponse(events: unknown[]) {
  const encoder = new TextEncoder();
  const normalizedEvents = events.map(event => {
    const item = event as Record<string, unknown>;
    return { comparisonId: run.comparisonId, snapshotId: run.snapshotId, ...(item.candidateId ? { attemptId: `attempt-${item.candidateId}` } : {}), ...item };
  });
  return new Response(new ReadableStream({
    start(controller) {
      normalizedEvents.forEach(event => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)));
      controller.close();
    }
  }), { headers: { 'Content-Type': 'text/event-stream' } });
}

describe('Workspace AI comparison panel', () => {
  it('lets users select three models and reports the fourth selection limit without replacing one', async () => {
    const onChange = vi.fn();
    const view = render(<WorkspaceCompareModelSelector selectedModelIds={['gemini-3.8-flash', 'deepseek-chat']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Pilih model comparison/ }));
    fireEvent.click(screen.getByRole('button', { name: /Groq GPT OSS/ }));
    expect(onChange).toHaveBeenCalledWith(['gemini-3.8-flash', 'deepseek-chat', 'groq-gpt-120b']);
    view.rerender(<WorkspaceCompareModelSelector selectedModelIds={['gemini-3.8-flash', 'deepseek-chat', 'groq-gpt-120b']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Groq Qwen/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Maksimal 3 model dapat dibandingkan sekaligus.');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('keeps a failed candidate isolated while another completes and only selects the chosen output', async () => {
    const onUse = vi.fn();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(streamResponse([
      { type: 'candidate_started', comparisonId: run.comparisonId, candidateId: 'gemini-3.8-flash', modelName: 'Gemini Flash' },
      { type: 'candidate_chunk', comparisonId: run.comparisonId, candidateId: 'gemini-3.8-flash', text: 'Jawaban A' },
      { type: 'candidate_completed', comparisonId: run.comparisonId, candidateId: 'gemini-3.8-flash', latencyMs: 900 },
      { type: 'candidate_started', comparisonId: run.comparisonId, candidateId: 'deepseek-chat', modelName: 'DeepSeek Chat' },
      { type: 'candidate_failed', comparisonId: run.comparisonId, candidateId: 'deepseek-chat' },
      { type: 'comparison_completed', comparisonId: run.comparisonId }
    ]));
    render(<WorkspaceComparisonPanel run={run} onUseResponse={onUse} onSendToCanvas={vi.fn()} onCompareAgain={vi.fn()} />);

    expect(await screen.findByText('Jawaban A')).toBeInTheDocument();
    expect(screen.getByText('Model gagal menyelesaikan respons.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      prompt: run.prompt, selectedModelIds: run.selectedModelIds, activeContext: run.activeContext
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Gunakan jawaban ini/ })[0]);
    expect(onUse).toHaveBeenCalledTimes(1);
    expect(onUse.mock.calls[0][0]).toEqual(run);
    expect(onUse.mock.calls[0][1]).toMatchObject({ modelId: 'gemini-3.8-flash', output: 'Jawaban A', status: 'completed' });
    fetchMock.mockRestore();
  });

  it('aborts stale comparison transport when the panel leaves the conversation', async () => {
    let signal: AbortSignal | undefined;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (String(input).endsWith('/stream')) signal = init?.signal as AbortSignal;
      return new Promise(() => undefined);
    });
    const view = render(<WorkspaceComparisonPanel run={run} onUseResponse={vi.fn()} onSendToCanvas={vi.fn()} onCompareAgain={vi.fn()} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    view.unmount();
    expect(signal?.aborted).toBe(true);
    fetchMock.mockRestore();
  });

  it('ignores late chunks from an obsolete attempt', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(streamResponse([
      { type: 'candidate_started', candidateId: 'gemini-3.8-flash', attemptId: 'attempt-current' },
      { type: 'candidate_chunk', candidateId: 'gemini-3.8-flash', attemptId: 'attempt-current', text: 'Hasil terbaru' },
      { type: 'candidate_chunk', candidateId: 'gemini-3.8-flash', attemptId: 'attempt-obsolete', text: 'HASIL LAMA' },
      { type: 'candidate_completed', candidateId: 'gemini-3.8-flash', attemptId: 'attempt-current' },
      { type: 'candidate_failed', candidateId: 'deepseek-chat', attemptId: 'attempt-deepseek-chat' }
    ]));
    render(<WorkspaceComparisonPanel run={run} onUseResponse={vi.fn()} onSendToCanvas={vi.fn()} onCompareAgain={vi.fn()} />);
    expect(await screen.findByText('Hasil terbaru')).toBeInTheDocument();
    expect(screen.queryByText('Hasil terbaruHASIL LAMA')).not.toBeInTheDocument();
    expect(screen.queryByText('HASIL LAMA')).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('stops one candidate independently and exposes Stop All for the remaining stream', async () => {
    const encoder = new TextEncoder();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (String(input).includes('/cancel/')) return Promise.resolve(new Response('{}', { status: 200 }));
      return Promise.resolve(new Response(new ReadableStream({ start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'candidate_started', comparisonId: run.comparisonId, snapshotId: run.snapshotId, attemptId: 'attempt-gemini-3.8-flash', candidateId: 'gemini-3.8-flash', modelName: 'Gemini Flash' })}\n\ndata: ${JSON.stringify({ type: 'candidate_started', comparisonId: run.comparisonId, snapshotId: run.snapshotId, attemptId: 'attempt-deepseek-chat', candidateId: 'deepseek-chat', modelName: 'DeepSeek Chat' })}\n\n`));
      } }), { headers: { 'Content-Type': 'text/event-stream' } }));
    });
    render(<WorkspaceComparisonPanel run={run} onUseResponse={vi.fn()} onSendToCanvas={vi.fn()} onCompareAgain={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Hentikan Gemini Flash' }));
    expect(await screen.findByText('Dihentikan')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Stop All/ }));
    await waitFor(() => expect(fetchMock.mock.calls.some(call => String(call[0]).endsWith(`/cancel`))).toBe(true));
    fetchMock.mockRestore();
  });

  it('retries an individual failed candidate with identical snapshot', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(streamResponse([
        { type: 'candidate_started', comparisonId: run.comparisonId, candidateId: 'gemini-3.8-flash', modelName: 'Gemini Flash' },
        { type: 'candidate_chunk', comparisonId: run.comparisonId, candidateId: 'gemini-3.8-flash', text: 'Hasil Gemini' },
        { type: 'candidate_completed', comparisonId: run.comparisonId, candidateId: 'gemini-3.8-flash', latencyMs: 800 },
        { type: 'candidate_started', comparisonId: run.comparisonId, candidateId: 'deepseek-chat', modelName: 'DeepSeek Chat' },
        { type: 'candidate_failed', comparisonId: run.comparisonId, candidateId: 'deepseek-chat' },
        { type: 'comparison_completed', comparisonId: run.comparisonId }
      ]))
      .mockImplementationOnce((_input, init) => {
        const body = JSON.parse(String(init?.body));
        return Promise.resolve(streamResponse([
          { type: 'candidate_started', candidateId: 'deepseek-chat', attemptId: body.attemptId, modelName: 'DeepSeek Chat' },
          { type: 'candidate_chunk', candidateId: 'deepseek-chat', attemptId: body.attemptId, text: 'Hasil DeepSeek setelah retry' },
          { type: 'candidate_completed', candidateId: 'deepseek-chat', attemptId: body.attemptId, latencyMs: 650 }
        ]));
      });

    render(<WorkspaceComparisonPanel run={run} onUseResponse={vi.fn()} onSendToCanvas={vi.fn()} onCompareAgain={vi.fn()} />);

    expect(await screen.findByText('Hasil Gemini')).toBeInTheDocument();
    const retryBtn = await screen.findByRole('button', { name: 'Coba lagi DeepSeek Chat' });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('Hasil DeepSeek setelah retry')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain(`/chat/compare/${run.comparisonId}/retry/deepseek-chat`);
    const retryBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(retryBody).toMatchObject({ snapshotId: run.snapshotId });
    expect(retryBody.attemptId).toMatch(/^[0-9a-f-]{36}$/i);
    fetchMock.mockRestore();
  });
});
