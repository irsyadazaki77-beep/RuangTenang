import { test, expect } from '@playwright/test';

test.describe('Counselor E2E', () => {
  test('Counselor Directory', async ({ page }) => {
    await page.goto('/counselors');
    await expect(page.locator('text=Direktori Konselor')).toBeVisible();
    await expect(page.locator('text=Cari konselor')).toBeVisible();
    
    // Select counselor
    const bookButton = page.locator('button', { hasText: 'Jadwalkan Konsultasi' }).first();
    if (await bookButton.isVisible()) {
      await bookButton.click();
      await expect(page.locator('text=Jadwalkan Konsultasi dengan')).toBeVisible();
    }
  });
});
