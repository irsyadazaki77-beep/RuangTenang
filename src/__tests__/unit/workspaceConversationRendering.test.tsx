import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '../../features/chat/types';

const rowRenderSpy = vi.hoisted(() => vi.fn());

vi.mock('../../features/workspace/components/WorkspaceMessageRow', async () => {
  const ReactModule = await import('react');
  const MemoRow = ReactModule.memo(({ message }: { message: Message }) => {
    rowRenderSpy(message.id);
    return ReactModule.createElement('div', { 'data-testid': `row-${message.id}` });
  });
  return { WorkspaceMessageRow: MemoRow };
});

vi.mock('../../components/common/LazyMarkdown', () => ({ LazyMarkdown: () => null }));

import { WorkspaceConversation } from '../../features/workspace/components/WorkspaceConversation';

describe('Workspace conversation rendering', () => {
  it('keeps 500 completed message rows stable while a streaming bubble changes', () => {
    rowRenderSpy.mockClear();
    const messages: Message[] = Array.from({ length: 500 }, (_, index) => ({
      id: `message-${index}`,
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${index}`,
      createdAt: new Date(`2026-01-01T00:${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}Z`)
    }));
    const commonProps = {
      messages,
      isLoading: false,
      isStreaming: true,
      artifacts: [],
      starterTasks: [],
      onSelectStarterTask: vi.fn(),
      onRetryMessage: vi.fn(),
      onOpenCanvas: vi.fn(),
      onSendToCanvas: vi.fn()
    };
    const { rerender } = render(<WorkspaceConversation {...commonProps} activeStreamingMessage={{ id: 'live', role: 'assistant', content: 'First chunk', createdAt: new Date() }} />);

    expect(rowRenderSpy).toHaveBeenCalledTimes(500);
    rerender(<WorkspaceConversation {...commonProps} activeStreamingMessage={{ id: 'live', role: 'assistant', content: 'More streamed text', createdAt: new Date() }} />);

    expect(rowRenderSpy).toHaveBeenCalledTimes(500);
  });
});
