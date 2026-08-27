import { test, expect } from '@playwright/test';

test.describe('RuangTenang E2E User Journeys', () => {
  test('Guest Flow: Initial chat and prompt', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/RuangTenang/i);
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    
    // Test quick prompt
    const anyPrompt = page.locator('button', { hasText: /cemas|stres|kuliah|sedih/i }).first();
    if (await anyPrompt.isVisible()) {
        await anyPrompt.click();
    } else {
        await textarea.fill('Saya merasa cemas');
        await page.locator('button', { hasText: /Kirim/i }).first().click();
    }
    
    await expect(page.locator('.max-w-3xl')).toBeVisible({ timeout: 10000 });
  });

  test('Screening Flow', async ({ page }) => {
    await page.goto('/screening');
    await expect(page.locator('text=Skrining Mandiri')).toBeVisible();
    await expect(page.locator('button', { hasText: /Mulai Skrining/i }).first()).toBeVisible();
  });

  test('Counselor Directory Flow', async ({ page }) => {
    await page.goto('/counselors');
    await expect(page.locator('text=Direktori Konselor')).toBeVisible();
    await expect(page.locator('text=Cari konselor')).toBeVisible();
  });

  const viewports = [
    { width: 320, height: 568 },
    { width: 375, height: 812 },
    { width: 768, height: 1024 }
  ];

  for (const vp of viewports) {
    test(`Responsive Viewport: ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/');
      await expect(page.locator('textarea')).toBeVisible();
    });
  }

  test('Security Smoke: Unauthenticated protected route', async ({ page }) => {
    const response = await page.request.get('/api/v1/chat/history');
    expect(response.status()).toBe(401);
  });
  
  test('Health Status API', async ({ page }) => {
    const response = await page.request.get('/api/v1/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('healthy');
  });
});
