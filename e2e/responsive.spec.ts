import { test, expect } from '@playwright/test';

test.describe('Responsive Layout E2E', () => {
  const viewports = [
    { width: 320, height: 568, name: 'Mobile 320px' },
    { width: 375, height: 812, name: 'Mobile 375px' },
    { width: 768, height: 1024, name: 'Tablet 768px' },
    { width: 1440, height: 900, name: 'Desktop 1440px' }
  ];

  for (const vp of viewports) {
    test(`Viewport: ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/?__test__=true');
      await expect(page.locator('textarea')).toBeVisible();
    });
  }
});
