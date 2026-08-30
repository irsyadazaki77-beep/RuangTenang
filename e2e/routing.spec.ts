import { test, expect } from '@playwright/test';

test.describe('Routing E2E', () => {
  const routes = [
    { path: '/', expectedText: 'Halo' }, // Matches placeholder greeting
    { path: '/mood', expectedText: 'Pelacak Suasana Hati' },
    { path: '/screening', expectedText: 'Skrining Mandiri' },
    { path: '/counselors', expectedText: 'Direktori Konselor' },
    { path: '/emergency', expectedText: 'Pusat Bantuan Darurat' },
  ];

  for (const r of routes) {
    test(`Route ${r.path} loads`, async ({ page }) => {
      await page.goto(r.path);
      // use a regex or check title/content
      await expect(page.locator('body')).toContainText(r.expectedText, { ignoreCase: true });
    });
  }

  test('Unknown route redirects', async ({ page }) => {
    await page.goto('/unknown-route-123');
    await page.waitForURL('**/');
    await expect(page).toHaveURL(/.*(?:localhost|127\.0\.0\.1|ruangtenang).*/);
  });
});
