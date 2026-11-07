import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

test('workspace layout captures and viewport safety', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
  const phase = process.env.WORKSPACE_CAPTURE_PHASE === 'baseline' ? 'before' : 'after';
  const widths = [320, 360, 375, 390, 768, 1024, 1280, 1440, 1920];
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
      await expect(page.getByRole('heading', { name: 'Apa yang ingin kamu kerjakan?' })).toBeVisible();
      await page.waitForTimeout(150);
      if (width >= 1280) await page.waitForTimeout(1_200);
      if (await closeNotification.isVisible()) await closeNotification.click();
      const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
      expect(dimensions.content, `horizontal overflow at ${width}px (${theme})`).toBeLessThanOrEqual(dimensions.viewport + 1);
      if (width < 768) {
        const sendTarget = await page.getByRole('button', { name: 'Kirim Pesan' }).boundingBox();
        expect(sendTarget?.width).toBeGreaterThanOrEqual(44);
        expect(sendTarget?.height).toBeGreaterThanOrEqual(44);
      }
      const directory = path.join(process.env.E2E_ARTIFACTS_DIR || 'test-artifacts', 'workspace-layout', phase, theme);
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

test('keeps the composer usable at 200% zoom', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/workspace/new?__test__=true', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20_000 });
  await page.evaluate(() => { document.documentElement.style.zoom = '200%'; });
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kirim Pesan' })).toBeVisible();
});

test('mobile sidebar navigation uses touch-sized controls', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/workspace/new?__test__=true', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Buka Sidebar Menu' }).click();
  const navButton = page.getByRole('button', { name: 'Beranda RuangKerja' });
  await expect(navButton).toBeVisible();
  const target = await navButton.boundingBox();
  expect(target?.height).toBeGreaterThanOrEqual(44);
});

test('theme tokens switch without opaque or transparent surface fallbacks', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
  await page.goto('/workspace/new?__test__=true', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20_000 });
  const readSurfaceTokens = () => page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const page = root.getPropertyValue('--rt-page').trim();
    const surface = root.getPropertyValue('--rt-surface').trim();
    const text = root.getPropertyValue('--rt-text-primary').trim();
    const secondary = root.getPropertyValue('--rt-text-secondary').trim();
    const muted = root.getPropertyValue('--rt-text-muted').trim();
    const focus = root.getPropertyValue('--rt-focus').trim();
    const parse = (color: string) => color.match(/[\da-f]{2}/gi)?.slice(-3).map(part => parseInt(part, 16) / 255) ?? [];
    const luminance = (color: string) => {
      const [r, g, b] = parse(color).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (foreground: string, background: string) => {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };
    return {
      page, surface, text,
      primaryContrast: contrast(text, surface),
      secondaryContrast: contrast(secondary, surface),
      mutedContrast: contrast(muted, surface),
      focusContrast: contrast(focus, surface),
    };
  });
  const light = await readSurfaceTokens();
  expect(light.page).toBe('#f8fafc');
  expect(light.surface).toBe('#ffffff');
  expect(light.text).toBe('#172033');
  expect(light.primaryContrast).toBeGreaterThanOrEqual(4.5);
  expect(light.secondaryContrast).toBeGreaterThanOrEqual(4.5);
  expect(light.mutedContrast).toBeGreaterThanOrEqual(4.5);
  expect(light.focusContrast).toBeGreaterThanOrEqual(3);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  const dark = await readSurfaceTokens();
  expect(dark.page).toBe('#0b0f14');
  expect(dark.surface).toBe('#151c24');
  expect(dark.text).toBe('#edf2f7');
  expect(dark.primaryContrast).toBeGreaterThanOrEqual(4.5);
  expect(dark.secondaryContrast).toBeGreaterThanOrEqual(4.5);
  expect(dark.mutedContrast).toBeGreaterThanOrEqual(4.5);
  expect(dark.focusContrast).toBeGreaterThanOrEqual(3);
  await page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' }).focus();
  await expect(page.locator('[data-aurora-variant="kerja"]')).toHaveAttribute('data-aurora-paused', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-aurora-variant="kerja"]')).toHaveAttribute('data-aurora-paused', 'true');
});

test('keeps one contextual inspector active while switching its tabs', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/workspace/new?__test__=true', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Panel', exact: true }).click();
  const contextTab = page.getByRole('tab', { name: 'Konteks' });
  await contextTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /^File/ })).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'File Workspace' })).toBeVisible();
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

