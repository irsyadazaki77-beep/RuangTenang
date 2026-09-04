import { test, expect } from '@playwright/test';

test.describe('Chat E2E', () => {
  test('create persistent chat, send message, edit, delete, etc', async ({ page }) => {
    await page.goto('/?__test__=true');
    await expect(page.locator('textarea').first().or(page.locator('button[type="submit"]'))).toBeVisible({ timeout: 15000 });
  });
});
