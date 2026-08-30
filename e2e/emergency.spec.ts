import { test, expect } from '@playwright/test';

test.describe('Emergency E2E', () => {
  test('Emergency Center', async ({ page }) => {
    await page.goto('/emergency');
    await expect(page.locator('text=Pusat Bantuan Darurat')).toBeVisible();
    await expect(page.locator('text=Butuh Bantuan Segera?')).toBeVisible();
    
    // Find SOS button
    const sosBtn = page.locator('button', { hasText: 'SOS' }).first();
    await expect(sosBtn).toBeVisible();
  });
});
