import { expect, test } from '@playwright/test';

test('renders a large artifact version comparison in the browser', async ({ browser }) => {
  const samples: Array<{ renderMs: number; afterTwoFramesMs: number; initialRowCount: number; maxLongTaskMs: number }> = [];

  for (let index = 0; index < 3; index += 1) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/e2e/artifact-diff-performance.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (window as Window & { __artifactDiffReady?: boolean }).__artifactDiffReady === true);
    const afterTwoFramesMs = await page.evaluate(() => new Promise<number>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
      const browserWindow = window as Window & { __artifactDiffStartedAt?: number };
      resolve(performance.now() - (browserWindow.__artifactDiffStartedAt || 0));
    }))));
    await page.waitForTimeout(100);

    const metrics = await page.evaluate(afterTwoFramesMs => {
      const browserWindow = window as Window & { __artifactDiffLongTasks?: number[] };
      const longTasks = browserWindow.__artifactDiffLongTasks || [];
      return {
        renderMs: Number(document.body.dataset.diffRenderMs),
        afterTwoFramesMs,
        initialRowCount: Number(document.body.dataset.diffRows),
        maxLongTaskMs: Math.max(0, ...longTasks)
      };
    }, afterTwoFramesMs);

    samples.push(metrics);
    expect(await page.getByText('Perbandingan Versi: v2 vs v1').count()).toBe(1);
    expect(metrics.initialRowCount).toBe(250);
    expect(await page.getByRole('note').count()).toBe(0);
    await page.getByRole('combobox', { name: 'Halaman perbandingan' }).selectOption('14');
    await expect(page.getByText('Isi baru 1199')).toBeVisible();
    expect(await page.locator('div.flex.items-start.gap-2').count()).toBe(100);
    await context.close();
  }

  console.info(`Artifact diff browser probe (3 fresh contexts): ${JSON.stringify(samples)}`);
});
