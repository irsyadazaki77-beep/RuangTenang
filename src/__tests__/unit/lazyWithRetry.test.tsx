import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import * as React from 'react';

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    lazy: (fn: any) => fn, // return the wrapped function directly so we can call it
  };
});

describe('lazyWithRetry Recovery Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    let store: Record<string, string> = {};
    const mockStorage = {
      getItem: vi.fn((k: string) => store[k] || null),
      setItem: vi.fn((k: string, v: string) => { store[k] = v.toString(); }),
      clear: vi.fn(() => { store = {}; })
    };
    Object.defineProperty(window, 'sessionStorage', { value: mockStorage, writable: true });
    
    Object.defineProperty(window, 'location', {
      value: { reload: vi.fn() },
      writable: true
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('retries once on first failure and succeeds', async () => {
    let attempts = 0;
    const factory = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts === 1) return Promise.reject(new Error('Failed to fetch dynamically imported module'));
      return Promise.resolve({ default: 'success' });
    });

    const wrappedFactory = lazyWithRetry(factory) as unknown as () => Promise<any>;
    
    const promise = wrappedFactory(); promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(350);
    const result = await promise;
    
    expect(attempts).toBe(2);
    expect(result.default).toBe('success');
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('reloads page on second chunk failure if guard is clear', async () => {
    const error = new Error('ChunkLoadError');
    error.name = 'ChunkLoadError';
    
    const factory = vi.fn().mockRejectedValue(error);
    const wrappedFactory = lazyWithRetry(factory) as unknown as () => Promise<any>;
    
    const promise = wrappedFactory(); promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(350);
    
    let caught;
    try { await promise; } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    expect(caught.name).toBe('ChunkLoadError');
    
    expect(window.location.reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.setItem).toHaveBeenCalledWith('ruangtenang_chunk_reload_guard', expect.any(String));
  });

  it('does NOT reload if sessionStorage guard is fresh (prevent reload loop)', async () => {
    const error = new Error('ChunkLoadError');
    error.name = 'ChunkLoadError';
    
    window.sessionStorage.setItem('ruangtenang_chunk_reload_guard', Date.now().toString());
    
    const factory = vi.fn().mockRejectedValue(error);
    const wrappedFactory = lazyWithRetry(factory) as unknown as () => Promise<any>;
    
    const promise = wrappedFactory(); promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(350);
    
    let caught;
    try { await promise; } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    expect(caught.name).toBe('ChunkLoadError');
    
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('does NOT reload on generic runtime errors', async () => {
    const error = new Error('ReferenceError: window is not defined');
    
    const factory = vi.fn().mockRejectedValue(error);
    const wrappedFactory = lazyWithRetry(factory) as unknown as () => Promise<any>;
    
    const promise = wrappedFactory(); promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(350);
    
    let caught;
    try { await promise; } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    expect(caught.message).toContain('ReferenceError');
    
    expect(window.location.reload).not.toHaveBeenCalled();
  });
});

