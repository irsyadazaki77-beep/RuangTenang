import type { ProviderId } from './aiModelRegistry.js';

export type AiErrorCategory =
  | 'TIMEOUT' | 'NETWORK_ERROR' | 'RATE_LIMIT' | 'PROVIDER_UNAVAILABLE' | 'AUTH_ERROR'
  | 'INVALID_REQUEST' | 'MODEL_NOT_FOUND' | 'UNSUPPORTED_CAPABILITY' | 'SAFETY_BLOCK'
  | 'CONTENT_ERROR' | 'ABORTED' | 'QUOTA_EXCEEDED' | 'INTERNAL_ERROR';

export interface AiProviderError extends Error {
  provider?: ProviderId;
  category: AiErrorCategory;
  retryable: boolean;
  statusCode?: number;
  retryAfterMs?: number;
}

const envMs = (key: string, fallback: number, max: number) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 && value <= max ? value : fallback;
};
const envInt = (key: string, fallback: number, max: number) => {
  const value = Number(process.env[key]);
  return Number.isInteger(value) && value >= 0 && value <= max ? value : fallback;
};

export const AI_RELIABILITY_POLICY = Object.freeze({
  connectTimeoutMs: envMs('AI_CONNECT_TIMEOUT_MS', 20_000, 120_000),
  firstTokenTimeoutMs: envMs('AI_FIRST_TOKEN_TIMEOUT_MS', 45_000, 180_000),
  streamIdleTimeoutMs: envMs('AI_STREAM_IDLE_TIMEOUT_MS', 30_000, 120_000),
  totalRequestTimeoutMs: envMs('AI_TOTAL_REQUEST_TIMEOUT_MS', 120_000, 600_000),
  maxRetries: envInt('AI_MAX_RETRIES', 1, 2),
  retryBaseDelayMs: envMs('AI_RETRY_BASE_DELAY_MS', 500, 10_000),
  retryMaxDelayMs: envMs('AI_RETRY_MAX_DELAY_MS', 4_000, 30_000),
  fallbackEnabled: process.env.AI_FALLBACK_ENABLED !== 'false',
  quotaCooldownMs: 300_000,
  circuit: Object.freeze({ failureThreshold: 4, rollingWindowMs: 60_000, cooldownMs: 30_000 })
});

export function classifyAiError(error: unknown): AiProviderError {
  const err = error instanceof Error ? error as AiProviderError : Object.assign(new Error(String(error)), {} as AiProviderError);
  const raw = `${err.message || ''} ${(err as any).code || ''}`.toLowerCase();
  const status = Number((err as any).statusCode ?? (err as any).status ?? raw.match(/(?:error|stream_error)_(\d{3})/)?.[1]);
  let category: AiErrorCategory = 'INTERNAL_ERROR';
  if ((err as any).name === 'AbortError' || raw.includes('aborted') || raw.includes('aborterror')) category = 'ABORTED';
  else if (raw.includes('timeout') || raw.includes('timed out')) category = 'TIMEOUT';
  else if (status === 401 || status === 403 || /api.?key|unauthorized|forbidden/.test(raw)) category = 'AUTH_ERROR';
  else if (status === 429 && /quota|billing|resource_exhausted/.test(raw)) category = 'QUOTA_EXCEEDED';
  else if (status === 429 || /rate.?limit|too many requests/.test(raw)) category = 'RATE_LIMIT';
  else if (status === 404 || /model_not_found|model not found/.test(raw)) category = 'MODEL_NOT_FOUND';
  else if (status === 400 || status === 422 || /invalid request|validation/.test(raw)) category = 'INVALID_REQUEST';
  else if (/safety|policy|prompt_injection/.test(raw)) category = 'SAFETY_BLOCK';
  else if (/content/.test(raw)) category = 'CONTENT_ERROR';
  else if ([500, 502, 503, 504].includes(status) || /unavailable|overloaded/.test(raw)) category = 'PROVIDER_UNAVAILABLE';
  else if (/fetch failed|network|econn|socket|connection/.test(raw)) category = 'NETWORK_ERROR';
  const retryable = ['TIMEOUT', 'NETWORK_ERROR', 'PROVIDER_UNAVAILABLE', 'RATE_LIMIT'].includes(category);
  return Object.assign(err, { category, retryable, statusCode: Number.isFinite(status) ? status : undefined });
}

