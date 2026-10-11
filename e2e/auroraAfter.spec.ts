import { test, expect } from '@playwright/test';

test.describe('Aurora 2.2 After Visual Capture & Verification', () => {
  test('Capture Ruang Tenang & Ruang Kerja after optimization', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 1. Ruang Tenang Light Idle
    await page.screenshot({ path: 'test-artifacts/after/rt-light-idle.png' });

    // Simulate thinking state via event dispatch
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('rt-aurora-activity', {
        detail: { mode: 'RUANG_TENANG', phase: 'thinking', requestId: 'diag-after-1', timestamp: Date.now() }
      }));
    });
    await page.waitForTimeout(1000);
    // 2. Ruang Tenang Light Thinking
    await page.screenshot({ path: 'test-artifacts/after/rt-light-thinking.png' });

    // Switch to dark theme
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ruangtenang_theme', 'dark');
    });
    await page.waitForTimeout(1000);

    // 3. Ruang Tenang Dark Thinking
    await page.screenshot({ path: 'test-artifacts/after/rt-dark-thinking.png' });

    // Back to idle in dark
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('rt-aurora-activity', {
        detail: { mode: 'RUANG_TENANG', phase: 'idle', requestId: 'diag-after-1', timestamp: Date.now() }
      }));
    });
    await page.waitForTimeout(1000);
    // 4. Ruang Tenang Dark Idle
    await page.screenshot({ path: 'test-artifacts/after/rt-dark-idle.png' });

    // Switch to Ruang Kerja
    await page.goto('http://localhost:3005/workspace');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 5. Ruang Kerja Dark Idle
    await page.screenshot({ path: 'test-artifacts/after/rk-dark-idle.png' });

    // Ruang Kerja Dark Streaming
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('rt-aurora-activity', {
        detail: { mode: 'RUANG_KERJA', phase: 'streaming', requestId: 'diag-after-2', timestamp: Date.now() }
      }));
    });
    await page.waitForTimeout(1000);
    // 6. Ruang Kerja Dark Streaming
    await page.screenshot({ path: 'test-artifacts/after/rk-dark-streaming.png' });

    // Switch to Light Mode in Ruang Kerja
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ruangtenang_theme', 'light');
    });
    await page.waitForTimeout(1000);

    // 7. Ruang Kerja Light Thinking
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('rt-aurora-activity', {
        detail: { mode: 'RUANG_KERJA', phase: 'thinking', requestId: 'diag-after-3', timestamp: Date.now() }
      }));
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-artifacts/after/rk-light-thinking.png' });

    // 8. Mobile 390px Ruang Tenang Light Idle
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-artifacts/after/rt-mobile-light-idle.png' });
  });
});
