/**
 * Centralized API Client with Timeout, Retry, and Standardized Error Handling
 */
import { safeSessionStorage } from './storage';
import { readGuestAiConsent } from './guestAiConsent';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  status?: number;
  retryAfterMs?: number;
  message?: string;
}

export const AUTH_SESSION_INVALIDATED_EVENT = 'rt-auth-session-invalidated';
let lastAuthInvalidatedEventAt = 0;

const AUTH_TOKEN_STORAGE_KEY = 'rt_session_token';
const GUEST_ATTACHMENT_TOKEN_STORAGE_KEY = 'rt_guest_attachment_token';
let inMemoryGuestAttachmentToken: string | null = null;

function generateHexToken(bytes = 32): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  }
  let out = '';
  for (let i = 0; i < bytes * 2; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}

export function getOrCreateGuestAttachmentToken(): string {
  const stored = safeSessionStorage.getItem(GUEST_ATTACHMENT_TOKEN_STORAGE_KEY);
  if (stored && /^[a-f0-9]{64}$/i.test(stored.trim())) {
    const normalized = stored.trim().toLowerCase();
    inMemoryGuestAttachmentToken = normalized;
    return normalized;
  }
  if (inMemoryGuestAttachmentToken && /^[a-f0-9]{64}$/.test(inMemoryGuestAttachmentToken)) {
    return inMemoryGuestAttachmentToken;
  }
  const created = generateHexToken(32);
  inMemoryGuestAttachmentToken = created;
  safeSessionStorage.setItem(GUEST_ATTACHMENT_TOKEN_STORAGE_KEY, created);
  return created;
}

export function setStoredGuestAttachmentToken(token: string | null | undefined): void {
  if (typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token.trim())) {
    const normalized = token.trim().toLowerCase();
    inMemoryGuestAttachmentToken = normalized;
    safeSessionStorage.setItem(GUEST_ATTACHMENT_TOKEN_STORAGE_KEY, normalized);
  }
}

export function getStoredAuthToken(): string | null {
  return safeSessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setStoredAuthToken(token: string | null | undefined): void {
  if (typeof token === 'string' && token.trim().length > 0) {
    safeSessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token.trim());
  }
}

