import { afterAll, beforeAll, expect } from 'vitest';

/**
 * Opt-in per-file memory diagnostics (VITEST_MEMORY_DIAG=1). Logs only numbers and the
 * test file's relative path - never test content, payloads or credentials.
 */
if (process.env.VITEST_MEMORY_DIAG === '1') {
  const mb = (n: number) => Math.round(n / 1048576);
  let before = process.memoryUsage();
  let start = Date.now();
  beforeAll(() => {
    (globalThis as { gc?: () => void }).gc?.();
    before = process.memoryUsage();
    start = Date.now();
  });
  afterAll(() => {
    (globalThis as { gc?: () => void }).gc?.();
    const after = process.memoryUsage();
    const file = String(expect.getState().testPath ?? 'unknown').replace(/^.*[\\/](src|server)[\\/]/, '$1/');
    console.info(`[mem] ${file} | heap ${mb(before.heapUsed)}->${mb(after.heapUsed)}MB | rss ${mb(before.rss)}->${mb(after.rss)}MB | ${Date.now() - start}ms`);
  });
}
