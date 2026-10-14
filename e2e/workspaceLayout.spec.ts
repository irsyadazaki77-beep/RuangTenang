import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

test('workspace layout captures and viewport safety', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
  const phase = process.env.WORKSPACE_CAPTURE_PHASE === 'baseline' ? 'before' : 'after';
  const widths = [320, 375, 768, 1280, 1920];
  for (const theme of ['light', 'dark'] as const) {
  await page.goto('/workspace/new?__test__=true', { waitUntil: 'domcontentloaded' });
    const closeNotification = page.getByRole('button', { name: 'Tutup Notifikasi' });
    if (await closeNotification.isVisible()) await closeNotification.click();
    await page.evaluate((activeTheme) => {
      document.documentElement.classList.toggle('dark', activeTheme === 'dark');
      localStorage.setItem('ruangtenang_theme', activeTheme);
    }, theme);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20_000 });
      const conversation = page.getByRole('log', { name: 'Percakapan RuangKerja' });
      await expect(conversation).toBeVisible();
      await expect.poll(() => conversation.evaluate(element => getComputedStyle(element).overflowY)).toBe('auto');
      await page.waitForTimeout(150);
      if (width >= 1280) await page.waitForTimeout(1_200);
      if (await closeNotification.isVisible()) await closeNotification.click();
      const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
      expect(dimensions.content, `horizontal overflow at ${width}px (${theme})`).toBeLessThanOrEqual(dimensions.viewport + 1);
      const directory = path.join('test-artifacts', 'workspace-layout', phase, theme);
      await mkdir(directory, { recursive: true });
      await page.screenshot({ path: path.join(directory, `${width}px.png`), animations: 'disabled', fullPage: false, scale: 'css' });
      if (width >= 1280) {
        await page.getByRole('button', { name: 'Buka Canvas', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Tutup Canvas', exact: true })).toBeVisible();
        await page.screenshot({ path: path.join(directory, `${width}px-chat-canvas.png`), animations: 'disabled', fullPage: false, scale: 'css' });
        await page.getByRole('button', { name: 'Tutup Canvas', exact: true }).click();
      }
    }
  }
});

test('keeps one contextual inspector active while switching its tabs', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/workspace/new?__test__=true', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Panel', exact: true }).click();
  await page.getByRole('tab', { name: 'Memori' }).click();
  await expect(page.getByRole('tabpanel', { name: 'Memori Workspace' })).toBeVisible();
  await page.getByRole('tab', { name: /^File/ }).click();
  await expect(page.getByRole('tabpanel', { name: 'File Workspace' })).toBeVisible();
  await expect(page.getByRole('tabpanel', { name: 'Memori Workspace' })).toBeHidden();
  await page.getByRole('button', { name: 'Tutup panel' }).click();
  await expect(page.getByRole('button', { name: 'Panel', exact: true })).toBeFocused();
});

test('panel switching retains chat draft and prevents modal overlap on mobile', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rt_onboarding_completed_guest', 'true');
    localStorage.setItem('ruangtenang_last_seen_version', 'v3.4.0');
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/workspace/new?__test__=true', { waitUntil: 'domcontentloaded' });

  const closeNotification = page.getByRole('button', { name: 'Tutup Notifikasi' });
  if (await closeNotification.isVisible()) await closeNotification.click();

  const composerInput = page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' });
  await expect(composerInput).toBeVisible({ timeout: 20_000 });

  // 1. Enter draft text in composer
  await composerInput.fill('Draf pesan penting untuk analisis literatur mahasiswa.');

  // 2. Switch to Canvas tab on mobile
  await page.getByRole('button', { name: 'Canvas', exact: true }).click();
  await expect(page.getByText('Belum Ada Artefak Aktif')).toBeVisible();

  // Close canvas drawer via Tutup button
  await page.getByRole('button', { name: 'Kembali ke Obrolan' }).click();
  await expect(composerInput).toBeVisible();

  // 3. Switch to Panel tab on mobile
  await page.getByRole('button', { name: 'Panel', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Konteks' })).toBeVisible();

  // 4. Switch back to Chat (Obrolan) tab
  await page.getByRole('button', { name: 'Obrolan', exact: true }).click();
  await expect(composerInput).toBeVisible();

  // 5. Verify draft content was completely preserved without data loss
  await expect(composerInput).toHaveValue('Draf pesan penting untuk analisis literatur mahasiswa.');
});

