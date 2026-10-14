import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

for (const viewport of [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 375, height: 812 }]) {
  test(`artifact studio visual editor ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript(() => { localStorage.setItem('rt_onboarding_completed_guest', 'true'); localStorage.setItem('ruangtenang_last_seen_version', 'v3.4.0'); });
    await page.goto('/workspace/new?__test__=true', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20_000 });
    const openCanvas = page.getByRole('button', { name: 'Buka Canvas', exact: true });
    if (await openCanvas.isVisible()) await openCanvas.click();
    else await page.getByRole('button', { name: 'Canvas', exact: true }).click();
    await page.getByRole('button', { name: /Buat Draf Baru/ }).click();
    await page.locator('[title="Edit Dokumen Langsung (Autosave)"]').click();
    await expect(page.getByRole('toolbar', { name: 'Pemformatan dokumen' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Tebal' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Markdown' })).toBeVisible();
    await page.waitForTimeout(3500);
    const directory = path.join(process.env.E2E_ARTIFACTS_DIR || 'test-artifacts', 'fase25');
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: path.join(directory, `artifact-studio-${viewport.name}.png`), animations: 'disabled', fullPage: false, scale: 'css' });
  });
}
