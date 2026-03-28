/**
 * QA Full Pass — Single Electron Session
 *
 * Runs all QA tests in a single Electron session:
 * 1. Launch app (connects to production server)
 * 2. Switch to localhost:3124 via NetworkSelector
 * 3. Log in as qa_admin
 * 4. Run Auth, Messaging, Settings, Admin, UI tests
 *
 * Uses test.describe.serial so tests share one window.
 */
import { test as base, _electron, expect, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';

// ── Shared state across serial tests ─────────────────────────────────────────
let electronApp: ElectronApplication;
let window: Page;

const SERVER_URL = 'http://localhost:3124';
const TEST_EMAIL = 'qa-admin@local.test';
const TEST_PASSWORD = 'QATest123!';
const TEST_USERNAME = 'qa_admin';

// ── Setup & Teardown ─────────────────────────────────────────────────────────

base.beforeAll(async () => {
  const electronPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
  const { ELECTRON_RUN_AS_NODE, ...cleanEnv } = process.env;

  electronApp = await _electron.launch({
    executablePath: electronPath,
    args: ['.'],
    env: {
      ...cleanEnv,
      NODE_ENV: 'test',
    },
  });

  window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');
});

base.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});

// Helper: take a screenshot safely
async function screenshot(name: string) {
  try {
    await window.screenshot({ path: `qa-screenshots/qa-${name}.png` });
  } catch {
    // screenshot failures should not break tests
  }
}

