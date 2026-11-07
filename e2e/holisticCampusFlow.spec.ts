import { test, expect } from '@playwright/test';

test.describe('Holistic Campus Flow E2E (Chat, Screening, RuangCoder, Counselor Simulator)', () => {
  test('Mahasiswa Guest Flow: Navigate & Access Critical Services', async ({ page }) => {
    // 1. Visit landing page
    await page.goto('/?__test__=true');
    await expect(page.locator('body')).toBeVisible();

    // 2. Open Screening page
    await page.goto('/screening?__test__=true');
    await expect(page.locator('body')).toContainText(/Cek Kondisi Mental|Skrining Mandiri/i);

    // 3. Open Counselor Directory & Appointments
    await page.goto('/counselors?__test__=true');
    await expect(page.locator('body')).toContainText(/Direktori Konselor|Konseling/i);

    // 4. Open Emergency & Crisis Protocol
    await page.goto('/emergency?__test__=true');
    await expect(page.locator('body')).toContainText(/Pusat Bantuan Krisis|Darurat/i);

    // 5. Open RuangCoder Web Sandbox IDE
    await page.goto('/ruang-coder?__test__=true');
    await expect(page.locator('body')).toContainText(/RUANGCODER|Dewan Ahli AI/i);
  });
});
