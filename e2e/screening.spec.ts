import { test, expect } from '@playwright/test';

test.describe('Screening E2E', () => {
  test('Screening flow', async ({ page }) => {
    await page.goto('/screening?__test__=true');
    await expect(page.locator('h1').first().or(page.locator('button[type="submit"]'))).toBeVisible({ timeout: 15000 });
  });
});