export function clearStoredAuthToken(): void {
  safeSessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
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

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
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
    url.includes('/api/v1/mood') ||
    url.includes('/api/v1/privacy/delete') ||
    (options as Record<string, unknown>).allowRetry === true;

  const isIdempotentMutation = !isGetOrHead && (hasIdempotencyKey || isSafeEndpoint);
  const canRetry = isGetOrHead || isIdempotentMutation;

  const setHeader = (key: string, value: string) => {
    if (finalHeaders instanceof Headers) {
      finalHeaders.set(key, value);
    } else if (Array.isArray(finalHeaders)) {
      finalHeaders = [...finalHeaders, [key, value]] as unknown as Record<string, string>;
    } else {
      finalHeaders = { ...finalHeaders, [key]: value };
    }
  };

  if (options.headers instanceof Headers) {
    finalHeaders = new Headers(options.headers) as unknown as Record<string, string>;
  }

  // Generate and attach a single idempotency key for retry resilience if not already provided
  if (isIdempotentMutation && !hasIdempotencyKey) {
    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'idemp-' + Math.random().toString(36).substring(2) + '-' + Date.now();
    setHeader('Idempotency-Key', idempotencyKey);
  }

  // Attach X-Requested-With, X-Guest-AI-Consent, X-Guest-Attachment-Token, and Bearer token fallback
  if (!normalizedHeaders['x-requested-with']) {
    setHeader('X-Requested-With', 'XMLHttpRequest');
  }
  if (!normalizedHeaders['x-guest-ai-consent']) {
    setHeader('X-Guest-AI-Consent', String(readGuestAiConsent()));
  }
  if (!normalizedHeaders['x-guest-attachment-token']) {
    setHeader('X-Guest-Attachment-Token', getOrCreateGuestAttachmentToken());
  }
  const storedToken = getStoredAuthToken();
  if (storedToken && !normalizedHeaders['authorization']) {
    setHeader('Authorization', `Bearer ${storedToken}`);
  }

  // Also attach CSRF token for mutation requests if cookie is present
  if (!isGetOrHead) {
    const csrfToken = getCookie('XSRF-TOKEN');
    if (csrfToken && !normalizedHeaders['x-csrf-token']) {
      setHeader('X-CSRF-Token', csrfToken);
    }
  }

  if (url.includes('/api/v1/auth/logout') || url.includes('/api/auth/logout')) {
    clearStoredAuthToken();
  }

  const controller = new AbortController();
  const callerSignal = options.signal;
  if (callerSignal?.aborted) {
    return { success: false, error: 'Permintaan dibatalkan.', message: 'Permintaan dibatalkan.', code: 'ABORTED' };
  }
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  const id = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const mergedOptions: RequestInit = {
    ...options,
    credentials: 'include',
    signal: controller.signal,
    headers: finalHeaders instanceof Headers ? finalHeaders : {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...finalHeaders
    }
  };

  try {
    const res = await fetch(url, mergedOptions);
    clearTimeout(id);
    callerSignal?.removeEventListener('abort', abortFromCaller);
    const returnedGuestToken = typeof res.headers?.get === 'function' ? res.headers.get('x-guest-attachment-token') : null;
    if (returnedGuestToken) {
      setStoredGuestAttachmentToken(returnedGuestToken);
    }

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
      } catch {
        // ignore json parse error on non-ok
      }

      // Protected requests can be the first signal that a session expired. Notify
      // AuthContext so the UI stops rendering data for the stale account.
      if (res.status === 401 && !url.includes('/api/auth/') && !url.includes('/api/v1/auth/')) {
        const now = Date.now();
        if (now - lastAuthInvalidatedEventAt > 1000 && typeof window !== 'undefined') {
          lastAuthInvalidatedEventAt = now;
          window.dispatchEvent(new Event(AUTH_SESSION_INVALIDATED_EVENT));
        }
      }

      const retryAfter = typeof res.headers?.get === 'function' ? res.headers.get('retry-after') : null;
      let retryAfterMs: number | undefined;
      if (retryAfter) {
        const seconds = Number(retryAfter);
        const parsedDate = Date.parse(retryAfter);
        if (Number.isFinite(seconds) && seconds >= 0) retryAfterMs = seconds * 1000;
        else if (Number.isFinite(parsedDate)) retryAfterMs = Math.max(0, parsedDate - Date.now());
      }

      return { success: false, error: errorMsg, message: errorMsg, code, status: res.status, retryAfterMs, data: errorDetails as Extract<T, unknown> };
    }

    if (res.status === 204) {
      return { success: true, data: undefined as unknown as T, status: 204 };
    }

    let data: unknown;
    const contentType = (res.headers && typeof res.headers.get === 'function')
      ? (res.headers.get('content-type') || '')
      : 'application/json';

    if (!contentType || contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch {
        data = undefined;
      }
    } else {
      try {
        const text = await res.text();
        if (!text || text.trim().length === 0) {
          data = undefined;
        } else {
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
        }
      } catch {
        data = undefined;
      }
    }

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

    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      const nested = typeof record.data === 'object' && record.data !== null ? (record.data as Record<string, unknown>) : null;
      const returnedToken = typeof record.token === 'string'
        ? record.token
        : nested && typeof nested.token === 'string'
          ? nested.token
          : null;
      if (returnedToken && (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/mfa/verify'))) {
        setStoredAuthToken(returnedToken);
      }
    }

    return { success: true, data: data as T, status: res.status };
  } catch (err: any) {
    clearTimeout(id);
    if (err instanceof Error && err.name === 'AbortError') {
      callerSignal?.removeEventListener('abort', abortFromCaller);
      if (callerSignal?.aborted) return { success: false, error: 'Permintaan dibatalkan.', message: 'Permintaan dibatalkan.', code: 'ABORTED' };
      if (timedOut) return { success: false, error: 'Waktu koneksi habis. Silakan coba lagi.', message: 'Waktu koneksi habis. Silakan coba lagi.', code: 'TIMEOUT' };
    }
    callerSignal?.removeEventListener('abort', abortFromCaller);
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
  patch: <T = unknown>(url: string, body?: unknown, options: RequestInit = {}) =>
    fetchWithTimeoutAndRetry<T>(url, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    }),
  delete: <T = unknown>(url: string, options: RequestInit = {}) =>
    fetchWithTimeoutAndRetry<T>(url, { ...options, method: 'DELETE' }),
  request: fetchWithTimeoutAndRetry,
  fetchJson: async <T = unknown>(url: string, options: RequestInit = {}): Promise<T> => {
    const method = (options.method || 'GET').toUpperCase();
    const retries = method === 'GET' || method === 'HEAD' ? 2 : 0;
    const res = await fetchWithTimeoutAndRetry<T>(url, options, retries, 30000);
    if (res.data !== undefined && res.data !== null) {
      return res.data;
    }
    return res as unknown as T;
  }
};

