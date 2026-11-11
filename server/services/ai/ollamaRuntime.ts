import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { aiProviderConfig } from '../../config/aiProviderConfig.js';

type LocalModel = { name: string; size: number; capabilities: string[]; contextLength?: number };
let snapshot: { url: string; checkedAt: number; reachable: boolean; models: LocalModel[] } | undefined;
let pending: Promise<void> | undefined;
let autoStartInFlight = false;

export function ollamaBaseUrl(): string {
  return aiProviderConfig.getApiKey('ollama').replace(/\/+$/, '');
}

export function findOllamaExecutable(): string | null {
  const localAppData = process.env.LOCALAPPDATA;
  const username = process.env.USERNAME;
  const programFiles = process.env.PROGRAMFILES;

  const candidates = [
    localAppData ? path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe') : null,
    username ? `C:\\Users\\${username}\\AppData\\Local\\Programs\\Ollama\\ollama.exe` : null,
    programFiles ? path.join(programFiles, 'Ollama', 'ollama.exe') : null,
    'C:\\Program Files\\Ollama\\ollama.exe'
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {}
  }
  return null;
}

export async function isOllamaReachable(targetUrl?: string): Promise<boolean> {
  const url = targetUrl || ollamaBaseUrl() || 'http://127.0.0.1:11434';
  try {
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Ensures the local Ollama daemon is running. If offline, automatically spawns `ollama serve`.
 */
export async function ensureOllamaRunning(targetUrl?: string): Promise<boolean> {
  const url = targetUrl || ollamaBaseUrl() || 'http://127.0.0.1:11434';
  if (await isOllamaReachable(url)) return true;

  if (autoStartInFlight) {
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (await isOllamaReachable(url)) return true;
    }
    return false;
  }

  autoStartInFlight = true;
  const exe = findOllamaExecutable() || 'ollama';

  try {
    const proc = spawn(exe, ['serve'], {
      detached: true,
      stdio: 'ignore',
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        OLLAMA_FLASH_ATTENTION: '0',
        OLLAMA_MAX_LOADED_MODELS: process.env.OLLAMA_MAX_LOADED_MODELS || '1',
        OLLAMA_NUM_PARALLEL: process.env.OLLAMA_NUM_PARALLEL || '1'
      }
    });
    proc.unref();

    for (let i = 0; i < 16; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (await isOllamaReachable(url)) {
        return true;
      }
    }
  } catch (err) {
    console.warn('[OllamaAutoStart] Failed to auto-start ollama daemon:', err);
  } finally {
    autoStartInFlight = false;
  }

  return await isOllamaReachable(url);
}

/** One shared, short-lived inventory for catalog, routing and execution. No prompt data. */
export async function refreshOllamaInventory(force = false): Promise<void> {
  const url = ollamaBaseUrl();
  if (!url) return;
  // If a refresh is already in flight but we have a valid snapshot, return immediately to unblock request
  if (pending && snapshot?.url === url) return;
  if (pending) return pending;
  if (!force && snapshot?.url === url && Date.now() - snapshot.checkedAt < 30_000) return;
  pending = (async () => {
    try {
      let response = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(2000) }).catch(() => null);
      if (!response || !response.ok) {
        await ensureOllamaRunning(url);
        response = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(4000) }).catch(() => null);
      }
      if (!response || !response.ok) throw new Error('OLLAMA_INVENTORY_UNAVAILABLE');
      const data = await response.json();
      if (!Array.isArray(data.models)) throw new Error('OLLAMA_INVENTORY_INVALID');
      // Fetch model metadata concurrently to avoid sequential latency spikes
      const modelPromises = data.models.map(async (item: any) => {
        if (typeof item?.name !== 'string') return null;
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
        return { name: item.name, size: Number(item.size) || 0, capabilities, contextLength };
      });
      const resolved = await Promise.all(modelPromises);
      const models = resolved.filter((m): m is LocalModel => m !== null);
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

