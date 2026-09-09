const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    logs.push(`[pageerror] ${err.message}`);
  });
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    logs.push(`[goto error] ${e.message}`);
  }
  console.log("---- LOGS ----");
  console.log(logs.join('\n'));
  console.log("--------------");
  await browser.close();
})();
