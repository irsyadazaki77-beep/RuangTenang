import { lazy, ComponentType } from 'react';
import { safeSessionStorage } from './storage';

const CHUNK_RELOAD_KEY = 'ruangtenang_chunk_reload_guard';

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T } | any>
) {
  return lazy(async () => {
    const delays = [300, 800, 1500];
    let lastError: any;

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        return await factory();
      } catch (err: any) {
        lastError = err;
        if (attempt < delays.length) {
          console.warn(`Dynamic import attempt ${attempt + 1} failed, retrying...`, err);
          await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
        }
      }
    }

    const isChunkError =
      lastError?.name === 'ChunkLoadError' ||
      /loading chunk/i.test(lastError?.message || '') ||
      /failed to fetch dynamically imported module/i.test(lastError?.message || '') ||
      /importing a module script failed/i.test(lastError?.message || '');

    if (isChunkError && typeof window !== 'undefined') {
      const lastReload = safeSessionStorage.getItem(CHUNK_RELOAD_KEY);
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        safeSessionStorage.setItem(CHUNK_RELOAD_KEY, now.toString());
        window.location.reload();
      }
    }
    throw lastError;
  });
}

