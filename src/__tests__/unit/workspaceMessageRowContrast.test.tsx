import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '../../features/chat/types';
import { WorkspaceMessageRow } from '../../features/workspace/components/WorkspaceMessageRow';

vi.mock('../../components/common/LazyMarkdown', () => ({
  LazyMarkdown: ({ content }: { content: string }) => <div data-testid="lazy-markdown">{content}</div>
}));

describe('WorkspaceMessageRow Contrast and Error Recovery', () => {
  const formatTime = (d?: Date | string) => '10:00';

  it('renders user message with high-contrast text classes for light and dark modes', () => {
    const userMsg: Message = {
      id: 'msg-user-1',
      role: 'user',
      content: 'Analisis dokumen studi kasus Value Chain ini.',
      createdAt: new Date()
    };

    const { container } = render(
      <WorkspaceMessageRow
        message={userMsg}
        isHighlighted={false}
        showArtifactLink={false}
        isCopied={false}
        onRetryMessage={vi.fn()}
        onOpenCanvas={vi.fn()}
        onOpenSource={vi.fn()}
        onCopyMessage={vi.fn()}
        formatMessageTime={formatTime}
      />
    );

    // Verify user bubble styling is high-contrast
    const bubble = container.querySelector('.rounded-xl.border');
    expect(bubble).not.toBeNull();
    // Must NOT have unreadable text-white on light or dark:text-slate-900 on dark
    expect(bubble?.className).toContain('text-slate-900');
    expect(bubble?.className).toContain('dark:text-slate-100');
    expect(bubble?.className).not.toContain('text-white dark:text-slate-900');
  });

  it('renders structured error message honestly with clear retry button', () => {
    const onRetry = vi.fn();
    const errorMsg: Message = {
      id: 'msg-err-1',
      role: 'assistant',
      content: 'Model AI sedang tidak dapat dihubungi untuk menganalisis dokumen saat ini. Silakan coba lagi sebentar lagi.',
      error: true,
      createdAt: new Date()
    };

    render(
      <WorkspaceMessageRow
        message={errorMsg}
        lastUserPrompt="Tolong rangkum Value Chain ini"
        isHighlighted={false}
        showArtifactLink={false}
        isCopied={false}
        onRetryMessage={onRetry}
        onOpenCanvas={vi.fn()}
        onOpenSource={vi.fn()}
        onCopyMessage={vi.fn()}
        formatMessageTime={formatTime}
      />
    );

    // Should display error text accurately
    expect(screen.getByText(/Model AI sedang tidak dapat dihubungi/i)).toBeInTheDocument();

    // Should have retry button
    const retryBtn = screen.getByRole('button', { name: /Kirim Ulang Pesan/i });
    expect(retryBtn).toBeInTheDocument();
    expect(retryBtn).not.toBeDisabled();

    // Clicking retry calls onRetryMessage with the last user prompt
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledWith('Tolong rangkum Value Chain ini', 'msg-err-1');
  });
});
