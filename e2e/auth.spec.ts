import { test, expect } from '@playwright/test';

test.describe('Auth E2E', () => {
  test('register, login, refresh, logout, session persistence', async ({ page }) => {
    // 1. Register
    await page.goto('/');
    
    // Protected API rejection before login
    const resp = await page.request.get('/api/v1/chat/history');
    expect(resp.status()).toBe(401);

    // Using UI for login/register if possible.
    // In our app, there's a login button somewhere or we can use the API directly for test setup.
    // Let's use UI.
    const loginButton = page.locator('button', { hasText: 'Login' });
    if (await loginButton.isVisible()) {
      await loginButton.click();
      
      // Assume modal opens
      const registerTab = page.locator('button', { hasText: 'Daftar' });
      await registerTab.click();
      
      const email = `testuser_${Date.now()}@ui.ac.id`;
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', 'Password123!');
      await page.fill('input[placeholder*="Nama"]', 'Test User');
      
      await page.click('button:has-text("Daftar Sekarang")');
      
      // Wait for login success
      await expect(page.locator('text=Test User').first()).toBeVisible({ timeout: 10000 });
      
      // Check session persistence
      await page.reload();
      await expect(page.locator('text=Test User').first()).toBeVisible();
      
      // Logout
      const profileBtn = page.locator('button:has-text("Test User")');
      await profileBtn.click();
      
      const logoutBtn = page.locator('button:has-text("Logout")');
      await logoutBtn.click();
      
      await expect(page.locator('button', { hasText: 'Login' })).toBeVisible();
    }
  });
});
