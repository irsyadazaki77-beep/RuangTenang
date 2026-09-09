const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
  });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' }).catch(() => {});
  console.log(errors.join('\n'));
  await browser.close();
})();
