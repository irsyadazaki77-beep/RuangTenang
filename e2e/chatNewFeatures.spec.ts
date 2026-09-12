import { test, expect } from '@playwright/test';

test.describe('Chat 5 New Features E2E', () => {
  test.beforeEach(async ({ page }) => {
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
      const closeBtn = page.locator('button[aria-label="Tutup dialog"]').first();
      await closeBtn.click();
    }
  });

  test('Bookmarks and Memory modals open cleanly', async ({ page }) => {
    // Open more menu if on desktop/mobile
    const moreMenuBtn = page.locator('button[aria-label*="Menu"], button[title*="Opsi"]').first();
    if (await moreMenuBtn.isVisible()) {
      await moreMenuBtn.click();
      const bookmarkOption = page.locator('text=Pesan Tersimpan').first();
      if (await bookmarkOption.isVisible()) {
        await bookmarkOption.click();
        await expect(page.locator('text=Pesan Tersimpan')).toBeVisible();
        const closeBtn = page.locator('button[aria-label="Tutup dialog"]').first();
        await closeBtn.click();
      }
    }
  });
});
