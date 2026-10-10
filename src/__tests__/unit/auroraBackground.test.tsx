import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { AuroraBackground } from '../../components/ui/AuroraBackground';
import {
  dispatchAuroraStreaming,
  dispatchAuroraActivity,
  AURORA_STREAMING_EVENT,
  AURORA_ACTIVITY_EVENT
} from '../../lib/auroraEvents';

describe('AuroraBackground Component Unit Tests — Unified Aurora 2.0', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // A. Mode Rendering: Ruang Tenang & Ruang Kerja Visual Distinction
  describe('A. Mode Rendering', () => {
    it('renders Ruang Tenang with calm sanctuary palette and data attributes', () => {
      const { container } = render(<AuroraBackground variant="tenang" className="custom-test-class" />);
      const root = container.firstChild as HTMLElement;

      expect(root).toBeDefined();
      expect(root.getAttribute('data-aurora-variant')).toBe('tenang');
      expect(root.className).toContain('fixed inset-0');
      expect(root.className).toContain('pointer-events-none');
      expect(root.className).toContain('custom-test-class');
      expect(root.className).toContain('bg-[#fafaf9]');
      expect(root.className).toContain('dark:bg-[#080d16]');

      // Check SVG grain filter
      const svg = container.querySelector('svg');
      expect(svg).toBeDefined();
      expect(svg?.querySelector('feTurbulence')).toBeDefined();
    });

    it('renders Ruang Kerja with focused futuristic palette and distinctive base', () => {
      const { container } = render(<AuroraBackground variant="kerja" />);
      const root = container.firstChild as HTMLElement;

      expect(root).toBeDefined();
      expect(root.getAttribute('data-aurora-variant')).toBe('kerja');
      expect(root.className).toContain('bg-[#f8fafc]');
      expect(root.className).toContain('dark:bg-[#090e17]');
    });

    it('renders 3 fluid atmospheric light masses with distinct gradients per variant', () => {
      const { container: tenangContainer } = render(<AuroraBackground variant="tenang" />);
      const tenangLayers = tenangContainer.querySelectorAll('.absolute.inset-0 > div > div');
      expect(tenangLayers.length).toBe(3);

      const { container: kerjaContainer } = render(<AuroraBackground variant="kerja" />);
      const kerjaLayers = kerjaContainer.querySelectorAll('.absolute.inset-0 > div > div');
      expect(kerjaLayers.length).toBe(3);

      // Verify layer 1 gradient differs between tenang (teal/emerald) and kerja (indigo/violet)
      const tenangLayer1Style = (tenangLayers[0] as HTMLElement).style.background;
      const kerjaLayer1Style = (kerjaLayers[0] as HTMLElement).style.background;
      expect(tenangLayer1Style).toContain('13, 148, 136'); // Teal
      expect(kerjaLayer1Style).toContain('99, 102, 241'); // Indigo
    });
  });

  // B. Thinking State
  describe('B. Thinking State', () => {
    it('transitions to thinking phase via rich activity event', () => {
      const { container } = render(<AuroraBackground variant="tenang" />);
      const root = container.firstChild as HTMLElement;
      expect(root.getAttribute('data-aurora-phase')).toBe('idle');

      act(() => {
        dispatchAuroraActivity({
          mode: 'RUANG_TENANG',
          phase: 'thinking',
          requestId: 'req-test-1',
        });
      });

      expect(root.getAttribute('data-aurora-phase')).toBe('thinking');
    });

    it('supports controlled phase prop directly for thinking state', () => {
      const { container, rerender } = render(<AuroraBackground variant="kerja" phase="idle" />);
      const root = container.firstChild as HTMLElement;
      expect(root.getAttribute('data-aurora-phase')).toBe('idle');

      rerender(<AuroraBackground variant="kerja" phase="thinking" />);
      expect(root.getAttribute('data-aurora-phase')).toBe('thinking');
    });
  });

  // C. Streaming State
  describe('C. Streaming State', () => {
    it('activates streaming phase smoothly via activity event', () => {
      const { container } = render(<AuroraBackground variant="kerja" />);
      const root = container.firstChild as HTMLElement;

      act(() => {
        dispatchAuroraActivity({
          mode: 'RUANG_KERJA',
          phase: 'streaming',
          requestId: 'req-test-2',
        });
      });

      expect(root.getAttribute('data-aurora-phase')).toBe('streaming');
    });
  });

  // D. Finishing State & Deceleration
  describe('D. Finishing State', () => {
    it('transitions through finishing exhale and decays smoothly back to idle', () => {
      vi.useFakeTimers();
      const { container } = render(<AuroraBackground variant="tenang" />);
      const root = container.firstChild as HTMLElement;

      act(() => {
        dispatchAuroraActivity({
          mode: 'RUANG_TENANG',
          phase: 'streaming',
        });
      });
      expect(root.getAttribute('data-aurora-phase')).toBe('streaming');

      act(() => {
        dispatchAuroraActivity({
          mode: 'RUANG_TENANG',
          phase: 'finishing',
        });
      });
      expect(root.getAttribute('data-aurora-phase')).toBe('finishing');

      // Before deceleration completes: still finishing
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(root.getAttribute('data-aurora-phase')).toBe('finishing');

      // After 1800ms smooth deceleration: returns to calm idle
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(root.getAttribute('data-aurora-phase')).toBe('idle');
    });
  });

  // E. Cancellation
  describe('E. Cancellation', () => {
    it('immediately resets to idle when request is cancelled', () => {
      const { container } = render(<AuroraBackground variant="kerja" />);
      const root = container.firstChild as HTMLElement;

      act(() => {
        dispatchAuroraActivity({
          mode: 'RUANG_KERJA',
          phase: 'streaming',
        });
      });
      expect(root.getAttribute('data-aurora-phase')).toBe('streaming');

      act(() => {
        dispatchAuroraActivity({
          mode: 'RUANG_KERJA',
          phase: 'idle',
        });
      });
      expect(root.getAttribute('data-aurora-phase')).toBe('idle');
    });
  });

  // F. Error Handling
  describe('F. Error Handling', () => {
    it('enters error state and calmly returns to idle without remaining stuck', () => {
      vi.useFakeTimers();
      const { container } = render(<AuroraBackground variant="tenang" />);
      const root = container.firstChild as HTMLElement;

      act(() => {
        dispatchAuroraActivity({
          mode: 'RUANG_TENANG',
          phase: 'error',
        });
      });
      expect(root.getAttribute('data-aurora-phase')).toBe('error');

      // After 1200ms error duration: returns calmly to idle
      act(() => {
        vi.advanceTimersByTime(1300);
      });
      expect(root.getAttribute('data-aurora-phase')).toBe('idle');
    });
  });

  // G. Mode Switching & Scoping
  describe('G. Mode Switching & Scoping', () => {
    it('ignores events from RUANG_KERJA when active mode is RUANG_TENANG', () => {
      const { container } = render(<AuroraBackground variant="tenang" />);
      const root = container.firstChild as HTMLElement;

      act(() => {
        dispatchAuroraActivity({
          mode: 'RUANG_KERJA',
          phase: 'streaming',
        });
      });

      // Must remain idle because event was for Ruang Kerja
      expect(root.getAttribute('data-aurora-phase')).toBe('idle');
    });

    it('ignores events from RUANG_TENANG when active mode is RUANG_KERJA', () => {
      const { container } = render(<AuroraBackground variant="kerja" />);
      const root = container.firstChild as HTMLElement;

      act(() => {
        dispatchAuroraActivity({
          mode: 'RUANG_TENANG',
          phase: 'thinking',
        });
      });

      // Must remain idle because event was for Ruang Tenang
      expect(root.getAttribute('data-aurora-phase')).toBe('idle');
    });

    it('switches visual variant dynamically when props change without flashing or error', () => {
      const { container, rerender } = render(<AuroraBackground variant="tenang" />);
      const root = container.firstChild as HTMLElement;
      expect(root.getAttribute('data-aurora-variant')).toBe('tenang');

      rerender(<AuroraBackground variant="kerja" />);
      expect(root.getAttribute('data-aurora-variant')).toBe('kerja');
    });
  });

  // H. Stale Request Rejection
  describe('H. Stale Request Rejection', () => {
    it('ignores activity events from superseded requests', () => {
      const { container } = render(<AuroraBackground variant="kerja" />);
      const root = container.firstChild as HTMLElement;

      // Request 1 starts
      act(() => {
        dispatchAuroraActivity({
          mode: 'RUANG_KERJA',
          phase: 'preparing',
          requestId: 'req-alpha',
        });
      });
      expect(root.getAttribute('data-aurora-phase')).toBe('preparing');

      // Request 2 supersedes
      act(() => {
        dispatchAuroraActivity({
          mode: 'RUANG_KERJA',
          phase: 'preparing',
          requestId: 'req-beta',
        });
      });
      expect(root.getAttribute('data-aurora-phase')).toBe('preparing');

      // Delayed late packet from Request 1 arrives
      act(() => {
        dispatchAuroraActivity({
          mode: 'RUANG_KERJA',
          phase: 'streaming',
          requestId: 'req-alpha',
        });
      });

      // Should still be in beta request's state, ignoring alpha
      expect(root.getAttribute('data-aurora-phase')).toBe('preparing');
    });
  });

  // I. Non-Blocking Layering
  describe('I. Non-Blocking Layering', () => {
    it('renders with pointer-events-none and fixed positioning so it never intercepts clicks', () => {
      const { container } = render(
        <AuroraBackground>
          <div data-testid="interactive-child">Interactive Content</div>
        </AuroraBackground>
      );
      const root = container.firstChild as HTMLElement;

      expect(root.className).toContain('pointer-events-none');
      expect(root.className).toContain('fixed inset-0');
      expect(root.className).toContain('z-0');
      expect(root.getAttribute('aria-hidden')).toBe('true');
    });
  });

  // J. Unmount Cleanup
  describe('J. Unmount Cleanup', () => {
    it('cleans up both rt-aurora-activity and rt-aurora-streaming listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(<AuroraBackground />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        AURORA_ACTIVITY_EVENT,
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        AURORA_STREAMING_EVENT,
        expect.any(Function)
      );
    });
  });

  // K. Backward Compatibility
  describe('K. Backward Compatibility', () => {
    it('supports legacy isStreaming boolean prop and legacy rt-aurora-streaming custom events', () => {
      vi.useFakeTimers();
      const { container, rerender } = render(<AuroraBackground isStreaming={false} />);
      const root = container.firstChild as HTMLElement;
      expect(root.getAttribute('data-aurora-phase')).toBe('idle');

      rerender(<AuroraBackground isStreaming={true} />);
      expect(root.getAttribute('data-aurora-phase')).toBe('streaming');

      rerender(<AuroraBackground isStreaming={false} />);
      expect(root.getAttribute('data-aurora-phase')).toBe('finishing');

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(root.getAttribute('data-aurora-phase')).toBe('idle');

      // Legacy event
      act(() => {
        dispatchAuroraStreaming(true);
      });
      expect(root.getAttribute('data-aurora-phase')).toBe('streaming');

      act(() => {
        dispatchAuroraStreaming(false);
      });
      expect(root.getAttribute('data-aurora-phase')).toBe('finishing');
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
});
