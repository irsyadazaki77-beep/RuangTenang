import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useChatScroll } from '../../features/chat/hooks/useChatScroll';

function ScrollHarness() {
  const scroll = useChatScroll([], false);
  return (
    <>
      <div data-testid="scroll-container" ref={scroll.scrollContainerRef} />
      <output data-testid="show-scroll-bottom">{String(scroll.showScrollBottom)}</output>
      <button type="button" onClick={() => scroll.scrollToBottom(false)}>Scroll to latest</button>
    </>
  );
}

describe('useChatScroll', () => {
  it('shows a jump-to-latest affordance when the reader scrolls away from the bottom', () => {
    render(<ScrollHarness />);
    const container = screen.getByTestId('scroll-container');
    Object.defineProperties(container, {
      scrollTop: { configurable: true, writable: true, value: 0 },
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 300 }
    });

    fireEvent.scroll(container);
    expect(screen.getByTestId('show-scroll-bottom')).toHaveTextContent('true');
  });

  it('moves the conversation to the latest message on request', () => {
    render(<ScrollHarness />);
    const container = screen.getByTestId('scroll-container');
    Object.defineProperties(container, {
      scrollTop: { configurable: true, writable: true, value: 0 },
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 300 }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scroll to latest' }));
    expect(container.scrollTop).toBe(1000);
  });
});
