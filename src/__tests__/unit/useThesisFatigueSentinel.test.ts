import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThesisFatigueSentinel } from '../../features/workspace/hooks/useThesisFatigueSentinel';
import { safeLocalStorage } from '../../lib/storage';

describe('useThesisFatigueSentinel Hook', () => {
  beforeEach(() => {
    safeLocalStorage.clear();
    vi.useRealTimers();
  });

  it('initializes with default sentinel state', () => {
    const { result } = renderHook(() => useThesisFatigueSentinel(true));
    expect(result.current.continuousMinutes).toBe(0);
    expect(result.current.shouldPrompt).toBe(false);
    expect(typeof result.current.snooze).toBe('function');
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('allows user to snooze and dismiss fatigue prompts', () => {
    const { result } = renderHook(() => useThesisFatigueSentinel(true));

    act(() => {
      result.current.snooze(15);
    });

    expect(result.current.shouldPrompt).toBe(false);
    const stored = safeLocalStorage.getItem('ruangkerja_fatigue_snooze_until');
    expect(stored).toBeTruthy();
    expect(Number(stored)).toBeGreaterThan(Date.now());
  });

  it('dismiss calls snooze with 45 minutes by default', () => {
    const { result } = renderHook(() => useThesisFatigueSentinel(true));

    act(() => {
      result.current.dismiss();
    });

    const stored = safeLocalStorage.getItem('ruangkerja_fatigue_snooze_until');
    expect(stored).toBeTruthy();
    expect(Number(stored)).toBeGreaterThan(Date.now() + 40 * 60 * 1000);
  });
});