type Circuit = { failures: number[]; openUntil: number; probe: boolean };
const circuits = new Map<ProviderId, Circuit>();
function circuit(provider: ProviderId): Circuit {
  let item = circuits.get(provider);
  if (!item) { item = { failures: [], openUntil: 0, probe: false }; circuits.set(provider, item); }
  return item;
}
export function getProviderHealth(provider: ProviderId): 'healthy' | 'degraded' | 'unavailable' | 'unknown' {
  const state = circuit(provider);
  if (state.openUntil > Date.now()) return 'unavailable';
  return state.failures.length ? 'degraded' : 'unknown';
}
export function getProviderCircuitState(provider: ProviderId): 'OPEN' | 'HALF-OPEN' | 'CLOSED' {
  const state = circuit(provider);
  if (!state.openUntil) return 'CLOSED';
  if (state.openUntil > Date.now()) return 'OPEN';
  return state.probe ? 'OPEN' : 'HALF-OPEN';
}
export function resetAiReliabilityStateForTests(): void { circuits.clear(); }
export function assertProviderAvailable(provider: ProviderId): void {
  const state = circuit(provider);
  if (!state.openUntil) return;
  if (state.openUntil > Date.now() || state.probe) throw Object.assign(new Error('AI_CIRCUIT_OPEN'), { category: 'PROVIDER_UNAVAILABLE', retryable: true });
  state.probe = true;
}
function record(provider: ProviderId, error?: unknown) {
  const state = circuit(provider);
  if (!error) {
    if (state.openUntil > 0 || state.probe) state.failures = [];
    else state.failures = state.failures.filter(time => Date.now() - time < AI_RELIABILITY_POLICY.circuit.rollingWindowMs);
    state.openUntil = 0;
    state.probe = false;
    return;
  }
  state.probe = false;
  const classified = classifyAiError(error);
  if (classified.category === 'QUOTA_EXCEEDED') {
    state.openUntil = Date.now() + AI_RELIABILITY_POLICY.quotaCooldownMs;
    return;
  }
  if (!['TIMEOUT', 'NETWORK_ERROR', 'PROVIDER_UNAVAILABLE', 'RATE_LIMIT'].includes(classified.category)) return;
  const now = Date.now();
  state.failures = state.failures.filter(time => now - time < AI_RELIABILITY_POLICY.circuit.rollingWindowMs);
  state.failures.push(now);
  if (state.failures.length >= AI_RELIABILITY_POLICY.circuit.failureThreshold || state.openUntil > 0) {
    state.openUntil = now + AI_RELIABILITY_POLICY.circuit.cooldownMs;
  }
}
export function recordProviderStreamFailure(provider: ProviderId, error: unknown): void { record(provider, error); }

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(Object.assign(new Error('Request aborted'), { name: 'AbortError' }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, ms);
    const onAbort = () => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); reject(Object.assign(new Error('Request aborted'), { name: 'AbortError' })); };
    function done() { signal?.removeEventListener('abort', onAbort); resolve(); }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function executeWithReliability<T>(provider: ProviderId, operation: (signal: AbortSignal) => Promise<T>, parentSignal?: AbortSignal, requestId = globalThis.crypto?.randomUUID?.() || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`): Promise<T> {
  assertProviderAvailable(provider);
  const maxAttempts = AI_RELIABILITY_POLICY.maxRetries + 1;
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptId = globalThis.crypto?.randomUUID?.() || `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (parentSignal?.aborted) throw classifyAiError(Object.assign(new Error('Request aborted'), { name: 'AbortError' }));
    const controller = new AbortController();
    const onParentAbort = () => controller.abort();
    parentSignal?.addEventListener('abort', onParentAbort, { once: true });
    let timedOut = false;
    let timeoutReject!: (error: Error) => void;
    const timeoutPromise = new Promise<never>((_, reject) => { timeoutReject = reject; });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      timeoutReject(new Error('AI_CONNECT_TIMEOUT'));
    }, AI_RELIABILITY_POLICY.connectTimeoutMs);
    try {
      const result = await Promise.race([operation(controller.signal), timeoutPromise]);
      record(provider);
      return result;
    } catch (error) {
      lastError = classifyAiError(timedOut ? new Error('AI_CONNECT_TIMEOUT') : error);
      console.warn(`[AI_RELIABILITY] requestId=${requestId} attemptId=${attemptId} provider=${provider} category=${(lastError as AiProviderError).category}`);
      if (parentSignal?.aborted) throw lastError;
      if (!(lastError as AiProviderError).retryable || attempt + 1 >= maxAttempts) { record(provider, lastError); throw lastError; }
      const retryAfter = (lastError as AiProviderError).retryAfterMs;
      const exponential = Math.min(AI_RELIABILITY_POLICY.retryBaseDelayMs * (2 ** attempt) + Math.random() * AI_RELIABILITY_POLICY.retryBaseDelayMs, AI_RELIABILITY_POLICY.retryMaxDelayMs);
      await wait(Math.min(retryAfter ?? exponential, AI_RELIABILITY_POLICY.retryMaxDelayMs), parentSignal);
    } finally {
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', onParentAbort);
    }
  }
  throw classifyAiError(lastError);
}

export async function* guardAiStream<T extends { text?: string }>(source: AsyncGenerator<T>, signal?: AbortSignal, abort?: () => void): AsyncGenerator<T> {
  const startedAt = Date.now();
  let first = true;
  try {
    while (true) {
      if (signal?.aborted) throw classifyAiError(Object.assign(new Error('Request aborted'), { name: 'AbortError' }));
      const remaining = AI_RELIABILITY_POLICY.totalRequestTimeoutMs - (Date.now() - startedAt);
      const phaseTimeout = first ? AI_RELIABILITY_POLICY.firstTokenTimeoutMs : AI_RELIABILITY_POLICY.streamIdleTimeoutMs;
      const isTotalTimeout = remaining <= phaseTimeout;
      const timeoutMs = Math.min(remaining, phaseTimeout);
      if (timeoutMs <= 0) { abort?.(); throw classifyAiError(new Error('AI_TOTAL_REQUEST_TIMEOUT')); }
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([source.next(), new Promise<never>((_, reject) => { timer = setTimeout(() => { abort?.(); reject(new Error(isTotalTimeout ? 'AI_TOTAL_REQUEST_TIMEOUT' : first ? 'AI_FIRST_TOKEN_TIMEOUT' : 'AI_STREAM_IDLE_TIMEOUT')); }, timeoutMs); })]);
        if (result.done) return;
        first = false;
        yield result.value;
      } finally { if (timer) clearTimeout(timer); }
    }
  } catch (error) {
    abort?.();
    throw classifyAiError(error);
  } finally {
    if (typeof source.return === 'function') void source.return(undefined as any).catch(() => undefined);
  }
}
