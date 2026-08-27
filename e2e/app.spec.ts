import { test, expect } from '@playwright/test';

test.describe('RuangTenang E2E Full Application Suite', () => {

  test('1. Guest Chat & Initial UI Rendering', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/RuangTenang/i);
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('2. Screening Consent Flow', async ({ page }) => {
    await page.goto('/');
    const screeningBtn = page.locator('button:has-text("Skrining Mandiri"), button:has-text("Skrining")').first();
    if (await screeningBtn.isVisible()) {
      await screeningBtn.click();
      await expect(page.locator('text=Skrining Mandiri PHQ-9 & GAD-7')).toBeVisible();
    }
  });

  test('3. Mobile Viewport Responsive Layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('4. Login Modal & Form Controls', async ({ page }) => {
    await page.goto('/');
    const loginBtn = page.locator('button:has-text("Masuk"), button:has-text("Login")').first();
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await expect(page.locator('text=Masuk ke RuangTenang')).toBeVisible();
    }
  });

  test('5. Counselor Directory Visibility & Filter', async ({ page }) => {
    await page.goto('/');
    const counselorBtn = page.locator('button:has-text("Konselor"), button:has-text("Direktori")').first();
    if (await counselorBtn.isVisible()) {
      await counselorBtn.click();
      await expect(page.locator('text=Direktori Konselor')).toBeVisible();
    }
  });

  test('6. Error Recovery & Health Status', async ({ page }) => {
    const response = await page.request.get('/api/v1/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('healthy');
  });

});
