import { test, expect } from '@playwright/test';

test.describe('Screening E2E', () => {
  test('Screening flow', async ({ page }) => {
    await page.goto('/screening?__test__=true');
    await expect(page.locator('h1', { hasText: 'Cek Kondisi Mental' }).first()).toBeVisible();
    await page.locator('button', { hasText: /Mulai Cek Kondisi/i }).first().click();
    
    // Check if PHQ-9 or similar question appears
    await expect(page.locator('text=Dalam 2 minggu terakhir')).toBeVisible({ timeout: 10000 });
    
    // Fill the questionnaire (simplified click next)
    // Here we'll just check it opens. 
  });
});