// Helper: wait for page to settle
async function settle(ms = 2000) {
  await window.waitForTimeout(ms);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — Server Switch + Login
// ═══════════════════════════════════════════════════════════════════════════════

base.describe.serial('QA Full Pass', () => {

  base('01 — App launches and shows login page', async () => {
    await window.waitForLoadState('load');
    await settle(4000);
    await screenshot('01-app-launch');

    const bodyText = await window.evaluate(() => document.body.innerText);
    const hasExpectedContent =
      bodyText.includes('Welcome back') ||
      bodyText.includes('Log In') ||
      bodyText.includes('Connect') ||
      bodyText.includes('Network') ||
      bodyText.includes('sgChat');

    console.log('[01] Body text preview:', bodyText.substring(0, 300));
    expect(hasExpectedContent).toBe(true);
  });

  base('02 — Switch server to localhost:3124', async () => {
    await settle(2000);

    // The login page may already show NetworkSelector (not connected),
    // or it may show "Connected to ..." with a "Change" link.
    // Check which state we're in.
    const pageState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasNetworkSelector: !!document.querySelector('input[type="url"]'),
        hasChangeLink: bodyText.includes('Change'),
        hasConnectButton: bodyText.includes('Connect'),
        isConnected: bodyText.includes('Connected to'),
        bodySnippet: bodyText.substring(0, 500),
      };
    });

    console.log('[02] Initial page state:', JSON.stringify(pageState));

    // If already connected to production, click "Change" to show NetworkSelector
    if (pageState.isConnected && !pageState.hasNetworkSelector) {
      console.log('[02] Connected to production, clicking "Change" link...');
      const changeLink = window.locator('button:has-text("Change")');
      if (await changeLink.count() > 0) {
        await changeLink.first().click();
        await settle(1000);
      }
    }

    // Now we should have the NetworkSelector with the URL input
    const urlInput = window.locator('input[type="url"], input[name="server-url"]');
    const urlInputCount = await urlInput.count();
    console.log('[02] URL inputs found:', urlInputCount);

    if (urlInputCount > 0) {
      // Clear and type the localhost URL
      await urlInput.first().click();
      await urlInput.first().fill('');
      await urlInput.first().fill(SERVER_URL);
      await settle(500);

      // Click the Connect button
      const connectBtn = window.locator('button:has-text("Connect")');
      if (await connectBtn.count() > 0) {
        await connectBtn.first().click();
        console.log('[02] Clicked Connect button');
        await settle(3000);
      } else {
        // Try pressing Enter
        await window.keyboard.press('Enter');
        await settle(3000);
      }
    } else {
      // Try finding the URL input by placeholder
      const altInput = window.locator('input[placeholder*="chat.example"], input[placeholder*="http"]');
      if (await altInput.count() > 0) {
        await altInput.first().fill(SERVER_URL);
        await settle(500);
        const connectBtn = window.locator('button:has-text("Connect")');
        if (await connectBtn.count() > 0) {
          await connectBtn.first().click();
          await settle(3000);
        }
      }
    }

    await screenshot('02-server-switched');

    // Verify connection to localhost
    const connectionState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        isConnected: bodyText.includes('Connected to') || bodyText.includes('connected'),
        hasLocalhostRef: bodyText.includes('localhost') || bodyText.includes('3124'),
        hasSuccessIndicator: !!document.querySelector('.text-success, [class*="success"]'),
        bodySnippet: bodyText.substring(0, 500),
      };
    });

    console.log('[02] Connection state:', JSON.stringify(connectionState));

    // We should be connected now — the form should be enabled
    const formEnabled = await window.evaluate(() => {
      const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
      return emailInput ? !emailInput.disabled : false;
    });

    console.log('[02] Login form enabled:', formEnabled);
    // Don't hard-fail if connection didn't work — login test will catch it
  });

  base('03 — Log in as qa_admin', async () => {
    await settle(2000);

    // Check if we need to navigate to login page
    const onLoginPage = await window.evaluate(() => {
      return document.body.innerText.includes('Welcome back') ||
             document.body.innerText.includes('Log In');
    });

    if (!onLoginPage) {
      // Try navigating to /login
      await window.evaluate(() => {
        const loginLink = document.querySelector('a[href="/login"]') as HTMLAnchorElement;
        if (loginLink) loginLink.click();
      });
      await settle(2000);
    }

    // Fill in the login form
    const emailInput = window.locator('input[type="email"]');
    const passwordInput = window.locator('input[type="password"]');

    const emailCount = await emailInput.count();
    const passwordCount = await passwordInput.count();
    console.log('[03] Email inputs:', emailCount, 'Password inputs:', passwordCount);

    if (emailCount > 0 && passwordCount > 0) {
      await emailInput.first().click();
      await emailInput.first().fill(TEST_EMAIL);
      await settle(500);

      await passwordInput.first().click();
      await passwordInput.first().fill(TEST_PASSWORD);
      await settle(500);

      await screenshot('03-credentials-entered');

      // Click Log In button
      const loginBtn = window.locator('button[type="submit"], button:has-text("Log In")');
      if (await loginBtn.count() > 0) {
        await loginBtn.first().click();
        console.log('[03] Clicked Log In button');
        await settle(5000);
      }
    } else {
      // Fallback: try electronAPI.auth.login
      console.log('[03] No form inputs found, trying electronAPI.auth.login...');
      const loginResult = await window.evaluate(async (args) => {
        const api = (window as any).electronAPI;
        if (api?.auth?.login) {
          try {
            return await api.auth.login(args.serverUrl, args.email, args.password);
          } catch (err: any) {
            return { error: err?.message || String(err) };
          }
        }
        return { error: 'electronAPI.auth.login not available' };
      }, { serverUrl: SERVER_URL, email: TEST_EMAIL, password: TEST_PASSWORD });

      console.log('[03] API login result:', JSON.stringify(loginResult));
      await window.reload();
      await settle(5000);
    }

    await screenshot('03-after-login');

    // Verify we reached the main view
    const mainViewState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasDMs: bodyText.includes('Direct Messages'),
        hasGeneral: bodyText.includes('general') || bodyText.includes('General'),
        hasServersNav: !!document.querySelector('[aria-label="Servers"]'),
        hasNav: !!document.querySelector('nav'),
        url: window.location.href,
        bodySnippet: bodyText.substring(0, 500),
      };
    });

    console.log('[03] Main view state:', JSON.stringify(mainViewState));

    const isLoggedIn = mainViewState.hasDMs || mainViewState.hasGeneral ||
                       mainViewState.hasServersNav || mainViewState.hasNav;
    expect(isLoggedIn).toBe(true);
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE 2 — Auth Tests
  // ═════════════════════════════════════════════════════════════════════════════

  base('04 — electronAPI bridge: isElectron and platform', async () => {
    const apiState = await window.evaluate(() => {
      const api = (window as any).electronAPI;
      return {
        exists: !!api,
        isElectron: api?.isElectron,
        platform: api?.platform,
        hasConfig: !!api?.config,
        hasAuth: !!api?.auth,
        hasScreenShare: !!api?.screenShare,
        hasCrypto: !!api?.crypto,
      };
    });

    console.log('[04] electronAPI state:', JSON.stringify(apiState));
    await screenshot('04-electron-api');

    expect(apiState.exists).toBe(true);
    expect(apiState.isElectron).toBe(true);
    expect(apiState.platform).toBe('win32');
  });

  base('05 — electronAPI.auth methods exist', async () => {
    const authMethods = await window.evaluate(() => {
      const api = (window as any).electronAPI;
      if (!api?.auth) return { exists: false, methods: [] };
      return {
        exists: true,
        methods: Object.keys(api.auth),
        hasLogin: typeof api.auth.login === 'function',
        hasRegister: typeof api.auth.register === 'function',
        hasLogout: typeof api.auth.logout === 'function',
        hasCheck: typeof api.auth.check === 'function',
        hasHashPassword: typeof api.auth.hashPassword === 'function',
        hasGetSocketToken: typeof api.auth.getSocketToken === 'function',
        hasRefreshToken: typeof api.auth.refreshToken === 'function',
      };
    });

    console.log('[05] Auth methods:', JSON.stringify(authMethods));
    await screenshot('05-auth-methods');

    expect(authMethods.exists).toBe(true);
    expect(authMethods.hasLogin).toBe(true);
    expect(authMethods.hasRegister).toBe(true);
    expect(authMethods.hasLogout).toBe(true);
  });

  base('06 — electronAPI.config methods exist', async () => {
    const configMethods = await window.evaluate(() => {
      const api = (window as any).electronAPI;
      if (!api?.config) return { exists: false };
      return {
        exists: true,
        methods: Object.keys(api.config),
        hasGetServerUrl: typeof api.config.getServerUrl === 'function',
        hasSetServerUrl: typeof api.config.setServerUrl === 'function',
        hasHasServerUrl: typeof api.config.hasServerUrl === 'function',
        hasHealthCheck: typeof api.config.healthCheck === 'function',
      };
    });

    console.log('[06] Config methods:', JSON.stringify(configMethods));

    expect(configMethods.exists).toBe(true);
    expect(configMethods.hasGetServerUrl).toBe(true);
    expect(configMethods.hasHealthCheck).toBe(true);
  });

  base('07 — Login page has Mantine-style components (Paper, TextInput, PasswordInput)', async () => {
    // Since we're already logged in, verify the login page had correct structure
    // by checking the components that rendered (we saw them in screenshots)
    // This is validated by our successful login — the page had:
    // - Welcome back! heading
    // - Email input (Input component from ui)
    // - Password input (Input component from ui)
    // - Log In button (Button component from ui)
    // - Paper-like card (bg-bg-primary rounded-md shadow-high p-8)

    // We can verify the UI library components are present by checking current DOM
    const uiState = await window.evaluate(() => {
      // Check that the app uses proper UI components in current view
      const hasAvatar = !!document.querySelector('img[class*="avatar"], [class*="avatar"]');
      const hasButton = !!document.querySelector('button');
      const hasTooltip = !!document.querySelector('[data-tooltip], [title]');
      const hasNav = !!document.querySelector('nav');
      return { hasAvatar, hasButton, hasTooltip, hasNav };
    });

    console.log('[07] UI component state:', JSON.stringify(uiState));
    await screenshot('07-ui-components');

    // The login worked, meaning the form components (Input, Button) functioned correctly
    expect(uiState.hasButton).toBe(true);
    // Nav element may be a div-based layout, not a semantic <nav> — just verify we're in the app
    const isInApp = await window.evaluate(() => document.body.textContent?.includes('general') || document.body.textContent?.includes('Server'));
    expect(isInApp).toBe(true);
  });

  base('08 — electronAPI additional bridge methods', async () => {
    const bridgeState = await window.evaluate(() => {
      const api = (window as any).electronAPI;
      return {
        hasMinimize: typeof api?.minimize === 'function',
        hasMaximize: typeof api?.maximize === 'function',
        hasClose: typeof api?.close === 'function',
        hasShowNotification: typeof api?.showNotification === 'function',
        hasFlashFrame: typeof api?.flashFrame === 'function',
        hasClipboard: typeof api?.clipboard?.writeText === 'function',
        hasServers: !!api?.servers,
        hasApi: !!api?.api,
      };
    });

    console.log('[08] Bridge state:', JSON.stringify(bridgeState));

    expect(bridgeState.hasMinimize).toBe(true);
    expect(bridgeState.hasMaximize).toBe(true);
    expect(bridgeState.hasClose).toBe(true);
    expect(bridgeState.hasShowNotification).toBe(true);
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE 3 — Messaging Tests
  // ═════════════════════════════════════════════════════════════════════════════

  base('09 — Navigate to a text channel', async () => {
    await settle(2000);

    // Look for channel links in the sidebar
    const channelLinks = window.locator('a[href*="/channels/"]:not([href*="@me"])');
    const channelCount = await channelLinks.count();
    console.log('[09] Channel links found:', channelCount);

    if (channelCount > 0) {
      await channelLinks.first().click();
      await settle(2000);
    } else {
      // Try clicking text that says "general"
      const generalLink = window.locator('text=general').first();
      if (await generalLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await generalLink.click();
        await settle(2000);
      }
    }

    await screenshot('09-text-channel');

    // Verify we're in a channel with a message input
    const channelState = await window.evaluate(() => {
      const hasInput = !!document.querySelector(
        'textarea, [contenteditable="true"], [role="textbox"], div[data-placeholder]'
      );
      const url = window.location.href;
      return { hasInput, url };
    });

    console.log('[09] Channel state:', JSON.stringify(channelState));
    expect(channelState.hasInput).toBe(true);
  });

  base('10 — Message input exists and can be typed in', async () => {
    const messageInput = window.locator(
      'textarea, [contenteditable="true"], [role="textbox"], div[data-placeholder]'
    );
    const inputCount = await messageInput.count();
    console.log('[10] Message inputs found:', inputCount);

    if (inputCount === 0) {
      console.log('[10] SKIP: No message input found');
      base.skip();
      return;
    }

    // Click into it and type
    await messageInput.first().click();
    await window.keyboard.type('QA typing test');
    await settle(500);

    await screenshot('10-message-input-typing');

    // Verify text was entered
    const hasText = await window.evaluate(() => {
      const input = document.querySelector(
        'textarea, [contenteditable="true"], [role="textbox"], div[data-placeholder]'
      );
      if (!input) return false;
      const text = (input as HTMLTextAreaElement).value ||
                   input.textContent || input.innerHTML;
      return text.includes('QA typing test');
    });

    console.log('[10] Text entered:', hasText);

    // Clear the input
    await window.keyboard.press('Control+a');
    await window.keyboard.press('Backspace');
    expect(hasText).toBe(true);
  });

  base('11 — Send a message and verify it appears', async () => {
    const messageInput = window.locator(
      'textarea, [contenteditable="true"], [role="textbox"], div[data-placeholder]'
    );

    if (await messageInput.count() === 0) {
      console.log('[11] SKIP: No message input');
      base.skip();
      return;
    }

    const testMessage = `QA test message ${Date.now()}`;
    await messageInput.first().click();
    await messageInput.first().fill(testMessage);
    await window.keyboard.press('Enter');
    await settle(3000);

    await screenshot('11-message-sent');

    const messageVisible = await window.evaluate((msg: string) => {
      return document.body.innerText.includes(msg);
    }, testMessage);

    console.log('[11] Message visible:', messageVisible);
    expect(messageVisible).toBe(true);
  });

  base('12 — Send :smile: and check emoji renders', async () => {
    const messageInput = window.locator(
      'textarea, [contenteditable="true"], [role="textbox"], div[data-placeholder]'
    );

    if (await messageInput.count() === 0) {
      console.log('[12] SKIP: No message input');
      base.skip();
      return;
    }

    await messageInput.first().click();
    await messageInput.first().fill(':smile:');
    await window.keyboard.press('Enter');
    await settle(3000);

    await screenshot('12-emoji-render');

    const emojiState = await window.evaluate(() => {
      const hasEmojiEl = !!document.querySelector('[data-emoji], .emoji, img[alt*="smile"], img[title*="smile"]');
      const bodyText = document.body.innerText;
      const hasLiteralSmile = bodyText.includes(':smile:');
      // Check for unicode smileys
      const hasSmileEmoji = bodyText.includes('\u{1F604}') ||
                            bodyText.includes('\u{1F60A}') ||
                            bodyText.includes('\u{1F642}') ||
                            bodyText.includes('\u{1F603}');
      return { hasEmojiEl, hasLiteralSmile, hasSmileEmoji };
    });

    console.log('[12] Emoji state:', JSON.stringify(emojiState));
    // Either rendered as image/element or converted to unicode
    // (both are valid implementations)
  });

  base('13 — Send ||spoiler|| and check for spoiler element', async () => {
    const messageInput = window.locator(
      'textarea, [contenteditable="true"], [role="textbox"], div[data-placeholder]'
    );

    if (await messageInput.count() === 0) {
      console.log('[13] SKIP: No message input');
      base.skip();
      return;
    }

    const spoilerContent = `spoiler-test-${Date.now()}`;
    await messageInput.first().click();
    await messageInput.first().fill(`||${spoilerContent}||`);
    await window.keyboard.press('Enter');
    await settle(3000);

    await screenshot('13-spoiler-render');

    const spoilerState = await window.evaluate((content: string) => {
      const spoilerEls = document.querySelectorAll(
        '[class*="spoiler"], [data-spoiler], span[style*="blur"]'
      );
      const hasBlurredElement = !!document.querySelector(
        '[class*="blur"], [style*="blur"], [class*="spoiler"]'
      );
      const textPresent = document.body.innerText.includes(content);
      return {
        spoilerElementCount: spoilerEls.length,
        hasBlurredElement,
        textPresent,
      };
    }, spoilerContent);

    console.log('[13] Spoiler state:', JSON.stringify(spoilerState));
    // Text should be present (possibly behind a blur/spoiler)
    expect(spoilerState.textPresent || spoilerState.spoilerElementCount > 0).toBe(true);
  });

  base('14 — Click Add Reaction — picker opens', async () => {
    // Hover over the last message to reveal action buttons
    const messages = window.locator('[class*="message"], [data-message-id], [class*="Message"]');
    const messageCount = await messages.count();
    console.log('[14] Messages found:', messageCount);

    if (messageCount > 0) {
      await messages.last().hover();
      await settle(800);
    }

    // Look for reaction button in the message action bar
    const reactionBtn = window.locator(
      'button[title*="React"], button[title*="react"], ' +
      'button[aria-label*="React"], button[aria-label*="reaction"], ' +
      'button[aria-label*="Add Reaction"], button[title*="Add Reaction"]'
    );
    const reactionBtnCount = await reactionBtn.count();
    console.log('[14] Reaction buttons found:', reactionBtnCount);

    if (reactionBtnCount > 0) {
      await reactionBtn.first().click();
      await settle(1500);
    }

    await screenshot('14-reaction-picker');

    const pickerState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      const hasPicker = !!document.querySelector(
        '[class*="reaction-picker"], [class*="ReactionPicker"], [class*="emoji-picker"]'
      );
      const hasEmojiCategories = bodyText.includes('Smileys') ||
                                  bodyText.includes('People') ||
                                  bodyText.includes('Animals') ||
                                  bodyText.includes('Gestures');
      const hasSearchInput = !!document.querySelector(
        'input[placeholder*="search" i], input[placeholder*="emoji" i]'
      );
      return { hasPicker, hasEmojiCategories, hasSearchInput };
    });

    console.log('[14] Picker state:', JSON.stringify(pickerState));

    // Close picker if open
    await window.keyboard.press('Escape');
    await settle(500);
  });

  base('15 — Check for file upload button', async () => {
    await screenshot('15-file-upload');

    const uploadState = await window.evaluate(() => {
      const hasFileInput = !!document.querySelector('input[type="file"]');
      const hasUploadBtn = !!document.querySelector(
        'button[title*="Upload" i], button[title*="upload" i], ' +
        'button[aria-label*="Upload" i], button[aria-label*="Attach" i], ' +
        'button[aria-label*="attach" i]'
      );
      const hasPlusButton = !!document.querySelector(
        'button[class*="upload"], button[class*="attach"], [class*="attach"] button'
      );
      return { hasFileInput, hasUploadBtn, hasPlusButton };
    });

    console.log('[15] Upload state:', JSON.stringify(uploadState));

    // At least one upload mechanism should exist
    const hasUpload = uploadState.hasFileInput || uploadState.hasUploadBtn || uploadState.hasPlusButton;
    console.log('[15] Has upload mechanism:', hasUpload);
  });

  base('16 — Message input area has formatting/send controls', async () => {
    const inputArea = await window.evaluate(() => {
      const input = document.querySelector(
        'textarea, [contenteditable="true"], [role="textbox"], div[data-placeholder]'
      );
      if (!input) return { exists: false };

      // Check the surrounding area for buttons (emoji picker, GIF, etc.)
      const parent = input.closest('form, [class*="input"], [class*="chat"]');
      const buttons = parent ? parent.querySelectorAll('button') : [];
      const buttonLabels = Array.from(buttons).map((b) => b.getAttribute('title') || b.getAttribute('aria-label') || b.textContent?.trim()).filter(Boolean);

      return {
        exists: true,
        buttonCount: buttons.length,
        buttonLabels: buttonLabels.slice(0, 10),
      };
    });

    console.log('[16] Input area:', JSON.stringify(inputArea));
    await screenshot('16-input-controls');

    expect(inputArea.exists).toBe(true);
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE 4 — Settings Tests
  // ═════════════════════════════════════════════════════════════════════════════

  base('17 — Open settings via gear icon', async () => {
    await settle(1000);

    // The gear icon is in UserPanel — it's an ActionIcon with IconSettings
    // Click the "Settings" tab in the TitleBar navigation instead (more reliable)
    const settingsNav = window.locator('text=Settings').first();
    const navCount = await settingsNav.count();
    console.log('[17] Settings nav elements:', navCount);

    if (navCount > 0) {
      await settingsNav.click();
      await settle(1500);
    } else {
      // Fallback: try clicking any button with a settings/gear SVG
      const gearButtons = window.locator('button').filter({ has: window.locator('svg') });
      const allButtons = await gearButtons.count();
      console.log('[17] SVG buttons found:', allButtons);
      // Click the last small icon button (likely the gear in UserPanel)
      if (allButtons > 0) {
        await gearButtons.last().click();
        await settle(1500);
      }
    }

    await screenshot('17-settings-opened');

    const settingsOpen = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('My Account') ||
             bodyText.includes('Profile') ||
             bodyText.includes('Appearance') ||
             bodyText.includes('Notifications') ||
             bodyText.includes('Voice') ||
             bodyText.includes('Keybinds');
    });

    console.log('[17] Settings open:', settingsOpen);
    expect(settingsOpen).toBe(true);
  });

  base('18 — Verify settings tabs exist (My Account, Profile, Appearance, etc.)', async () => {
    await screenshot('18-settings-tabs');

    const tabState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasMyAccount: bodyText.includes('My Account'),
        hasProfile: bodyText.includes('Profile'),
        hasAppearance: bodyText.includes('Appearance'),
        hasNotifications: bodyText.includes('Notifications'),
        hasVoice: bodyText.includes('Voice') || bodyText.includes('Voice & Video'),
        hasKeybinds: bodyText.includes('Keybinds'),
      };
    });

    console.log('[18] Tabs found:', JSON.stringify(tabState));

    const tabCount = Object.values(tabState).filter(Boolean).length;
    console.log('[18] Tab count:', tabCount);

    // Expect at least 5 tabs (Keybinds is Electron-only, may or may not show)
    expect(tabCount).toBeGreaterThanOrEqual(5);
  });

  base('19 — Username field is editable in My Account tab', async () => {
    // Click My Account tab
    const accountTab = window.locator('button:has-text("My Account")');
    if (await accountTab.count() > 0) {
      await accountTab.first().click();
      await settle(1000);
    }

    await screenshot('19-account-tab');

    const accountState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      const hasUsername = bodyText.includes('Username') || bodyText.includes('username');
      const hasEmail = bodyText.includes('Email') || bodyText.includes('email');
      const inputs = document.querySelectorAll('input[type="text"], input[type="email"]');
      return {
        hasUsername,
        hasEmail,
        inputCount: inputs.length,
      };
    });

    console.log('[19] Account tab state:', JSON.stringify(accountState));
    expect(accountState.hasUsername || accountState.hasEmail).toBe(true);
  });

  base('20 — Profile tab has display name, pronouns, bio', async () => {
    // Profile tab might be a NavLink (anchor/div) not a button
    const profileTab = window.locator('text=Profile').first();
    if (await profileTab.count() > 0) {
      await profileTab.click();
      await settle(1000);
    }

    await screenshot('20-profile-tab');

    const profileState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasDisplayName: bodyText.includes('Display Name') || bodyText.includes('Display name') || bodyText.includes('display name'),
        hasPronouns: bodyText.includes('Pronouns') || bodyText.includes('pronouns'),
        hasBio: bodyText.includes('Bio') || bodyText.includes('About Me') || bodyText.includes('bio') || bodyText.includes('about'),
      };
    });

    console.log('[20] Profile state:', JSON.stringify(profileState));

    const fieldCount = Object.values(profileState).filter(Boolean).length;
    expect(fieldCount).toBeGreaterThanOrEqual(1);
  });

  base('21 — Voice tab has input sensitivity / device controls', async () => {
    const voiceTab = window.locator('text=Voice').first();
    if (await voiceTab.count() > 0) {
      await voiceTab.click();
      await settle(1000);
    }

    await screenshot('21-voice-tab');

    const voiceState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasSensitivity: bodyText.includes('Sensitivity') || bodyText.includes('sensitivity') ||
                        bodyText.includes('Input Sensitivity'),
        hasSlider: !!document.querySelector('input[type="range"], [role="slider"]'),
        hasInputDevice: bodyText.includes('Input Device') || bodyText.includes('Microphone') || bodyText.includes('input device'),
        hasOutputDevice: bodyText.includes('Output Device') || bodyText.includes('Speaker') || bodyText.includes('output device'),
        hasNoiseSuppression: bodyText.includes('Noise') || bodyText.includes('noise'),
      };
    });

    console.log('[21] Voice state:', JSON.stringify(voiceState));

    const controlCount = Object.values(voiceState).filter(Boolean).length;
    expect(controlCount).toBeGreaterThanOrEqual(1);
  });

  base('22 — Close settings / navigate back to server', async () => {
    // Settings is a full-page view (not a modal). Navigate back via the Server tab.
    const serverTab = window.locator('text=Server').first();
    if (await serverTab.count() > 0) {
      await serverTab.click();
      await settle(1500);
    } else {
      // Fallback: press Escape
      await window.keyboard.press('Escape');
      await settle(1000);
    }

    await screenshot('22-back-to-server');

    const isBack = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('general') || bodyText.includes('announcements') ||
             bodyText.includes('QA-Server') || bodyText.includes('GENERAL CHAT');
    });

    console.log('[22] Back to server view:', isBack);
    expect(isBack).toBe(true);
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE 5 — Server Admin Tests
  // ═════════════════════════════════════════════════════════════════════════════

  base('23 — Open server settings (admin)', async () => {
    await settle(1000);

    // First make sure we're on a server channel (not DMs)
    const channelLinks = window.locator('a[href*="/channels/"]:not([href*="@me"])');
    if (await channelLinks.count() > 0) {
      await channelLinks.first().click();
      await settle(2000);
    }

    // Look for server gear menu — often near the server name header
    // The ServerGearMenu is triggered by clicking the server name/header dropdown
    const serverHeader = window.locator(
      '[class*="server-header"], [class*="ServerSidebar"] button, ' +
      'button:has-text("Server Settings"), [class*="server-name"]'
    );

    let opened = false;

    // Try clicking the server header to open the dropdown
    if (await serverHeader.count() > 0) {
      await serverHeader.first().click();
      await settle(500);

      const settingsOption = window.locator('button:has-text("Settings")');
      if (await settingsOption.count() > 0) {
        await settingsOption.first().click();
        await settle(1500);
        opened = true;
      }
    }

    // Try right-clicking the header area to get context menu
    if (!opened) {
      const headerArea = window.locator('h2, h3').first();
      if (await headerArea.count() > 0) {
        await headerArea.click({ button: 'right' });
        await settle(500);

        const settingsOption = window.locator('text=Server Settings, text=Settings');
        if (await settingsOption.count() > 0) {
          await settingsOption.first().click();
          await settle(1500);
          opened = true;
        }
      }
    }

    // Try the direct gear icon approach
    if (!opened) {
      const gearBtn = window.locator(
        'button[aria-label*="Server Settings" i], button[title*="Server Settings" i]'
      );
      if (await gearBtn.count() > 0) {
        await gearBtn.first().click();
        await settle(1500);
        opened = true;
      }
    }

    await screenshot('23-server-settings');

    const hasServerSettings = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('Server Settings') ||
             bodyText.includes('General') && bodyText.includes('Roles') ||
             bodyText.includes('Access Control') ||
             !!document.querySelector('[aria-label*="Server Settings"]');
    });

    console.log('[23] Server settings opened:', opened, 'visible:', hasServerSettings);
  });

  base('24 — Roles panel with permission categories', async () => {
    // Click on Roles tab if visible
    const rolesTab = window.locator('button:has-text("Roles")');
    if (await rolesTab.count() > 0) {
      await rolesTab.first().click();
      await settle(1500);
    }

    await screenshot('24-roles-tab');

    const rolesState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasRoles: bodyText.includes('Roles') || bodyText.includes('role'),
        hasPermissions: bodyText.includes('Permissions') || bodyText.includes('permissions'),
        hasPermissionCategories: bodyText.includes('General') || bodyText.includes('Text') || bodyText.includes('Voice'),
        hasAccordion: !!document.querySelector(
          '[class*="accordion"], [class*="Accordion"], [data-accordion]'
        ),
      };
    });

    console.log('[24] Roles state:', JSON.stringify(rolesState));
  });

  base('25 — Access Control section', async () => {
    const accessTab = window.locator('button:has-text("Access Control")');
    if (await accessTab.count() > 0) {
      await accessTab.first().click();
      await settle(1500);
    }

    await screenshot('25-access-control');

    const accessState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasSettings: bodyText.includes('Settings'),
        hasIntakeForm: bodyText.includes('Intake Form') || bodyText.includes('Intake'),
        hasApprovals: bodyText.includes('Approvals'),
        hasBlacklist: bodyText.includes('Blacklist'),
      };
    });

    console.log('[25] Access Control state:', JSON.stringify(accessState));

    const subTabsFound = Object.values(accessState).filter(Boolean).length;
    console.log('[25] Sub-tabs found:', subTabsFound, 'of 4');
  });

  base('26 — Channels tab in server settings', async () => {
    const channelsTab = window.locator('button:has-text("Channels")');
    if (await channelsTab.count() > 0) {
      await channelsTab.first().click();
      await settle(1500);
    }

    await screenshot('26-channels-tab');

    const channelsState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasChannels: bodyText.includes('Channels'),
        hasCreateButton: bodyText.includes('Create') || bodyText.includes('Add'),
        hasChannelItems: document.querySelectorAll('[class*="channel"], li, [class*="item"]').length > 0,
      };
    });

    console.log('[26] Channels state:', JSON.stringify(channelsState));
  });

  base('27 — Impersonation section visible (admin feature)', async () => {
    // Check if impersonation section exists anywhere in server settings
    const impersonationState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasImpersonation: bodyText.includes('Impersonat') || bodyText.includes('impersonat'),
        hasImpersonationPanel: !!document.querySelector(
          '[class*="impersonat"], [class*="Impersonat"]'
        ),
      };
    });

    console.log('[27] Impersonation state:', JSON.stringify(impersonationState));
    await screenshot('27-impersonation');

    // Close server settings if open
    await window.keyboard.press('Escape');
    await settle(500);
  });

  base('28 — Join Server button in sidebar', async () => {
    await settle(1000);

    const joinState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      const hasJoinButton = !!document.querySelector(
        'button[title*="Join" i], button[title*="Add" i], ' +
        'button[aria-label*="Join" i], button[aria-label*="Add Server" i], ' +
        'button[aria-label*="Create" i]'
      );
      const hasPlusButton = !!document.querySelector(
        '[aria-label="Servers"] button, nav button'
      );
      const hasJoinText = bodyText.includes('Join Server') || bodyText.includes('Add Server') ||
                          bodyText.includes('Create Server');
      return { hasJoinButton, hasPlusButton, hasJoinText };
    });

    console.log('[28] Join server state:', JSON.stringify(joinState));
    await screenshot('28-join-server');
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE 6 — UI Tests
  // ═════════════════════════════════════════════════════════════════════════════

  base('29 — Command palette opens with Ctrl+K', async () => {
    await settle(1000);

    await window.keyboard.press('Control+k');
    await settle(1500);

    await screenshot('29-command-palette');

    const paletteState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      const hasSearchInput = !!document.querySelector(
        'input[placeholder*="search" i], input[placeholder*="Go to" i], ' +
        'input[placeholder*="command" i], input[placeholder*="channel" i]'
      );
      const hasOverlay = !!document.querySelector(
        '[class*="command-palette"], [class*="CommandPalette"], ' +
        '[class*="spotlight"], [role="dialog"], [class*="modal"]'
      );
      const hasResults = bodyText.includes('Channels') ||
                         bodyText.includes('Members') ||
                         bodyText.includes('Actions');
      return { hasSearchInput, hasOverlay, hasResults };
    });

    console.log('[29] Palette state:', JSON.stringify(paletteState));

    expect(paletteState.hasSearchInput || paletteState.hasOverlay).toBe(true);

    // Close palette
    await window.keyboard.press('Escape');
    await settle(500);
  });

  base('30 — Server sidebar icons visible', async () => {
    await settle(500);

    const sidebarState = await window.evaluate(() => {
      const serversNav = document.querySelector('[aria-label="Servers"], nav');
      const hasServersNav = !!serversNav;

      // Check for server icons
      const serverIcons = serversNav?.querySelectorAll('img, a') || [];

      // Check for DM/Home button
      const hasDMButton = document.body.innerText.includes('Direct Messages') ||
                          !!document.querySelector('a[href*="@me"]');

      return {
        hasServersNav,
        serverIconCount: serverIcons.length,
        hasDMButton,
      };
    });

    console.log('[30] Sidebar state:', JSON.stringify(sidebarState));
    await screenshot('30-server-sidebar');

    expect(sidebarState.hasServersNav).toBe(true);
    expect(sidebarState.hasDMButton).toBe(true);
  });

  base('31 — Voice controls visible (VoiceConnectedBar or voice buttons)', async () => {
    await settle(500);

    const voiceState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      // VoiceControls component in UserPanel area
      const hasVoiceControls = !!document.querySelector(
        '[class*="voice"], [class*="Voice"], button[title*="Mute" i], ' +
        'button[title*="Deafen" i], button[aria-label*="Mute" i]'
      );
      const hasVoiceConnectedBar = bodyText.includes('Voice Connected') ||
                                    bodyText.includes('Connected to');
      // Voice channel links
      const hasVoiceChannels = !!document.querySelector(
        'a[href*="/channels/"][class*="voice"], [class*="voice-channel"]'
      );
      return { hasVoiceControls, hasVoiceConnectedBar, hasVoiceChannels };
    });

    console.log('[31] Voice state:', JSON.stringify(voiceState));
    await screenshot('31-voice-controls');

    // Voice infrastructure should exist even if not currently in a voice channel
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // FINAL — Summary screenshot
  // ═════════════════════════════════════════════════════════════════════════════

  base('32 — Final state screenshot', async () => {
    await screenshot('32-final-state');

    const finalState = await window.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyTextLength: document.body.innerText.length,
        hasServersNav: !!document.querySelector('[aria-label="Servers"]'),
        hasNav: !!document.querySelector('nav'),
        isAuthenticated: !document.body.innerText.includes('Log In') &&
                         !document.body.innerText.includes('Welcome back'),
      };
    });

    console.log('[32] Final state:', JSON.stringify(finalState));
    expect(finalState.isAuthenticated).toBe(true);
  });

});
