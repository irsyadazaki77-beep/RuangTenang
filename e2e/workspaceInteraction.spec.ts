import { expect, test } from '@playwright/test';

test.describe('Workspace navigation and responsive shell', () => {
  test('command palette opens and closes the actual Canvas inspector', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/workspace/c/e2e-workspace?__test__=true');
    await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20000 });

    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog', { name: 'Command Palette' });
    await expect(palette).toBeVisible();
    await page.getByRole('button', { name: /Buka Canvas/ }).click();

    await expect(palette).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Canvas' })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Canvas' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('loads the academic template gallery when requested', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
    await page.goto('/workspace/new?__test__=true', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'AI & Opsi' }).click();
    const options = page.getByRole('dialog', { name: 'AI & Opsi' });
    await options.getByRole('button', { name: 'Template', exact: true }).click();
    const gallery = page.getByRole('dialog', { name: 'Galeri Template Akademik' });
    await expect(gallery).toBeVisible();
    await expect(gallery.getByRole('button', { name: /Draf Bab 1/ })).toBeVisible();
  });

  test('keeps the workspace inside common viewport widths', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/workspace/new?__test__=true');
      await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20000 });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(width + 1);
    }
  });

  test('keeps composer controls reachable and context legible on narrow screens', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
    for (const width of [320, 375]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto('/workspace/new?__test__=true', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20_000 });

      const controls = [
        page.getByRole('button', { name: 'Lampirkan dokumen atau kode' }),
        page.getByRole('button', { name: /^Pilih model,/ }),
        page.getByRole('button', { name: /^Buka panel konteks:/ }),
        page.getByRole('button', { name: 'AI & Opsi' }),
        page.getByRole('button', { name: 'Kirim Pesan' })
      ];
      for (const control of controls) await expect(control).toBeVisible();

      const bounds = await Promise.all(controls.map(control => control.boundingBox()));
      expect(bounds.every(box => box && box.width >= 32 && box.x + box.width <= width + 1), JSON.stringify({ width, bounds })).toBe(true);
      await expect(controls[2]).toHaveAttribute('aria-label', 'Buka panel konteks: Konteks kosong');
      await controls[3].click();
      const options = page.getByRole('dialog', { name: 'AI & Opsi' });
      await expect(options.getByText(/Konteks tambahan untuk pesan berikutnya:/)).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('restores a guest Canvas draft with an honest local-only save status', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(() => {
      const initializedKey = '__workspace_e2e_storage_initialized';
      if (sessionStorage.getItem(initializedKey) === 'true') return;
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem(initializedKey, 'true');
      localStorage.setItem('rt_onboarding_completed_guest', 'true');
      localStorage.setItem('ruangtenang_last_seen_version', 'v3.4.0');
      sessionStorage.setItem('rt_guest_ai_consent', 'true');
    });
    await page.route('**/api/v1/chat/stream', async route => {
      const payload = route.request().postDataJSON();
      expect(payload.chatMode).toBe('RuangKerja');
      expect(payload.message).toContain('Ringkas hasil survei ini');
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream; charset=utf-8' },
        body: 'data: {"text":"Fixture jawaban untuk Canvas."}\n\ndata: [DONE]\n\n'
      });
    });

    await page.goto('/workspace/new?__test__=true', { waitUntil: 'domcontentloaded' });
    const composer = page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' });
    await expect(composer).toBeVisible({ timeout: 20_000 });
    await composer.fill('Ringkas hasil survei ini');
    await page.getByRole('button', { name: 'Kirim Pesan' }).click();
    await expect(page.getByText('Fixture jawaban untuk Canvas.')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Hentikan respons' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Kirim ke Canvas' }).last().click();
    await expect(page.getByRole('button', { name: 'Jawaban AI', exact: true })).toBeVisible({ timeout: 15_000 });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(composer).toBeVisible({ timeout: 20_000 });
    const openCanvas = page.getByRole('button', { name: 'Buka Canvas', exact: true });
    await expect(openCanvas).toBeVisible();
    await openCanvas.click();
    await expect(page.getByRole('button', { name: 'Jawaban AI', exact: true })).toBeVisible();
    await expect(page.getByText('Fixture jawaban untuk Canvas.')).toBeVisible();
    await expect(page.getByText(/Draf lokal tab ini \(belum tersimpan ke server\)/)).toBeVisible();
  });
});
