import { lazy, ComponentType } from 'react';

const CHUNK_RELOAD_KEY = 'ruangtenang_chunk_reload_guard';

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T } | any>
) {
  return lazy(() =>
    factory().catch(async (err: any) => {
      const isChunkError =
        err?.name === 'ChunkLoadError' ||
        /loading chunk/i.test(err?.message || '') ||
        /failed to fetch dynamically imported module/i.test(err?.message || '') ||
        /importing a module script failed/i.test(err?.message || '');

      console.warn('Dynamic import failed:', err);

      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return await factory();
      } catch (retryErr: any) {
        const isRetryChunkError =
          isChunkError ||
          retryErr?.name === 'ChunkLoadError' ||
          /loading chunk/i.test(retryErr?.message || '') ||
          /failed to fetch dynamically imported module/i.test(retryErr?.message || '') ||
          /importing a module script failed/i.test(retryErr?.message || '');

        if (isRetryChunkError && typeof window !== 'undefined') {
          const lastReload = sessionStorage.getItem(CHUNK_RELOAD_KEY);
          const now = Date.now();
          if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
            sessionStorage.setItem(CHUNK_RELOAD_KEY, now.toString());
            window.location.reload();
          }
        }
        throw retryErr;
      }
    })
  );
}
