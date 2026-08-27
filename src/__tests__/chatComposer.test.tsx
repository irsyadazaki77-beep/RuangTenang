import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatComposer } from '../features/chat/components/ChatComposer';

describe('ChatComposer Component Tests', () => {
  it('renders chat input textarea and send button', () => {
    const onSend = vi.fn();
    render(
      <ChatComposer
        onSend={onSend}
        isTyping={false}
        onStop={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ceritakan apa saja di sini/i);
    expect(textarea).toBeInTheDocument();
  });

  it('triggers onSend when user submits non-empty text', () => {
    const onSend = vi.fn();
    render(
      <ChatComposer
        onSend={onSend}
        isTyping={false}
        onStop={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ceritakan apa saja di sini/i);
    fireEvent.change(textarea, { target: { value: 'Halo RuangTenang' } });

    const sendButton = screen.getByRole('button', { name: /Kirim Pesan/i });
    fireEvent.click(sendButton);

    expect(onSend).toHaveBeenCalledWith('Halo RuangTenang');
  });

  it('shows stop button when isTyping is true', () => {
    const onSend = vi.fn();
    const onStop = vi.fn();
    render(
      <ChatComposer
        onSend={onSend}
        isTyping={true}
        onStop={onStop}
      />
    );

    const stopButton = screen.getByRole('button', { name: /Hentikan Jawaban/i });
    expect(stopButton).toBeInTheDocument();
  });
});
