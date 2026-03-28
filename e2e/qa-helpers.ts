/**
 * Shared QA test helpers for all parity test suites.
 */

export const SERVER_URL = 'http://localhost:3124';
export const TEST_EMAIL = 'qa_admin@local.test';
export const TEST_PASSWORD = 'QATest123!';

/**
 * Attempt to log in to the app. Returns true if we're on the main view.
 * Gracefully returns false if login fails for any reason.
 */
export async function ensureLoggedIn(window: any): Promise<boolean> {
  try {
    await window.waitForLoadState('load');
    await window.waitForTimeout(3000);

    // Check if already on main view
    const isOnMain = await window.evaluate(() => {
      return document.querySelector('[aria-label="Servers"]') !== null ||
             document.body.innerText.includes('Direct Messages') ||
             document.body.innerText.includes('general');
    });

    if (isOnMain) return true;

    // Try electronAPI.auth.login
    const loginResult = await window.evaluate(async (args: any) => {
      const api = (window as any).electronAPI;
      if (api?.auth?.login) {
        try {
          const result = await api.auth.login(args.serverUrl, args.email, args.password);
          return { success: result?.success === true, result };
        } catch (err: any) {
          return { success: false, error: err?.message || String(err) };
        }
      }
      return { success: false, error: 'No electronAPI.auth.login' };
    }, { serverUrl: SERVER_URL, email: TEST_EMAIL, password: TEST_PASSWORD });

    if (loginResult.success) {
      await window.reload();
      await window.waitForTimeout(5000);
      return await window.evaluate(() => {
        return document.querySelector('[aria-label="Servers"]') !== null ||
               document.body.innerText.includes('Direct Messages') ||
               document.body.innerText.includes('general');
      });
    }

    // If the API returned an explicit error (wrong password, rate limit),
    // don't bother with form-based login — it will fail too
    console.log('[ensureLoggedIn] API login failed:', JSON.stringify(loginResult));
    return false;
  } catch (err) {
    console.log('[ensureLoggedIn] Error during login attempt:', err);
    return false;
  }
}
