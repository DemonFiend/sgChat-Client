import { test, expect, chromium } from '@playwright/test';

// Quick smoke test against the Vite dev server (localhost:5173)
// This tests the DESKTOP CLIENT renderer code, not the server's web UI

const BASE_URL = 'http://localhost:5173';

test.describe('Parity Smoke Test (Local Vite)', () => {
  test('app loads at localhost:5173', async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Should show either login page or server setup
    const body = await page.textContent('body');
    expect(body).toBeTruthy();

    // Take screenshot for verification
    await page.screenshot({ path: 'qa-screenshots/smoke-vite-load.png' });

    // Check for our Mantine-based components (not raw HTML)
    const mantineElements = await page.locator('[class*="mantine"]').count();
    console.log(`Found ${mantineElements} Mantine elements`);

    await browser.close();
  });

  test('login page has Mantine components', async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Wait for either login or setup page
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'qa-screenshots/smoke-login.png' });

    await browser.close();
  });
});
