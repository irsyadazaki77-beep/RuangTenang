import { test, expect } from '@playwright/test';

test.describe('Emergency E2E', () => {
  test('Emergency Center', async ({ page }) => {
    await page.goto('/emergency?__test__=true');
    await expect(page.locator('text=Pusat Bantuan Krisis & Darurat').first()).toBeVisible();
    
    // Find SOS button
    const sosBtn = page.locator('button', { hasText: 'Darurat' }).first();
    await expect(sosBtn).toBeVisible();
  });
});