/**
 * Adaptive Multi-Slot Inference Queue for Local LLMs (Ollama)
 * - Supports configurable concurrent slots via OLLAMA_MAX_CONCURRENT (default 2, up to 8)
 * - Priority scheduling: interactive chat requests jump ahead of background jobs
 * - Automatic timeout cleanup and queue metrics tracking
 */
export class LocalInferenceQueue {
  private activeCount = 0;
  private maxConcurrent: number;
  private waiters: Array<{ grant: () => void; priority: 'high' | 'normal' }> = [];

  constructor(maxConcurrent?: number) {
    const envLimit = (process.env.NODE_ENV !== 'test' && process.env.OLLAMA_MAX_CONCURRENT)
      ? parseInt(process.env.OLLAMA_MAX_CONCURRENT, 10)
      : 1;
    this.maxConcurrent = Math.max(1, Math.min(8, maxConcurrent ?? (isNaN(envLimit) ? 1 : envLimit)));
  }

  getStats(): { active: number; waiting: number; maxConcurrent: number } {
    return {
      active: this.activeCount,
      waiting: this.waiters.length,
      maxConcurrent: this.maxConcurrent
    };
  }

  acquire(signal?: AbortSignal, priority: 'high' | 'normal' = 'normal'): Promise<() => void> {
    if (signal?.aborted) return Promise.reject(aborted());
    if (this.waiters.length >= 64) {
      return Promise.reject(Object.assign(new Error('OLLAMA_QUEUE_FULL'), { statusCode: 429 }));
    }

    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const waiterEntry = {
        grant: () => {},
        priority
      };

      const remove = () => {
        if (timer) clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        this.waiters = this.waiters.filter(entry => entry !== waiterEntry);
      };

      const onAbort = () => {
        remove();
        reject(aborted());
      };

      const grant = () => {
        remove();
        this.activeCount++;
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          this.activeCount = Math.max(0, this.activeCount - 1);
          // Dispatch next waiter (high priority first)
          if (this.waiters.length > 0) {
            const nextIdx = this.waiters.findIndex(w => w.priority === 'high');
            const targetWaiter = nextIdx !== -1 ? this.waiters.splice(nextIdx, 1)[0] : this.waiters.shift();
            targetWaiter?.grant();
          }
        });
      };

      waiterEntry.grant = grant;
      signal?.addEventListener('abort', onAbort, { once: true });

      if (this.activeCount < this.maxConcurrent) {
        grant();
      } else {
        if (priority === 'high') {
          // Insert after existing high priority waiters, ahead of normal ones
          const lastHighIdx = this.waiters.map(w => w.priority).lastIndexOf('high');
          if (lastHighIdx !== -1) {
            this.waiters.splice(lastHighIdx + 1, 0, waiterEntry);
          } else {
            this.waiters.unshift(waiterEntry);
          }
        } else {
          this.waiters.push(waiterEntry);
        }
        timer = setTimeout(() => {
          remove();
          reject(new Error('OLLAMA_QUEUE_TIMEOUT'));
        }, 120_000);
      }
    });
  }
}

export const localInferenceQueue = new LocalInferenceQueue();

/**
 * Pre-warms a local Ollama model into GPU VRAM using an empty generate call.
 * This eliminates the cold-start delay before the user finishes typing their first message.
 */
export async function prewarmOllamaModel(providerModelId?: string): Promise<{ success: boolean; model: string; durationMs: number }> {
  const url = ollamaBaseUrl();
  if (!url) return { success: false, model: '', durationMs: 0 };
  const targetModel = providerModelId || 'si-pinter:latest';
  const start = Date.now();
  try {
    const res = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: targetModel,
        keep_alive: process.env.OLLAMA_KEEP_ALIVE || '15m'
      }),
      signal: AbortSignal.timeout(10_000)
    });
    return { success: res.ok, model: targetModel, durationMs: Date.now() - start };
  } catch {
    return { success: false, model: targetModel, durationMs: Date.now() - start };
  }
}
