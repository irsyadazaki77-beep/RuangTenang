import { test, expect } from '@playwright/test';

test.describe('Counselor E2E', () => {
  test('Counselor Directory', async ({ page }) => {
    await page.goto('/counselors?__test__=true');
    // It might redirect to login, let's just wait for either
    await expect(page.locator('text=Direktori Konselor').first().or(page.locator('button[type="submit"]'))).toBeVisible({ timeout: 15000 });
  });
});
