import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

test.describe('Aurora 2.1 Baseline Visual Capture & Diagnostics', () => {
  test('Capture Ruang Tenang & Ruang Kerja baseline states', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const capture = async (name: string) => {
      const directory = path.join(process.env.E2E_ARTIFACTS_DIR || 'test-artifacts', 'baseline', testInfo.project.name);
      await mkdir(directory, { recursive: true });
      await page.screenshot({ path: path.join(directory, `${name}.png`), animations: 'disabled' });
    };
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/$/);

    // 1. Ruang Tenang Light Idle
    await capture('rt-light-idle');

    // Simulate thinking state via event dispatch
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('rt-aurora-activity', {
        detail: { mode: 'RUANG_TENANG', phase: 'thinking', requestId: 'diag-1', timestamp: Date.now() }
      }));
    });
    await page.waitForTimeout(1000);
    // 2. Ruang Tenang Light Thinking
    await capture('rt-light-thinking');

    // Switch to dark theme
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ruangtenang_theme', 'dark');
    });
    await page.waitForTimeout(1000);

    // 3. Ruang Tenang Dark Thinking
    await capture('rt-dark-thinking');

    // Back to idle in dark
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('rt-aurora-activity', {
        detail: { mode: 'RUANG_TENANG', phase: 'idle', requestId: 'diag-1', timestamp: Date.now() }
      }));
    });
    await page.waitForTimeout(1000);
    // 4. Ruang Tenang Dark Idle
    await capture('rt-dark-idle');

    // Switch to Ruang Kerja
    await page.goto('/workspace');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/workspace/);

    // 5. Ruang Kerja Dark Idle
    await capture('rk-dark-idle');

    // Ruang Kerja Dark Streaming
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('rt-aurora-activity', {
        detail: { mode: 'RUANG_KERJA', phase: 'streaming', requestId: 'diag-2', timestamp: Date.now() }
      }));
    });
    await page.waitForTimeout(1000);
    // 6. Ruang Kerja Dark Streaming
    await capture('rk-dark-streaming');

    // Switch to Light Mode in Ruang Kerja
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ruangtenang_theme', 'light');
    });
    await page.waitForTimeout(1000);

    // 7. Ruang Kerja Light Thinking
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('rt-aurora-activity', {
        detail: { mode: 'RUANG_KERJA', phase: 'thinking', requestId: 'diag-3', timestamp: Date.now() }
      }));
    });
    await page.waitForTimeout(1000);
    await capture('rk-light-thinking');

    // 8. Mobile 390px Ruang Tenang Light Idle
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await capture('rt-mobile-light-idle');
  });
});
