import { test, expect } from '@playwright/test';

test.describe('Aurora 2.1 Baseline Visual Capture & Diagnostics', () => {
  test('Capture Ruang Tenang & Ruang Kerja baseline states', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 1. Ruang Tenang Light Idle
    await page.screenshot({ path: 'test-artifacts/baseline/rt-light-idle.png' });

    // Simulate thinking state via event dispatch
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('rt-aurora-activity', {
        detail: { mode: 'RUANG_TENANG', phase: 'thinking', requestId: 'diag-1', timestamp: Date.now() }
      }));
    });
    await page.waitForTimeout(1000);
    // 2. Ruang Tenang Light Thinking
    await page.screenshot({ path: 'test-artifacts/baseline/rt-light-thinking.png' });

    // Switch to dark theme
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ruangtenang_theme', 'dark');
    });
    await page.waitForTimeout(1000);

    // 3. Ruang Tenang Dark Thinking
    await page.screenshot({ path: 'test-artifacts/baseline/rt-dark-thinking.png' });

    // Back to idle in dark
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('rt-aurora-activity', {
        detail: { mode: 'RUANG_TENANG', phase: 'idle', requestId: 'diag-1', timestamp: Date.now() }
      }));
    });
    await page.waitForTimeout(1000);
    // 4. Ruang Tenang Dark Idle
    await page.screenshot({ path: 'test-artifacts/baseline/rt-dark-idle.png' });

    // Switch to Ruang Kerja
    await page.goto('http://localhost:3005/workspace');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 5. Ruang Kerja Dark Idle
    await page.screenshot({ path: 'test-artifacts/baseline/rk-dark-idle.png' });

    // Ruang Kerja Dark Streaming
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('rt-aurora-activity', {
        detail: { mode: 'RUANG_KERJA', phase: 'streaming', requestId: 'diag-2', timestamp: Date.now() }
      }));
    });
    await page.waitForTimeout(1000);
    // 6. Ruang Kerja Dark Streaming
    await page.screenshot({ path: 'test-artifacts/baseline/rk-dark-streaming.png' });

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
    await page.screenshot({ path: 'test-artifacts/baseline/rk-light-thinking.png' });

    // 8. Mobile 390px Ruang Tenang Light Idle
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-artifacts/baseline/rt-mobile-light-idle.png' });
  });
});
