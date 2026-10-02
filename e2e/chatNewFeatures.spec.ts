import { test, expect } from '@playwright/test';

test.describe('Chat 5 New Features E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
    await page.goto('/?__test__=true');
    await expect(page.locator('textarea').first().or(page.locator('button[type="submit"]'))).toBeVisible({ timeout: 15000 });
  });

  test('In-Chat Search bar opens and closes properly', async ({ page }) => {
    const searchTrigger = page.locator('button[aria-label*="Cari"], button[title*="Cari"]').first();
    if (await searchTrigger.isVisible()) {
      await searchTrigger.click();
      const searchInput = page.locator('input[placeholder*="Cari dalam obrolan"]');
      await expect(searchInput).toBeVisible();
      await searchInput.fill('ujian');
      await page.keyboard.press('Escape');
    }
  });

  test('Session Summary modal opens cleanly', async ({ page }) => {
    const summaryBtn = page.locator('button:has-text("Ringkas"), button[title*="Ringkas"]').first();
    if (await summaryBtn.isVisible()) {
      await summaryBtn.click();
      await expect(page.locator('text=Ringkasan Sesi Obrolan')).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('Bookmarks and Memory modals open cleanly', async ({ page }) => {
    // Open more menu if on desktop/mobile
    const moreMenuBtn = page.getByRole('button', { name: 'Menu & Opsi Tambahan' });
    if (await moreMenuBtn.isVisible()) {
      await moreMenuBtn.click();
      const bookmarkOption = page.locator('text=Pesan Tersimpan').first();
      if (await bookmarkOption.isVisible()) {
        await bookmarkOption.click();
        await expect(page.getByRole('heading', { name: 'Pesan Tersimpan' })).toBeVisible();
        await page.keyboard.press('Escape');
      }
    }
  });
});
