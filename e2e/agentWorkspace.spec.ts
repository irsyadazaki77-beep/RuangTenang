import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

test('Agent plan panel is compact and exposes plan creation controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.addInitScript(() => {
    localStorage.setItem('rt_onboarding_completed_guest', 'true');
    localStorage.setItem('ruangtenang_last_seen_version', 'v3.4.0');
  });
  await page.goto('/workspace/new?__test__=true', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20_000 });
  const notification = page.getByRole('button', { name: 'Tutup Notifikasi' });
  if (await notification.isVisible()) await notification.click();
  await page.getByRole('button', { name: 'Buka panel', exact: true }).click();
  await page.getByRole('tab', { name: 'Rencana' }).click();
  await expect(page.getByRole('tabpanel', { name: 'Rencana' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Tujuan workflow' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buat plan' })).toBeVisible();
  const output = path.join(process.env.E2E_ARTIFACTS_DIR || 'test-artifacts', 'agent-workspace');
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: path.join(output, 'agent-plan-panel.png'), animations: 'disabled', fullPage: false, scale: 'css' });
});
