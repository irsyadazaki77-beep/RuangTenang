import { describe, it, expect, vi } from 'vitest';
import { ChatStreamingClient } from '../features/chat/services/chatStreamingClient';

describe('Chat Streaming Client Unit Tests', () => {
  it('handles stream response chunks correctly', async () => {
    const onChunk = vi.fn();
    const onMessageComplete = vi.fn();

    const streamData = [
      'data: ' + JSON.stringify({ text: 'Halo ' }) + '\n\n',
      'data: ' + JSON.stringify({ text: 'dunia!' }) + '\n\n',
      'data: [DONE]\n\n'
    ].join('');

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(streamData));
        controller.close();
      }
    });

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
});
