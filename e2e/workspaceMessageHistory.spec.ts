import { expect, test } from '@playwright/test';

test('loads older Workspace messages by cursor and keeps the current row anchored', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const now = Date.now();
  const currentPage = Array.from({ length: 50 }, (_, index) => ({
    id: `current-${index}`,
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `Pesan terbaru ${index + 1}`,
    createdAt: new Date(now - (50 - index) * 60_000).toISOString()
  }));
  const olderPage = Array.from({ length: 10 }, (_, index) => ({
    id: `older-${index}`,
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `Pesan sebelumnya ${index + 1}`,
    createdAt: new Date(now - (60 - index) * 60_000).toISOString()
  }));
  const messageRequests: string[] = [];

  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === '/api/v1/chat/e2e-workspace/messages') {
      messageRequests.push(url.href);
      await route.fulfill({ json: url.searchParams.has('cursor')
        ? { data: olderPage, nextCursor: null }
        : { data: currentPage, nextCursor: 'cursor-older' } });
    } else if (path === '/api/v1/workspace/artifacts') {
      await route.fulfill({ json: { success: true, data: [] } });
    } else if (path === '/api/v1/workspace/e2e-workspace') {
      await route.fulfill({ json: { success: true, data: {
        chatId: 'e2e-workspace', name: 'History Test Workspace', description: '', instructions: '', tasks: [], plan: null,
        createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString()
      } } });
    } else {
      await route.fulfill({ json: { success: true, data: [] } });
    }
  });

  await page.goto('/e2e/workspace-message-history.html#/workspace/c/e2e-workspace', { waitUntil: 'domcontentloaded' });
  const rows = page.locator('[data-workspace-message-id]');
  await expect(rows).toHaveCount(50);
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  const log = page.getByRole('log', { name: 'Percakapan RuangKerja' });
  await log.evaluate(element => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  const anchor = page.locator('[data-workspace-message-id="current-0"]');
  const beforeTop = (await anchor.boundingBox())!.y;

  await page.getByRole('button', { name: 'Muat pesan sebelumnya' }).click();

  await expect(rows).toHaveCount(60);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('button', { name: 'Muat pesan sebelumnya' })).toHaveCount(0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  expect(await rows.first().getAttribute('data-workspace-message-id')).toBe('older-0');
  const afterTop = (await anchor.boundingBox())!.y;
  expect(Math.abs(afterTop - beforeTop)).toBeLessThan(2);
  expect(messageRequests).toHaveLength(2);
  expect(new URL(messageRequests[1]).searchParams.get('cursor')).toBe('cursor-older');
});
