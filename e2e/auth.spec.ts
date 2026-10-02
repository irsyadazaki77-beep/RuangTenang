import { test, expect } from '@playwright/test';

test.describe('Auth E2E', () => {
  test('rejects unauthenticated API requests and exposes registration form', async ({ page }) => {
    const protectedResp = await page.request.get('/api/v1/chat/history');
    expect(protectedResp.status()).toBe(401);

    await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
    await page.goto('/');

    const openSidebar = page.getByRole('button', { name: 'Buka Menu Samping' });
    if (await openSidebar.isVisible().catch(() => false)) await openSidebar.click();
    const openAuth = page.getByRole('button', { name: /Masuk Akun/ }).first();
    await openAuth.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Registrasi' }).click();
    await expect(page.getByPlaceholder('Ahmad Fauzi')).toBeVisible();
    await expect(page.getByPlaceholder('fauzi@ui.ac.id')).toBeVisible();

    await page.getByRole('button', { name: 'Tutup Sesi' }).click();
    await expect(page.getByPlaceholder('Ketik apa yang kamu rasakan...')).toBeVisible();
  });
});
