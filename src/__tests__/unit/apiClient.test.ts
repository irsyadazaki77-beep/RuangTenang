import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AUTH_SESSION_INVALIDATED_EVENT, fetchWithTimeoutAndRetry, apiClient } from '../../lib/apiClient';

describe('API Client Contract', () => {
  let originalFetch: typeof global.fetch;
  
  beforeEach(() => {
    originalFetch = global.fetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('signals AuthContext when a protected request reports an expired session', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => null },
      json: async () => ({ error: 'Unauthorized' })
    });
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    await apiClient.get('/api/v1/chat/history');

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: AUTH_SESSION_INVALIDATED_EVENT }));
    dispatchSpy.mockRestore();
  });

  it('preserves domain error payload for HTTP 200 + success:false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: false,
        status: 'CONSENT_REQUIRED',
        dispatchId: 'disp-123',
        message: 'Consent is required',
        hotlines: ['119']
      })
    });

    const res = await apiClient.post('/api/test');
    expect(res.success).toBe(false);
    expect(res.message).toBe('Consent is required');
    expect(res.data).toEqual({
      success: false,
      status: 'CONSENT_REQUIRED',
      dispatchId: 'disp-123',
      message: 'Consent is required',
      hotlines: ['119']
    });
  });

  it('extracts error from string body.error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'Bad request string'
      })
    });

    const res = await apiClient.get('/api/test');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Bad request string');
  });

  it('extracts error from object body.error.message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: { message: 'Nested error message', code: 'NESTED_ERR' }
      })
    });

    const res = await apiClient.get('/api/test');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Nested error message');
    expect(res.code).toBe('NESTED_ERR');
  });

  it('extracts error from body.message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        message: 'Message field error'
      })
    });

    const res = await apiClient.get('/api/test');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Message field error');
  });
});
