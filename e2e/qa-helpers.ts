/**
 * Shared QA test helpers for all parity test suites.
 */

export const SERVER_URL = 'http://localhost:3124';
export const TEST_EMAIL = 'qa-admin@local.test';
export const TEST_PASSWORD = 'QATest123!';

/**
 * Attempt to log in to the app. Returns true if we're on the main view.
 * Forces switch to localhost:3124 if connected to a different server.
 */
export async function ensureLoggedIn(window: any): Promise<boolean> {
  try {
    await window.waitForLoadState('load');
    await window.waitForTimeout(3000);

    // Check current server URL — force switch if on wrong server
    const currentUrl = await window.evaluate(async () => {
      const api = (window as any).electronAPI;
      return api?.config?.getServerUrl ? await api.config.getServerUrl() : '';
    });

    const isOnMain = await window.evaluate(() => {
      return document.querySelector('[aria-label="Servers"]') !== null ||
             document.body.innerText.includes('Direct Messages') ||
             document.body.innerText.includes('general');
    });

    // If connected to wrong server, force logout and re-login to correct one
    if (currentUrl && currentUrl !== SERVER_URL) {
      console.log(`[ensureLoggedIn] Wrong server: ${currentUrl}, switching to ${SERVER_URL}`);
      await window.evaluate(async () => {
        const api = (window as any).electronAPI;
        if (api?.auth?.logout) await api.auth.logout();
      });
      await window.waitForTimeout(500);
      const result = await window.evaluate(async (args: any) => {
        const api = (window as any).electronAPI;
        if (api?.auth?.login) {
          try {
            const r = await api.auth.login(args.serverUrl, args.email, args.password);
            return { success: r?.success === true, result: r };
          } catch (err: any) {
            return { success: false, error: err?.message || String(err) };
          }
        }
        return { success: false, error: 'No electronAPI.auth.login' };
      }, { serverUrl: SERVER_URL, email: TEST_EMAIL, password: TEST_PASSWORD });
      if (result.success) {
        await window.reload();
        await window.waitForTimeout(5000);
        return await window.evaluate(() => {
          return document.querySelector('[aria-label="Servers"]') !== null ||
                 document.body.innerText.includes('Direct Messages') ||
                 document.body.innerText.includes('general');
        });
      }
      console.log('[ensureLoggedIn] Switch login failed:', JSON.stringify(result));
      return false;
    }

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

    console.log('[ensureLoggedIn] API login failed:', JSON.stringify(loginResult));
    return false;
  } catch (err) {
    console.log('[ensureLoggedIn] Error during login attempt:', err);
    return false;
  }
}
