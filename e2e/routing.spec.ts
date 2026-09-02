import { test, expect } from '@playwright/test';

test.describe('Routing E2E', () => {
  const routes = [
    { path: '/', expectedText: 'Halo' }, // Matches placeholder greeting
    { path: '/mood', expectedText: 'Log Mood Harian' },
    { path: '/screening', expectedText: 'Cek Kondisi Mental' },
    { path: '/counselors', expectedText: 'Direktori Konselor' },
    { path: '/emergency', expectedText: 'Pusat Krisis' },
  ];

  for (const r of routes) {
    test(`Route ${r.path} loads`, async ({ page }) => {
      await page.goto(r.path + (r.path.includes('?') ? '&' : '?') + '__test__=true');
      // use a regex or check title/content
      await expect(page.locator('body')).toContainText(r.expectedText, { ignoreCase: true });
    });
  }

  test('Unknown route redirects', async ({ page }) => {
    await page.goto('/unknown-route-123?__test__=true');
    await page.waitForURL('**/');
    await expect(page).toHaveURL(/.*(?:localhost|127\.0\.0\.1|ruangtenang).*/);
  });
});
