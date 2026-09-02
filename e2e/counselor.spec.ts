import { test, expect } from '@playwright/test';

test.describe('Counselor E2E', () => {
  test('Counselor Directory', async ({ page }) => {
    await page.goto('/counselors?__test__=true');
    await expect(page.locator('text=Direktori Konselor').first()).toBeVisible();
    await expect(page.locator('text=Temui Konselor & Psikolog').first()).toBeVisible();
    
    // Select counselor
    const bookButton = page.locator('button', { hasText: 'Jadwalkan' }).first();
    if (await bookButton.isVisible()) {
      await bookButton.click();
      await expect(page.locator('text=Pilih Konselor')).toBeVisible();
    }
  });
});
