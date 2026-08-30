import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ChatStreamingClient } from '../../features/chat/services/chatStreamingClient';
import { useChatStreaming } from '../../features/chat/hooks/useChatStreaming';

describe('Chat Streaming Client & Race Condition Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockSseStream = (chunks: string[], delayMs = 10) => {
    const encoder = new TextEncoder();
    return new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          if (delayMs > 0) {
            await new Promise(r => setTimeout(r, delayMs));
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
  };

  it('handles stream response chunks correctly', async () => {
    const onChunk = vi.fn();
    const onMessageComplete = vi.fn();

    const stream = createMockSseStream(['Halo ', 'dunia!'], 0);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream
    });

    const client = new ChatStreamingClient();
    await client.stream(
      { message: 'Hai', aiModel: 'gemini-2.5-flash', chatMode: 'bebas', responseStyle: 'empati' },
      { onChunk, onMessageComplete }
    );

    expect(onChunk).toHaveBeenCalledWith('Halo ');
    expect(onChunk).toHaveBeenCalledWith('dunia!');
    expect(onMessageComplete).toHaveBeenCalledWith('Halo dunia!');
  });

  it('handles race condition: start stream 1 -> abort -> start stream 2 with only stream 2 output retained', async () => {
    const stream1Chunks: string[] = [];
    const stream2Chunks: string[] = [];
    let stream1CompletedText: string | null = null;
    let stream2CompletedText: string | null = null;

    const stream1 = createMockSseStream(['Stream1-A ', 'Stream1-B ', 'Stream1-C'], 30);
    const stream2 = createMockSseStream(['Stream2-A ', 'Stream2-B'], 10);

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, body: stream1 });
      }
      return Promise.resolve({ ok: true, body: stream2 });
    });

    const client = new ChatStreamingClient();

    // 1. Start stream 1 in background
    const p1 = client.stream(
      { message: 'Msg 1', aiModel: 'gemini-2.5-flash' },
      {
        onChunk: (t) => stream1Chunks.push(t),
        onMessageComplete: (t) => { stream1CompletedText = t; }
      }
    );

    // Wait a brief moment for stream 1 to start
    await new Promise(r => setTimeout(r, 15));

    // 2. Abort stream 1
    client.abort();

    // 3. Immediately start stream 2
    const p2 = client.stream(
      { message: 'Msg 2', aiModel: 'gemini-2.5-flash' },
      {
        onChunk: (t) => stream2Chunks.push(t),
        onMessageComplete: (t) => { stream2CompletedText = t; }
      }
    );

    await Promise.all([p1, p2]);

    // Stream 2 should have completed successfully
    expect(stream2Chunks).toEqual(['Stream2-A ', 'Stream2-B']);
    expect(stream2CompletedText).toBe('Stream2-A Stream2-B');

    // Stream 1 callbacks should not have tainted stream 2 completion
    expect(stream1CompletedText).not.toBe('Stream1-A Stream1-B Stream1-C');
  });

  it('useChatStreaming hook isolates successive requests using request tokens during burst multi-clicks', async () => {
    const stream1 = createMockSseStream(['Old Msg Chunk 1', 'Old Msg Chunk 2'], 40);
    const stream2 = createMockSseStream(['New Msg Chunk 1', 'New Msg Chunk 2'], 10);

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, body: stream1 });
      }
      return Promise.resolve({ ok: true, body: stream2 });
    });

    const { result } = renderHook(() => useChatStreaming());

    const chunksStream1: string[] = [];
    const chunksStream2: string[] = [];
    const completedStream1 = vi.fn();
    const completedStream2 = vi.fn();

    // Fire stream 1
    act(() => {
      result.current.streamMessage(
        { message: 'First Request' },
        {
          onMessageStart: vi.fn(),
          onChunk: (c) => chunksStream1.push(c),
          onPluginSwitch: vi.fn(),
          onMessageComplete: completedStream1,
          onError: vi.fn()
        }
      );
    });

    // Rapid burst: fire stream 2 before stream 1 finishes
    await new Promise(r => setTimeout(r, 15));

    await act(async () => {
      await result.current.streamMessage(
        { message: 'Second Request' },
        {
          onMessageStart: vi.fn(),
          onChunk: (c) => chunksStream2.push(c),
          onPluginSwitch: vi.fn(),
          onMessageComplete: completedStream2,
          onError: vi.fn()
        }
      );
    });

    // Stream 1 must not emit completion to override stream 2
    expect(completedStream1).not.toHaveBeenCalled();
    // Stream 2 must complete successfully
    expect(completedStream2).toHaveBeenCalledWith('New Msg Chunk 1New Msg Chunk 2');
    expect(chunksStream2).toEqual(['New Msg Chunk 1', 'New Msg Chunk 2']);
    expect(result.current.isTyping).toBe(false);
  });
});
