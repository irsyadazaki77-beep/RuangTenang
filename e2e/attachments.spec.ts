import { expect, test } from '@playwright/test';

test.describe('Workspace attachment context', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('rt_onboarding_completed_guest', 'true'));
    await page.goto('/workspace/new?__test__=true');
    await expect(page.getByRole('textbox', { name: 'Pesan untuk Asisten RuangKerja' })).toBeVisible({ timeout: 20_000 });
  });

  test('uploads a supported document, marks it ready, and removes it', async ({ page }) => {
    const fileName = 'research-notes.txt';
    await page.locator('input[type="file"]').first().setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from('Research notes for a workspace upload acceptance check.'),
    });

    const fileList = page.getByRole('list', { name: 'Dokumen aktif Workspace' });
    const fileRow = fileList.getByRole('listitem').filter({ hasText: fileName });
    await expect(fileRow).toBeVisible();
    await expect(fileRow.getByText('Siap', { exact: true })).toBeVisible({ timeout: 20_000 });

    await fileRow.getByRole('button', { name: `Hapus ${fileName}` }).click();
    await expect(fileRow).toHaveCount(0);
  });

  test('shows a clear failure state for a file larger than 5 MB', async ({ page }) => {
    const fileName = 'oversize_test.pdf';
    const oversizedPdf = Buffer.alloc(6 * 1024 * 1024, 'a');
    oversizedPdf.write('%PDF-1.4\n', 0, 'ascii');
    await page.locator('input[type="file"]').first().setInputFiles({
      name: fileName,
      mimeType: 'application/pdf',
      buffer: oversizedPdf,
    });

    const fileRow = page.getByRole('list', { name: 'Dokumen aktif Workspace' })
      .getByRole('listitem')
      .filter({ hasText: fileName });
    await expect(fileRow).toBeVisible();
    await expect(fileRow.getByText('Gagal', { exact: true })).toBeVisible();
  });
});
