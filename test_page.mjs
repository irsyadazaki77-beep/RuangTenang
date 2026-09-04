import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`BROWSER CONSOLE [${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', error => {
    console.log('BROWSER PAGE ERROR:', error.message);
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`HTTP ${response.status()} - ${response.url()}`);
    }
  });

  try {
    await page.goto('https://ruangtenang.ai.studio', { waitUntil: 'networkidle' });
    console.log('Page loaded successfully');
    
    // Dump HTML just in case
    const content = await page.content();
    console.log("HTML length:", content.length);
    if (content.includes('Ups, Terjadi Kendala Tampilan')) {
        console.log("ErrorBoundary is visible.");
    }
  } catch (e) {
    console.error('Error navigating:', e);
  } finally {
    await browser.close();
  }
})();
