/**
 * Centralized API Client with Timeout, Retry, and Standardized Error Handling
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  status?: number;
  message?: string;
}

function extractErrorMessage(body: unknown, fallbackMessage: string): string {
  if (!body) return fallbackMessage;
  if (typeof body === 'object' && body !== null) {
    const b = body as Record<string, unknown>;
    if (typeof b.error === 'string' && b.error.trim().length > 0) {
      return b.error;
    }
    if (typeof b.error === 'object' && b.error !== null) {
      const bError = b.error as Record<string, unknown>;
      if (typeof bError.message === 'string' && bError.message.trim().length > 0) {
        return bError.message;
      }
    }
    if (typeof b.message === 'string' && b.message.trim().length > 0) {
      return b.message;
    }
  }
  return fallbackMessage;
}

function extractErrorCode(body: unknown, fallbackCode: string): string {
  if (!body) return fallbackCode;
  if (typeof body === 'object' && body !== null) {
    const b = body as Record<string, unknown>;
    if (typeof b.code === 'string' && b.code.trim().length > 0) {
      return b.code;
    }
    if (typeof b.error === 'object' && b.error !== null) {
      const bError = b.error as Record<string, unknown>;
      if (typeof bError.code === 'string' && bError.code.trim().length > 0) {
        return bError.code;
      }
    }
  }
  return fallbackCode;
}

export async function fetchWithTimeoutAndRetry<T = unknown>(
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
  let finalHeaders = options.headers ? { ...(options.headers as Record<string, string>) } : {};
  
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
        normalizedHeaders[k.toLowerCase()] = (options.headers as Record<string, string>)[k];
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
    (options as Record<string, unknown>).allowRetry === true;

  const isIdempotentMutation = !isGetOrHead && (hasIdempotencyKey || isSafeEndpoint);
  const canRetry = isGetOrHead || isIdempotentMutation;

  // Generate and attach a single idempotency key for retry resilience if not already provided
  if (isIdempotentMutation && !hasIdempotencyKey) {
    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'idemp-' + Math.random().toString(36).substring(2) + '-' + Date.now();
      
    if (options.headers instanceof Headers) {
      finalHeaders = new Headers(options.headers) as unknown as Record<string, string>;
      (finalHeaders as unknown as Headers).set('Idempotency-Key', idempotencyKey);
    } else if (Array.isArray(options.headers)) {
      finalHeaders = [...options.headers, ['Idempotency-Key', idempotencyKey]] as unknown as Record<string, string>;
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
      const fallbackMsg = `Server error (${res.status})`;
      let errorMsg = fallbackMsg;
      let code = 'HTTP_ERROR';
      let errorDetails: unknown = undefined;

      try {
        const body = await res.json();
        errorMsg = extractErrorMessage(body, fallbackMsg);
        code = extractErrorCode(body, code);
        errorDetails = body.details;
      } catch (e) {
        // ignore json parse error on non-ok
      }

      return { success: false, error: errorMsg, message: errorMsg, code, status: res.status, data: errorDetails as Extract<T, unknown> };
    }

    const data = await res.json();
    if (data && typeof data === 'object' && (data as Record<string, unknown>).success === false) {
      const fallbackMsg = `Server error (${res.status})`;
      const errorMsg = extractErrorMessage(data, fallbackMsg);
      const code = extractErrorCode(data, 'ERROR');

      return {
        success: false,
        error: errorMsg,
        message: errorMsg,
        code,
        status: res.status,
        data: data as Extract<T, unknown>
      };
    }

    return { success: true, data: data as T, status: res.status };
  } catch (err: any) {
    clearTimeout(id);
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: 'Waktu koneksi habis. Silakan coba lagi.', message: 'Waktu koneksi habis. Silakan coba lagi.', code: 'TIMEOUT' };
    }
    if (canRetry && retries > 0) {
      // Exponential backoff + jitter
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      await new Promise(r => setTimeout(r, delay));
      return fetchWithTimeoutAndRetry<T>(url, { ...options, headers: finalHeaders as HeadersInit }, retries - 1, timeoutMs, attempt + 1);
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
  get: <T = unknown>(url: string, options: RequestInit = {}) =>
    fetchWithTimeoutAndRetry<T>(url, { ...options, method: 'GET' }),
  post: <T = unknown>(url: string, body?: unknown, options: RequestInit = {}) =>
    fetchWithTimeoutAndRetry<T>(url, {
      ...options,
      method: 'POST',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    }),
  put: <T = unknown>(url: string, body?: unknown, options: RequestInit = {}) =>
    fetchWithTimeoutAndRetry<T>(url, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    }),
  delete: <T = unknown>(url: string, options: RequestInit = {}) =>
    fetchWithTimeoutAndRetry<T>(url, { ...options, method: 'DELETE' }),
  request: fetchWithTimeoutAndRetry
};
