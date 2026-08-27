/**
 * Centralized API Client with Timeout, Retry, and Standardized Error Handling
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  status?: number;
  message?: string;
}

export async function fetchWithTimeoutAndRetry<T = any>(
  url: string,
  options: RequestInit = {},
  retries = 2,
  timeoutMs = 15000,
  attempt = 1
): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const isGetOrHead = method === 'GET' || method === 'HEAD';

  // Extract and normalize existing headers to check for an existing idempotency key
  const normalizedHeaders: Record<string, string> = {};
  let finalHeaders = { ...(options.headers as any) };

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((v, k) => {
        normalizedHeaders[k.toLowerCase()] = v;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([k, v]) => {
        normalizedHeaders[k.toLowerCase()] = v;
      });
    } else {
      Object.keys(options.headers).forEach(k => {
        normalizedHeaders[k.toLowerCase()] = (options.headers as any)[k];
      });
    }
  }

  const hasIdempotencyKey = !!(
    normalizedHeaders['idempotency-key'] ||
    normalizedHeaders['x-idempotency-key']
  );

  // Endpoint explicitly safe for mutations retry (SOS, appointment, mood, privacy deletion with server idempotency)
  // NOTE: Auth mutations are strictly non-retryable automatically to prevent duplicate credential submissions / lockouts.
  const isSafeEndpoint =
    url.includes('/api/emergency/sos') ||
    url.includes('/api/v1/emergency/sos') ||
    url.includes('/api/v1/appointments') ||
    url.includes('/api/v1/moods') ||
    url.includes('/api/v1/privacy/delete') ||
    (options as any).allowRetry === true;

  const isIdempotentMutation = !isGetOrHead && (hasIdempotencyKey || isSafeEndpoint);
  const canRetry = isGetOrHead || isIdempotentMutation;

  // Generate and attach a single idempotency key for retry resilience if not already provided
  if (isIdempotentMutation && !hasIdempotencyKey) {
    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'idemp-' + Math.random().toString(36).substring(2) + '-' + Date.now();
    
    if (options.headers instanceof Headers) {
      finalHeaders = new Headers(options.headers);
      finalHeaders.set('Idempotency-Key', idempotencyKey);
    } else if (Array.isArray(options.headers)) {
      finalHeaders = [...options.headers, ['Idempotency-Key', idempotencyKey]];
    } else {
      finalHeaders = {
        ...finalHeaders,
        'Idempotency-Key': idempotencyKey
      };
    }
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const mergedOptions: RequestInit = {
    ...options,
    credentials: 'include',
    signal: controller.signal,
    headers: finalHeaders instanceof Headers ? finalHeaders : {
      'Content-Type': 'application/json',
      ...finalHeaders
    }
  };

  try {
    const res = await fetch(url, mergedOptions);
    clearTimeout(id);

    if (!res.ok) {
      let errorMsg = `Server error (${res.status})`;
      let code = 'HTTP_ERROR';
      let errorDetails = undefined;
      try {
        const body = await res.json();
        errorMsg = body.error || body.message || errorMsg;
        code = body.code || code;
        errorDetails = body.details;
      } catch (e) {
        // ignore json parse error on non-ok
      }
      return { success: false, error: errorMsg, message: errorMsg, code, status: res.status, data: errorDetails as any };
    }

    const data = await res.json();
    return { success: true, data, status: res.status };
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      return { success: false, error: 'Waktu koneksi habis. Silakan coba lagi.', message: 'Waktu koneksi habis. Silakan coba lagi.', code: 'TIMEOUT' };
    }

    if (canRetry && retries > 0) {
      // Exponential backoff + jitter
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      await new Promise(r => setTimeout(r, delay));
      return fetchWithTimeoutAndRetry<T>(url, { ...options, headers: finalHeaders }, retries - 1, timeoutMs, attempt + 1);
    }

    return {
      success: false,
      error: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
      message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
      code: 'NETWORK_ERROR'
    };
  }
}

export const apiClient = {
  get: <T = any>(url: string, options: RequestInit = {}) =>
    fetchWithTimeoutAndRetry<T>(url, { ...options, method: 'GET' }),

  post: <T = any>(url: string, body?: any, options: RequestInit = {}) =>
    fetchWithTimeoutAndRetry<T>(url, {
      ...options,
      method: 'POST',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    }),

  put: <T = any>(url: string, body?: any, options: RequestInit = {}) =>
    fetchWithTimeoutAndRetry<T>(url, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    }),

  delete: <T = any>(url: string, options: RequestInit = {}) =>
    fetchWithTimeoutAndRetry<T>(url, { ...options, method: 'DELETE' }),

  request: fetchWithTimeoutAndRetry
};

