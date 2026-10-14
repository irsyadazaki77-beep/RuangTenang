import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

for (const viewport of [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 320, height: 800 }]) {
  test(`artifact editor screenshot ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript(() => { localStorage.setItem('rt_onboarding_completed_guest', 'true'); localStorage.setItem('ruangtenang_last_seen_version', 'v3.4.0'); });
    await page.goto('/workspace/new?__test__=true', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20_000 });
    const openCanvas = page.getByRole('button', { name: 'Buka Canvas', exact: true });
    if (await openCanvas.isVisible()) await openCanvas.click();
    else await page.getByRole('button', { name: 'Canvas', exact: true }).click();
    await page.getByRole('button', { name: /Buat Draf Baru/ }).click();
    await page.locator('[title="Edit Dokumen Langsung (Autosave)"]').click();
    await expect(page.getByText('Editor Draf Dokumen')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    const updateNotice = page.getByRole('button', { name: 'Tutup Notifikasi' });
    if (await updateNotice.count()) await updateNotice.last().click();
    const directory = path.join(process.env.E2E_ARTIFACTS_DIR || 'test-artifacts', 'artifact-canvas', 'after');
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: path.join(directory, `${viewport.name}.png`), animations: 'disabled', fullPage: false, scale: 'css' });
  });
}
