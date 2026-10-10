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
  it('keeps completed message rows stable while a streaming bubble changes', () => {
    rowRenderSpy.mockClear();
    const messages: Message[] = [
      { id: 'user-1', role: 'user', content: 'Question', createdAt: new Date('2026-01-01T00:00:00Z') },
      { id: 'assistant-1', role: 'assistant', content: 'Completed answer', createdAt: new Date('2026-01-01T00:00:01Z') }
    ];
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

    expect(rowRenderSpy.mock.calls.map(([id]) => id)).toEqual(['user-1', 'assistant-1']);
    rerender(<WorkspaceConversation {...commonProps} activeStreamingMessage={{ id: 'live', role: 'assistant', content: 'More streamed text', createdAt: new Date() }} />);

    expect(rowRenderSpy).toHaveBeenCalledTimes(2);
  });
});
