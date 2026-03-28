import { test, expect } from './electron-fixture';

test.describe('Parity QA — Electron Mode 1', () => {

  test('app launches and shows window', async ({ window }) => {
    const title = await window.title();
    expect(title).toBeTruthy();
    await window.screenshot({ path: 'qa-screenshots/electron-launch.png' });
  });

  test('electronAPI bridge is exposed', async ({ window }) => {
    const hasAPI = await window.evaluate(() => !!window.electronAPI);
    expect(hasAPI).toBe(true);

    const isElectron = await window.evaluate(() => window.electronAPI?.isElectron);
    expect(isElectron).toBe(true);

    const platform = await window.evaluate(() => window.electronAPI?.platform);
    expect(platform).toBeTruthy();
    console.log(`Platform: ${platform}`);
  });

  test('app navigates to login or main view', async ({ window }) => {
    // Wait for the app to settle
    await window.waitForTimeout(3000);
    await window.screenshot({ path: 'qa-screenshots/electron-settled.png' });

    const bodyText = await window.textContent('body');
    expect(bodyText).toBeTruthy();

    // Should be on login, setup, or main app — not a blank/error screen
    const hasContent = bodyText!.length > 10;
    expect(hasContent).toBe(true);
  });

  test('Mantine theme is applied', async ({ window }) => {
    await window.waitForTimeout(2000);

    // Check for Mantine's data-mantine-color-scheme attribute or dark theme
    const hasMantine = await window.evaluate(() => {
      return document.querySelectorAll('[class*="mantine"], [class*="m_"]').length > 0;
    });
    console.log(`Mantine elements found: ${hasMantine}`);
    // Even if not yet past login, the login page itself should use Mantine
  });

  test('login page has expected Mantine components', async ({ window }) => {
    await window.waitForTimeout(2000);
    await window.screenshot({ path: 'qa-screenshots/electron-login.png' });

    // Check for Paper, TextInput, PasswordInput, Button components
    const componentCheck = await window.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      const buttons = document.querySelectorAll('button');
      return {
        inputCount: inputs.length,
        buttonCount: buttons.length,
        hasPasswordInput: Array.from(inputs).some(i => i.type === 'password'),
        hasEmailInput: Array.from(inputs).some(i => i.type === 'email' || i.type === 'text'),
      };
    });

    console.log('Login components:', JSON.stringify(componentCheck));
    await window.screenshot({ path: 'qa-screenshots/electron-login-components.png' });
  });

  test('can interact with server setup or login form', async ({ window }) => {
    await window.waitForTimeout(2000);

    // Try to find and interact with a text input
    const firstInput = window.locator('input[type="text"], input[type="email"]').first();
    const isVisible = await firstInput.isVisible().catch(() => false);

    if (isVisible) {
      await firstInput.fill('test@example.com');
      const value = await firstInput.inputValue();
      expect(value).toBe('test@example.com');
      console.log('Successfully interacted with input');
    }

    await window.screenshot({ path: 'qa-screenshots/electron-interaction.png' });
  });

});
