import React, { Profiler } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatStreamingClient } from '../../features/chat/services/chatStreamingClient';
import * as artifactParser from '../../features/workspace/utils/artifactParser';
import { useWorkspaceStreaming } from '../../features/workspace/hooks/useWorkspaceStreaming';

vi.mock('../../components/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

describe('Workspace streaming performance', () => {
  afterEach(() => vi.restoreAllMocks());

  it('batches 500 tiny chunks and skips artifact parsing for plain text', async () => {
    const onRender = vi.fn();
    const onStreamCompleted = vi.fn();
    const parserSpy = vi.spyOn(artifactParser, 'parseArtifactsFromText');
    const streamSpy = vi.spyOn(ChatStreamingClient.prototype, 'stream').mockImplementation(async (_payload, callbacks) => {
      callbacks.onMessageStart?.('assistant');
      for (let index = 0; index < 500; index += 1) {
        callbacks.onChunk?.('x');
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      await callbacks.onMessageComplete?.('x'.repeat(500));
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Profiler id="workspace-stream" onRender={onRender}>{children}</Profiler>
    );
    const { result } = renderHook(
      () => useWorkspaceStreaming({ workspaceIdentity: 'performance:workspace', onStreamCompleted }),
      { wrapper }
    );

    await act(async () => { await result.current.sendMessageStream('test'); });

    const renderCount = onRender.mock.calls.length;
    console.info(`[workspace-perf] 500 chunks committed ${renderCount} React renders (50ms flush target)`);
    expect(renderCount).toBeLessThan(25);
    expect(onStreamCompleted).toHaveBeenCalledTimes(1);
    expect(onStreamCompleted.mock.calls[0][0].content).toBe('x'.repeat(500));
    expect(parserSpy).not.toHaveBeenCalled();
    expect(streamSpy).toHaveBeenCalledTimes(1);
  }, 15000);
});
