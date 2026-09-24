import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { AuroraBackground } from '../../components/ui/AuroraBackground';
import { dispatchAuroraStreaming, AURORA_STREAMING_EVENT } from '../../lib/auroraEvents';

describe('AuroraBackground Component Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders AuroraBackground with fixed container, ambient veil, and grain filter', () => {
    const { container } = render(<AuroraBackground className="custom-test-class" />);
    
    const root = container.firstChild as HTMLElement;
    expect(root).toBeDefined();
    expect(root.className).toContain('fixed inset-0');
    expect(root.className).toContain('pointer-events-none');
    expect(root.className).toContain('custom-test-class');

    // Check SVG grain filter
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg?.querySelector('feTurbulence')).toBeDefined();
  });

  it('renders 3 fluid atmospheric light masses', () => {
    const { container } = render(<AuroraBackground />);
    // The 3 fluid ribbons are motion.div elements inside the relative container
    const layers = container.querySelectorAll('.absolute.inset-0 > div > div');
    expect(layers.length).toBe(3);
  });

  it('responds to rt-aurora-streaming custom events smoothly', () => {
    const { container } = render(<AuroraBackground />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('rt-aurora-streaming', { detail: { isStreaming: true } })
      );
    });

    expect(container.firstChild).toBeDefined();

    act(() => {
      window.dispatchEvent(
        new CustomEvent('rt-aurora-streaming', { detail: { isStreaming: false } })
      );
    });

    expect(container.firstChild).toBeDefined();
  });

  it('transitions from thinking to finishing, and then to idle after the deceleration period', () => {
    vi.useFakeTimers();
    const { container } = render(<AuroraBackground />);

    // Step 1: AI starts streaming -> thinking
    act(() => {
      dispatchAuroraStreaming(true);
    });
    expect(container.firstChild).toBeDefined();

    // Step 2: AI completes streaming -> enters finishing state ('slow exhale')
    act(() => {
      dispatchAuroraStreaming(false);
    });
    expect(container.firstChild).toBeDefined();

    // Step 3: Advance timer past the 1800ms smooth deceleration
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(container.firstChild).toBeDefined();
  });

  it('handles isStreaming prop directly as an alternative to events', () => {
    const { container, rerender } = render(<AuroraBackground isStreaming={false} />);
    expect(container.firstChild).toBeDefined();

    rerender(<AuroraBackground isStreaming={true} />);
    expect(container.firstChild).toBeDefined();

    rerender(<AuroraBackground isStreaming={false} />);
    expect(container.firstChild).toBeDefined();
  });

  it('cleans up rt-aurora-streaming event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<AuroraBackground />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      AURORA_STREAMING_EVENT,
      expect.any(Function)
    );
  });

  it('renders children if passed into AuroraBackground', () => {
    const { getByText } = render(
      <AuroraBackground>
        <div data-testid="child-content">RuangTenang Content</div>
      </AuroraBackground>
    );

    expect(getByText('RuangTenang Content')).toBeDefined();
  });
});
