import { expect, test } from '@playwright/test';

test.describe('Workspace navigation and responsive shell', () => {
  test('command palette opens and closes the actual Canvas inspector', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/workspace/c/e2e-workspace?__test__=true');
    await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20000 });

    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog', { name: 'Command Palette' });
    await expect(palette).toBeVisible();
    await page.getByRole('button', { name: /Buka Canvas/ }).click();

    await expect(palette).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Canvas' })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Canvas' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('keeps the workspace inside common viewport widths', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/workspace/new?__test__=true');
      await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20000 });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(width + 1);
    }
  });
});
