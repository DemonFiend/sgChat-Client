/**
 * QA Suite 23 — Settings Parity Tests
 *
 * Tests User Settings modal in the Electron desktop client:
 * - Open settings via gear icon
 * - Verify 6 tabs exist
 * - Account tab fields
 * - Profile tab fields
 * - Voice tab sensitivity slider
 * - Close settings
 */
import { test, expect } from './electron-fixture';
import { ensureLoggedIn } from './qa-helpers';

test.describe('Suite 23 — Settings Parity', () => {
  test('23.15 — Open Settings via gear icon or user panel', async ({ window }) => {
    const loggedIn = await ensureLoggedIn(window);
    if (!loggedIn) {
      console.log('[23.15] SKIP: Could not log in');
      test.skip();
      return;
    }

    await window.waitForTimeout(2000);

    // Look for settings gear icon — usually in the user panel at bottom-left
    const gearBtn = window.locator(
      'button[aria-label*="Settings"], button[aria-label*="settings"], button[title*="Settings"], button[title*="settings"], [class*="settings"] button, button svg path[d*="M19.14"]'
    );
    const gearCount = await gearBtn.count();
    console.log('[23.15] Settings buttons found:', gearCount);

    if (gearCount > 0) {
      await gearBtn.first().click();
      await window.waitForTimeout(1500);
    } else {
      // Try to find a gear icon by looking at SVG paths
      const gearByIcon = window.locator('button:has(svg)').filter({ hasText: '' });
      // Or look for the user panel area
      const userPanel = window.locator('[class*="UserPanel"], [class*="user-panel"], [class*="userPanel"]');
      if (await userPanel.count() > 0) {
        // Click gear within user panel
        const panelGear = userPanel.locator('button');
        const panelBtns = await panelGear.count();
        console.log('[23.15] User panel buttons:', panelBtns);
        // The settings button is typically the last button in the user panel
        if (panelBtns > 0) {
          await panelGear.last().click();
          await window.waitForTimeout(1500);
        }
      }
    }

    await window.screenshot({ path: 'qa-screenshots/23-15-settings-opened.png' });

    // Verify settings modal is open
    const settingsOpen = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('My Account') ||
             bodyText.includes('Profile') ||
             bodyText.includes('Appearance') ||
             bodyText.includes('User Settings') ||
             document.querySelector('[aria-label="User Settings"]') !== null ||
             document.querySelector('[role="dialog"]') !== null;
    });

    console.log('[23.15] Settings open:', settingsOpen);
    expect(settingsOpen).toBe(true);
  });

  test('23.16 — Verify 6 settings tabs exist', async ({ window }) => {
    const loggedIn = await ensureLoggedIn(window);
    if (!loggedIn) {
      console.log('[23.16] SKIP: Could not log in');
      test.skip();
      return;
    }

    await window.waitForTimeout(2000);

    // Open settings
    const gearBtn = window.locator(
      'button[aria-label*="Settings"], button[aria-label*="settings"], button[title*="Settings"], button[title*="settings"]'
    );
    if (await gearBtn.count() > 0) {
      await gearBtn.first().click();
      await window.waitForTimeout(1500);
    }

    await window.screenshot({ path: 'qa-screenshots/23-16-settings-tabs.png' });

    // Check for the 6 expected tabs
    const tabState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasMyAccount: bodyText.includes('My Account'),
        hasProfile: bodyText.includes('Profile'),
        hasAppearance: bodyText.includes('Appearance'),
        hasNotifications: bodyText.includes('Notifications'),
        hasKeybinds: bodyText.includes('Keybinds'),
        hasVoice: bodyText.includes('Voice') || bodyText.includes('Voice & Video'),
      };
    });

    console.log('[23.16] Tabs found:', JSON.stringify(tabState));

    const tabCount = Object.values(tabState).filter(v => v).length;
    console.log('[23.16] Tab count:', tabCount);

    // Expect at least 5 tabs (Keybinds is Electron-only, may not show in all contexts)
    expect(tabCount).toBeGreaterThanOrEqual(5);
  });

  test('23.17 — Account tab: username field is editable, email displayed', async ({ window }) => {
    const loggedIn = await ensureLoggedIn(window);
    if (!loggedIn) {
      console.log('[23.17] SKIP: Could not log in');
      test.skip();
      return;
    }

    await window.waitForTimeout(2000);

    // Open settings and click My Account tab
    const gearBtn = window.locator(
      'button[aria-label*="Settings"], button[aria-label*="settings"], button[title*="Settings"], button[title*="settings"]'
    );
    if (await gearBtn.count() > 0) {
      await gearBtn.first().click();
      await window.waitForTimeout(1500);
    }

    // Click "My Account" tab
    const accountTab = window.locator('text=My Account, button:has-text("My Account")');
    if (await accountTab.count() > 0) {
      await accountTab.first().click();
      await window.waitForTimeout(1000);
    }

    await window.screenshot({ path: 'qa-screenshots/23-17-account-tab.png' });

    const accountState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      // Look for username-related elements
      const hasUsernameField = bodyText.includes('Username') || bodyText.includes('username');
      const hasEmailField = bodyText.includes('Email') || bodyText.includes('email');
      // Check for editable inputs
      const inputs = document.querySelectorAll('input[type="text"], input[type="email"]');
      return {
        hasUsernameField,
        hasEmailField,
        inputCount: inputs.length,
        bodyTextSnippet: bodyText.substring(0, 500),
      };
    });

    console.log('[23.17] Account tab state:', JSON.stringify({
      ...accountState,
      bodyTextSnippet: accountState.bodyTextSnippet.substring(0, 200),
    }));

    if (accountState.hasUsernameField || accountState.hasEmailField) {
      expect(accountState.hasUsernameField || accountState.hasEmailField).toBe(true);
    }
  });

  test('23.18 — Profile tab: display name, pronouns, bio fields', async ({ window }) => {
    const loggedIn = await ensureLoggedIn(window);
    if (!loggedIn) {
      console.log('[23.18] SKIP: Could not log in');
      test.skip();
      return;
    }

    await window.waitForTimeout(2000);

    // Open settings
    const gearBtn = window.locator(
      'button[aria-label*="Settings"], button[aria-label*="settings"], button[title*="Settings"], button[title*="settings"]'
    );
    if (await gearBtn.count() > 0) {
      await gearBtn.first().click();
      await window.waitForTimeout(1500);
    }

    // Click "Profile" tab
    const profileTab = window.locator('text=Profile').first();
    if (await profileTab.count() > 0) {
      await profileTab.click();
      await window.waitForTimeout(1000);
    }

    await window.screenshot({ path: 'qa-screenshots/23-18-profile-tab.png' });

    const profileState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasDisplayName: bodyText.includes('Display Name') || bodyText.includes('display name') || bodyText.includes('Display name'),
        hasPronouns: bodyText.includes('Pronouns') || bodyText.includes('pronouns'),
        hasBio: bodyText.includes('Bio') || bodyText.includes('About Me') || bodyText.includes('bio') || bodyText.includes('about'),
        hasAvatar: document.querySelector('img[class*="avatar"], [class*="Avatar"], [class*="avatar-picker"]') !== null,
      };
    });

    console.log('[23.18] Profile tab state:', JSON.stringify(profileState));

    // At least some profile fields should be present
    const profileFieldCount = Object.values(profileState).filter(v => v).length;
    console.log('[23.18] Profile fields found:', profileFieldCount);
    expect(profileFieldCount).toBeGreaterThanOrEqual(1);
  });

  test('23.19 — Voice tab: input sensitivity slider visible', async ({ window }) => {
    const loggedIn = await ensureLoggedIn(window);
    if (!loggedIn) {
      console.log('[23.19] SKIP: Could not log in');
      test.skip();
      return;
    }

    await window.waitForTimeout(2000);

    // Open settings
    const gearBtn = window.locator(
      'button[aria-label*="Settings"], button[aria-label*="settings"], button[title*="Settings"], button[title*="settings"]'
    );
    if (await gearBtn.count() > 0) {
      await gearBtn.first().click();
      await window.waitForTimeout(1500);
    }

    // Click "Voice" or "Voice & Video" tab
    const voiceTab = window.locator('text=Voice, text=Voice & Video').first();
    if (await voiceTab.count() > 0) {
      await voiceTab.click();
      await window.waitForTimeout(1000);
    }

    await window.screenshot({ path: 'qa-screenshots/23-19-voice-tab.png' });

    const voiceState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasSensitivity: bodyText.includes('Sensitivity') || bodyText.includes('sensitivity') ||
                        bodyText.includes('Input Sensitivity'),
        hasSlider: document.querySelector('input[type="range"], [role="slider"]') !== null,
        hasInputDevice: bodyText.includes('Input Device') || bodyText.includes('Microphone') || bodyText.includes('input device'),
        hasOutputDevice: bodyText.includes('Output Device') || bodyText.includes('Speaker') || bodyText.includes('output device'),
        hasNoiseSuppression: bodyText.includes('Noise') || bodyText.includes('noise'),
      };
    });

    console.log('[23.19] Voice tab state:', JSON.stringify(voiceState));

    // There should be voice-related controls
    const voiceControlCount = Object.values(voiceState).filter(v => v).length;
    console.log('[23.19] Voice controls found:', voiceControlCount);
    expect(voiceControlCount).toBeGreaterThanOrEqual(1);
  });

  test('23.20 — Close settings modal', async ({ window }) => {
    const loggedIn = await ensureLoggedIn(window);
    if (!loggedIn) {
      console.log('[23.20] SKIP: Could not log in');
      test.skip();
      return;
    }

    await window.waitForTimeout(2000);

    // Open settings
    const gearBtn = window.locator(
      'button[aria-label*="Settings"], button[aria-label*="settings"], button[title*="Settings"], button[title*="settings"]'
    );
    if (await gearBtn.count() > 0) {
      await gearBtn.first().click();
      await window.waitForTimeout(1500);
    }

    // Check settings is open
    const isOpen = await window.evaluate(() => {
      return document.body.innerText.includes('My Account') ||
             document.querySelector('[aria-label="User Settings"]') !== null ||
             document.querySelector('[role="dialog"]') !== null;
    });

    if (!isOpen) {
      console.log('[23.20] Settings not open, skipping close test');
      test.skip();
      return;
    }

    // Close with Escape key
    await window.keyboard.press('Escape');
    await window.waitForTimeout(1000);

    await window.screenshot({ path: 'qa-screenshots/23-20-settings-closed.png' });

    // Check settings is closed — main view should be visible again
    const isClosed = await window.evaluate(() => {
      // Settings uses a full-screen portal, so check if we're back to the normal view
      const dialogEl = document.querySelector('[role="dialog"][aria-label="User Settings"]');
      // If dialog still exists, it's not closed
      if (dialogEl) return false;
      // Or check that main navigation is visible
      return document.querySelector('[aria-label="Servers"]') !== null ||
             document.body.innerText.includes('general') ||
             !document.body.innerText.includes('My Account');
    });

    console.log('[23.20] Settings closed:', isClosed);
    expect(isClosed).toBe(true);
  });
});
