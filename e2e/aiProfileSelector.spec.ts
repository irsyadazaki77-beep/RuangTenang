import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

test('public AI selectors expose only the three profiles for the active mode', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
  await page.setViewportSize({ width: 1440, height: 900 });
  const screenshotDir = path.join(process.env.E2E_ARTIFACTS_DIR || 'test-artifacts', 'ai-profile-selectors');
  await mkdir(screenshotDir, { recursive: true });

  await page.goto('/?__test__=true', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /RuangTenang.*Tenang Middle/ }).click();
  const tenangOptions = page.getByRole('radiogroup', { name: 'Profil AI RuangTenang' });
  await expect(tenangOptions.getByRole('radio')).toHaveCount(3);
  await expect(tenangOptions.getByText('Tenang Turbo')).toBeVisible();
  await expect(tenangOptions.getByText('Tenang Middle')).toBeVisible();
  await expect(tenangOptions.getByText('Tenang Low')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'ruang-tenang.png'), animations: 'disabled', scale: 'css' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: path.join(screenshotDir, 'ruang-tenang-dark.png'), animations: 'disabled', scale: 'css' });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));

  await page.goto('/workspace/new?__test__=true', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /Pilih model, / }).click();
  const kerjaOptions = page.getByRole('listbox', { name: 'Profil AI RuangKerja' });
  await expect(kerjaOptions.getByRole('option')).toHaveCount(3);
  await expect(kerjaOptions.getByText('Kerja Fast')).toBeVisible();
  await expect(kerjaOptions.getByText('Kerja Santai')).toBeVisible();
  await expect(kerjaOptions.getByText('Kerja Hard')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'ruang-kerja.png'), animations: 'disabled', scale: 'css' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: path.join(screenshotDir, 'ruang-kerja-dark.png'), animations: 'disabled', scale: 'css' });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));

  await page.setViewportSize({ width: 408, height: 852 });
  const santaiOption = kerjaOptions.getByRole('option', { name: /Kerja Santai/ });
  await expect(santaiOption).toBeVisible();
  expect((await santaiOption.boundingBox())?.width).toBeGreaterThan(340);
  await page.screenshot({ path: path.join(screenshotDir, 'ruang-kerja-408px.png'), animations: 'disabled', scale: 'css' });

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /Pilih model, Kerja Hard/ })).toBeVisible();
});
