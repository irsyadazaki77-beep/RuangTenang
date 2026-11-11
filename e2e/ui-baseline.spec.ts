import { test, expect, Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

async function dismissOnboardingIfPresent(page: Page) {
  const skipBtn = page.getByRole('button', { name: /Lewati/i });
  if (await skipBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(300);
  }
}

test.describe('UI/UX Baseline & Cross-Space Verification (RuangTenang, RuangKerja, RuangCoder)', () => {
  test('Captures clean screenshots across spaces, themes, and viewports without blocking modals', async ({ page }, testInfo) => {
    test.setTimeout(120_000);

    await page.addInitScript(() => {
      try {
        localStorage.setItem('rt_onboarding_completed_guest', 'true');
        localStorage.setItem('rt_guest_ai_consent_v1', 'true');
      } catch {
        // ignore storage errors
      }
    });

    const capture = async (name: string) => {
      const directory = path.join(
        process.env.E2E_ARTIFACTS_DIR || 'test-artifacts',
        'ui-baseline',
        testInfo.project.name
      );
      await mkdir(directory, { recursive: true });
      await page.screenshot({
        path: path.join(directory, `${name}.png`),
        animations: 'disabled',
      });
    };

    const setTheme = async (theme: 'light' | 'dark') => {
      await page.evaluate((t) => {
        if (t === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('ruangtenang_theme', t);
      }, theme);
      await page.waitForTimeout(250);
    };

    // 1. Desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });

    // RuangTenang
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissOnboardingIfPresent(page);
    await setTheme('light');
    await capture('ruangtenang-desktop-light');
    await setTheme('dark');
    await capture('ruangtenang-desktop-dark');

    // RuangKerja
    await page.goto('/workspace');
    await page.waitForLoadState('networkidle');
    await dismissOnboardingIfPresent(page);
    await setTheme('light');
    await capture('ruangkerja-desktop-light');
    await setTheme('dark');
    await capture('ruangkerja-desktop-dark');

    // RuangCoder
    await page.goto('/coder');
    await page.waitForLoadState('networkidle');
    await dismissOnboardingIfPresent(page);
    await setTheme('light');
    await capture('ruangcoder-desktop-light');
    await setTheme('dark');
    await capture('ruangcoder-desktop-dark');

    // 2. Tablet 820x1180
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto('/workspace');
    await page.waitForLoadState('networkidle');
    await dismissOnboardingIfPresent(page);
    await capture('ruangkerja-tablet-dark');

    // 3. Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissOnboardingIfPresent(page);
    await setTheme('light');
    await capture('ruangtenang-mobile-light');

    await page.goto('/workspace');
    await page.waitForLoadState('networkidle');
    await dismissOnboardingIfPresent(page);
    await capture('ruangkerja-mobile-light');

    await page.goto('/coder');
    await page.waitForLoadState('networkidle');
    await dismissOnboardingIfPresent(page);
    await capture('ruangcoder-mobile-light');

    await expect(page).toHaveURL(/\/coder/);
  });
});
