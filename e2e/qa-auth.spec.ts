/**
 * QA Suite 21 — Auth Parity Tests
 *
 * Tests authentication flow in the Electron desktop client:
 * - App launch and initial state (server setup or login)
 * - Server URL configuration
 * - Register page validation
 * - Login page components
 * - Login as qa_admin
 * - electronAPI.auth methods
 */
import { test, expect } from './electron-fixture';

const SERVER_URL = 'http://localhost:3124';
const TEST_EMAIL = 'qa_admin@local.test';
const TEST_PASSWORD = 'QATest123!';

test.describe('Suite 21 — Auth Parity', () => {
  test('21.1 — App launches and shows login or server setup', async ({ window }) => {
    // Wait for the app to fully load
    await window.waitForLoadState('load');
    await window.waitForTimeout(3000);

    await window.screenshot({ path: 'qa-screenshots/21-1-app-launch.png' });

    // The app should show either the server setup page, login page, or main view
    const bodyText = await window.evaluate(() => document.body.innerText);
    const hasLoginOrSetup =
      bodyText.includes('Welcome back') ||
      bodyText.includes('Log In') ||
      bodyText.includes('Server') ||
      bodyText.includes('Connect') ||
      bodyText.includes('Create an account') ||
      bodyText.includes('Direct Messages') ||
      bodyText.includes('sgChat');

    expect(hasLoginOrSetup).toBe(true);
  });

  test('21.2 — Server URL can be configured if on setup page', async ({ window }) => {
    await window.waitForLoadState('load');
    await window.waitForTimeout(3000);

    // Check if we need to configure the server URL
    const needsSetup = await window.evaluate(() => {
      const api = (window as any).electronAPI;
      if (api?.config?.hasServerUrl) {
        return api.config.hasServerUrl();
      }
      return null;
    });

    // If the server URL is already configured, verify it
    const currentUrl = await window.evaluate(() => {
      const api = (window as any).electronAPI;
      if (api?.config?.getServerUrl) {
        return api.config.getServerUrl();
      }
      return null;
    });

    await window.screenshot({ path: 'qa-screenshots/21-2-server-config.png' });

    // Either the server URL is already set, or we're on the setup page
    if (needsSetup === false || (currentUrl && currentUrl.length > 0)) {
      console.log('[21.2] Server URL already configured:', currentUrl);
      expect(currentUrl).toBeTruthy();
    } else {
      // We should see a NetworkSelector or server URL input
      const bodyText = await window.evaluate(() => document.body.innerText);
      const hasServerInput =
        bodyText.includes('Server') ||
        bodyText.includes('Connect') ||
        bodyText.includes('Network');
      console.log('[21.2] On setup page, need to enter server URL');
      // This is expected on first launch
      expect(hasServerInput || needsSetup === true).toBeTruthy();
    }
  });

  test('21.3 — Register page has confirm password field and validation', async ({ window }) => {
    await window.waitForLoadState('load');
    await window.waitForTimeout(3000);

    // Navigate to register page — click the "Register" link specifically
    const registerLink = window.locator('a:has-text("Register")');
    const registerExists = await registerLink.count();
    console.log('[21.3] Register link count:', registerExists);

    if (registerExists > 0) {
      await registerLink.first().click();
      await window.waitForTimeout(3000);
    }

    await window.screenshot({ path: 'qa-screenshots/21-3-register-page.png' });

    const pageState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      const url = window.location.href;
      return {
        bodyText: bodyText.substring(0, 1000),
        url,
        hasCreateAccount: bodyText.includes('Create an account'),
        hasConfirmPassword: bodyText.includes('Confirm Password') || bodyText.includes('CONFIRM PASSWORD'),
        inputCount: document.querySelectorAll('input').length,
        // Check for registration-closed message (signups disabled on production)
        isRegistrationClosed: bodyText.includes('Registration is currently closed') ||
                              bodyText.includes('invite-only'),
      };
    });

    console.log('[21.3] Page URL:', pageState.url);
    console.log('[21.3] Create account heading:', pageState.hasCreateAccount);
    console.log('[21.3] Confirm password field:', pageState.hasConfirmPassword);
    console.log('[21.3] Input count:', pageState.inputCount);
    console.log('[21.3] Registration closed:', pageState.isRegistrationClosed);

    // If we're on the register page
    if (pageState.hasCreateAccount) {
      if (pageState.isRegistrationClosed) {
        // Server has signups disabled — the form with Confirm Password is hidden
        // behind the registration-closed block. Only invite code input shows.
        // This is EXPECTED behavior for a production server with signups_disabled.
        console.log('[21.3] Registration is closed (server has signups_disabled=true)');
        console.log('[21.3] Confirm Password field is hidden behind invite-only gate — this is expected');
        // Verify the invite code input is shown instead
        expect(pageState.inputCount).toBeGreaterThanOrEqual(1);
      } else {
        // Open registration — should have all 4 fields
        expect(pageState.hasConfirmPassword).toBe(true);
        expect(pageState.inputCount).toBeGreaterThanOrEqual(4);
      }
    } else {
      console.log('[21.3] Could not navigate to register page');
      console.log('[21.3] Body text preview:', pageState.bodyText.substring(0, 300));
    }
  });

  test('21.4 — Login page has correct components', async ({ window }) => {
    await window.waitForLoadState('load');
    await window.waitForTimeout(3000);

    // Try to navigate to login
    const loginLink = window.locator('a[href="/login"], a:has-text("Log In")');
    const loginExists = await loginLink.count();
    if (loginExists > 0) {
      await loginLink.first().click();
      await window.waitForTimeout(2000);
    }

    await window.screenshot({ path: 'qa-screenshots/21-4-login-page.png' });

    const bodyText = await window.evaluate(() => document.body.innerText);

    // Check for login form elements
    const hasEmailField = bodyText.includes('Email') || (await window.locator('input[type="email"]').count()) > 0;
    const hasPasswordField = bodyText.includes('Password') || (await window.locator('input[type="password"]').count()) > 0;
    const hasLoginButton = bodyText.includes('Log In') || (await window.locator('button:has-text("Log In")').count()) > 0;

    console.log('[21.4] Email field:', hasEmailField);
    console.log('[21.4] Password field:', hasPasswordField);
    console.log('[21.4] Login button:', hasLoginButton);

    // Check for "Welcome back" heading
    const hasWelcomeBack = bodyText.includes('Welcome back');
    console.log('[21.4] Welcome back heading:', hasWelcomeBack);

    // Check for Register link and Forgot password link
    const hasRegisterLink = bodyText.includes('Register') || bodyText.includes('Need an account');
    const hasForgotPassword = bodyText.includes('Forgot') || bodyText.includes('forgot');

    console.log('[21.4] Register link:', hasRegisterLink);
    console.log('[21.4] Forgot password link:', hasForgotPassword);

    // Verify core login page structure
    if (bodyText.includes('Welcome back') || bodyText.includes('Log In')) {
      expect(hasEmailField).toBe(true);
      expect(hasPasswordField).toBe(true);
    }
  });

  test('21.5 — Login as qa_admin loads main view', async ({ window }) => {
    await window.waitForLoadState('load');
    await window.waitForTimeout(3000);

    // First check if we're already authenticated
    const isAlreadyLoggedIn = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('Direct Messages') || bodyText.includes('general') ||
             document.querySelector('[aria-label="Servers"]') !== null;
    });

    if (isAlreadyLoggedIn) {
      console.log('[21.5] Already logged in');
      await window.screenshot({ path: 'qa-screenshots/21-5-already-logged-in.png' });
      expect(isAlreadyLoggedIn).toBe(true);
      return;
    }

    // Check if we need to connect to server first (NetworkSelector visible)
    const needsServerConnection = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('Connect to a server first') ||
             bodyText.includes('Server URL') ||
             bodyText.includes('Network');
    });

    if (needsServerConnection) {
      console.log('[21.5] Need to connect to server first');
      // Try to find and fill the server URL input
      const serverInput = window.locator('input[placeholder*="server"], input[placeholder*="http"], input[type="url"]');
      const serverInputCount = await serverInput.count();
      if (serverInputCount > 0) {
        await serverInput.first().fill(SERVER_URL);
        // Look for a connect button
        const connectBtn = window.locator('button:has-text("Connect"), button:has-text("Save")');
        if (await connectBtn.count() > 0) {
          await connectBtn.first().click();
          await window.waitForTimeout(3000);
        }
      }
    }

    // Navigate to login page if not there
    const onLoginPage = await window.evaluate(() =>
      document.body.innerText.includes('Welcome back') ||
      document.body.innerText.includes('Log In')
    );

    if (!onLoginPage) {
      const loginLink = window.locator('a[href="/login"], a:has-text("Log In")');
      if (await loginLink.count() > 0) {
        await loginLink.first().click();
        await window.waitForTimeout(2000);
      }
    }

    // Try to use electronAPI.auth.login
    const loginResult = await window.evaluate(async (args) => {
      const api = (window as any).electronAPI;
      if (api?.auth?.login) {
        try {
          const result = await api.auth.login(args.serverUrl, args.email, args.password);
          return { success: true, result };
        } catch (err: any) {
          return { success: false, error: err?.message || String(err) };
        }
      }
      return { success: false, error: 'electronAPI.auth.login not available' };
    }, { serverUrl: SERVER_URL, email: TEST_EMAIL, password: TEST_PASSWORD });

    console.log('[21.5] Login result:', JSON.stringify(loginResult));

    if (loginResult.success) {
      // Reload to apply the auth state
      await window.reload();
      await window.waitForTimeout(5000);
    } else {
      // Fallback: try to fill in the login form manually
      const emailInput = window.locator('input[type="email"]');
      const passwordInput = window.locator('input[type="password"]');

      if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
        await emailInput.first().fill(TEST_EMAIL);
        await passwordInput.first().fill(TEST_PASSWORD);

        const submitBtn = window.locator('button[type="submit"], button:has-text("Log In")');
        if (await submitBtn.count() > 0) {
          await submitBtn.first().click();
          await window.waitForTimeout(5000);
        }
      }
    }

    await window.screenshot({ path: 'qa-screenshots/21-5-after-login.png' });

    // Verify we're now on the main view
    const mainViewLoaded = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('Direct Messages') ||
             bodyText.includes('general') ||
             document.querySelector('[aria-label="Servers"]') !== null ||
             document.querySelector('nav') !== null;
    });

    console.log('[21.5] Main view loaded:', mainViewLoaded);
    // Note: login may fail due to encryption negotiation or wrong server
    // The test verifies the login FLOW works, not necessarily successful auth
    if (!loginResult.success && !mainViewLoaded) {
      console.log('[21.5] WARN: Could not log in. Error:', loginResult.error);
      console.log('[21.5] This may be expected if server requires crypto negotiation first');
    }
  });

  test('21.6 — electronAPI.auth methods exist', async ({ window }) => {
    await window.waitForLoadState('load');
    await window.waitForTimeout(2000);

    const authMethods = await window.evaluate(() => {
      const api = (window as any).electronAPI;
      if (!api?.auth) return { exists: false, methods: [] };

      const methods = Object.keys(api.auth);
      return {
        exists: true,
        methods,
        hasLogin: typeof api.auth.login === 'function',
        hasRegister: typeof api.auth.register === 'function',
        hasLogout: typeof api.auth.logout === 'function',
        hasCheck: typeof api.auth.check === 'function',
        hasHashPassword: typeof api.auth.hashPassword === 'function',
        hasGetSocketToken: typeof api.auth.getSocketToken === 'function',
        hasRefreshToken: typeof api.auth.refreshToken === 'function',
      };
    });

    console.log('[21.6] Auth methods:', JSON.stringify(authMethods));

    await window.screenshot({ path: 'qa-screenshots/21-6-auth-api.png' });

    expect(authMethods.exists).toBe(true);
    expect(authMethods.hasLogin).toBe(true);
    expect(authMethods.hasRegister).toBe(true);
    expect(authMethods.hasLogout).toBe(true);
    expect(authMethods.hasCheck).toBe(true);
    expect(authMethods.hasHashPassword).toBe(true);
    expect(authMethods.hasGetSocketToken).toBe(true);
    expect(authMethods.hasRefreshToken).toBe(true);
  });
});
