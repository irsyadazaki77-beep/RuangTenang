import { aiProviderConfig } from '../../config/aiProviderConfig.js';

type LocalModel = { name: string; size: number; capabilities: string[]; contextLength?: number };
let snapshot: { url: string; checkedAt: number; reachable: boolean; models: LocalModel[] } | undefined;
let pending: Promise<void> | undefined;

export function ollamaBaseUrl(): string {
  return aiProviderConfig.getApiKey('ollama').replace(/\/+$/, '');
}

/** One shared, short-lived inventory for catalog, routing and execution. No prompt data. */
export async function refreshOllamaInventory(force = false): Promise<void> {
  const url = ollamaBaseUrl();
  if (!url) return;
  if (pending) return pending;
  if (!force && snapshot?.url === url && Date.now() - snapshot.checkedAt < 30_000) return;
  pending = (async () => {
    try {
      const response = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) throw new Error('OLLAMA_INVENTORY_UNAVAILABLE');
      const data = await response.json();
      if (!Array.isArray(data.models)) throw new Error('OLLAMA_INVENTORY_INVALID');
      const models: LocalModel[] = [];
      // Metadata requests are sequential to avoid flooding a local daemon at startup.
      for (const item of data.models) {
        if (typeof item.name !== 'string') continue;
        let capabilities: string[] = [];
        let contextLength: number | undefined;
        try {
          const detailResponse = await fetch(`${url}/api/show`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: item.name }), signal: AbortSignal.timeout(2000)
          });
          if (detailResponse.ok) {
            const detail = await detailResponse.json();
            capabilities = Array.isArray(detail.capabilities) ? detail.capabilities : [];
            contextLength = Object.entries(detail.model_info || {}).find(([key]) => key.endsWith('.context_length'))?.[1] as number | undefined;
          }
        } catch { /* tags still confirms installation if optional metadata is unavailable */ }
        models.push({ name: item.name, size: Number(item.size) || 0, capabilities, contextLength });
      }
      snapshot = { url, checkedAt: Date.now(), reachable: true, models };
    } catch {
      snapshot = { url, checkedAt: Date.now(), reachable: false, models: [] };
    }
  })().finally(() => { pending = undefined; });
  return pending;
}

export function getLocalModel(name: string): LocalModel | undefined {
  return snapshot?.url === ollamaBaseUrl() ? snapshot.models.find(model => model.name === name) : undefined;
}

export function isLocalModelAvailable(name: string): boolean {
  if (!ollamaBaseUrl()) return false;
  // Pure routing callers can operate before initialization; execution always refreshes first.
  if (!snapshot || snapshot.url !== ollamaBaseUrl()) return true;
  return snapshot.reachable && snapshot.models.some(model => model.name === name);
}

function aborted(): Error { return Object.assign(new Error('Request aborted'), { name: 'AbortError' }); }

/** FIFO semaphore: the app runs ONE local inference, including its entire stream. */
export class LocalInferenceQueue {
  private active = false;
  private waiters: Array<() => void> = [];

  acquire(signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) return Promise.reject(aborted());
    if (this.waiters.length >= 32) return Promise.reject(Object.assign(new Error('OLLAMA_QUEUE_FULL'), { statusCode: 429 }));
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const remove = () => {
        if (timer) clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        this.waiters = this.waiters.filter(entry => entry !== grant);
      };
      const onAbort = () => { remove(); reject(aborted()); };
      const grant = () => {
        remove();
        this.active = true;
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          this.active = false;
          this.waiters.shift()?.();
        });
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      if (!this.active) grant();
      else {
        this.waiters.push(grant);
        timer = setTimeout(() => { remove(); reject(new Error('OLLAMA_QUEUE_TIMEOUT')); }, 120_000);
      }
    });
  }
}

export const localInferenceQueue = new LocalInferenceQueue();
