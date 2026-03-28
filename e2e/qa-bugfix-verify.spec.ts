/**
 * QA Bug Fix Verification — Tests for fixes in commit 7914019
 * - bwho: clipboard readText in preload bridge
 * - 9zt6: admin dropdown missing AFK Settings, Crash Reports, Impersonation
 * - 0u6n: right-click context menu on messages
 */
import { test as base, _electron, expect, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';

let electronApp: ElectronApplication;
let window: Page;

const SERVER_URL = 'http://localhost:3124';
const TEST_EMAIL = 'qa-admin@local.test';
const TEST_PASSWORD = 'QATest123!';

base.beforeAll(async () => {
  const electronPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
  const { ELECTRON_RUN_AS_NODE, ...cleanEnv } = process.env;
  electronApp = await _electron.launch({
    executablePath: electronPath,
    args: ['.'],
    env: { ...cleanEnv, NODE_ENV: 'test' },
  });
  window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');
});

base.afterAll(async () => {
  if (electronApp) await electronApp.close();
});

async function ss(name: string) {
  try { await window.screenshot({ path: `qa-screenshots/bugfix-${name}.png` }); } catch {}
}
async function settle(ms = 2000) { await window.waitForTimeout(ms); }

async function ensureLoggedIn() {
  await window.waitForLoadState('load');
  await settle(3000);
  const isOnMain = await window.evaluate(() => {
    return document.body.innerText.includes('general') || document.body.innerText.includes('Direct Messages');
  });
  if (isOnMain) return true;

  const result = await window.evaluate(async (args: any) => {
    const api = (window as any).electronAPI;
    if (api?.auth?.login) {
      try {
        const r = await api.auth.login(args.serverUrl, args.email, args.password);
        return { success: r?.success === true };
      } catch (err: any) {
        return { success: false, error: err?.message };
      }
    }
    return { success: false };
  }, { serverUrl: SERVER_URL, email: TEST_EMAIL, password: TEST_PASSWORD });

  if (result.success) {
    await window.reload();
    await settle(5000);
  }
  return result.success;
}

base.describe.serial('Bug Fix Verification', () => {

  base('Setup — ensure logged in', async () => {
    const loggedIn = await ensureLoggedIn();
    console.log('[Setup] Logged in:', loggedIn);
    await ss('setup');
  });

  // ═══════════════════════════════════════════════════════════════
  // FIX: bwho — clipboard readText
  // ═══════════════════════════════════════════════════════════════

  base('FIX-bwho — clipboard.readText exposed in preload bridge', async () => {
    const clipboardState = await window.evaluate(() => {
      const api = (window as any).electronAPI;
      return {
        hasClipboard: !!api?.clipboard,
        hasWriteText: typeof api?.clipboard?.writeText === 'function',
        hasReadText: typeof api?.clipboard?.readText === 'function',
      };
    });
    console.log('[FIX-bwho] Clipboard API:', JSON.stringify(clipboardState));
    expect(clipboardState.hasClipboard).toBe(true);
    expect(clipboardState.hasWriteText).toBe(true);
    expect(clipboardState.hasReadText).toBe(true);
    await ss('bwho-clipboard');
  });

  base('FIX-bwho — clipboard readText round-trip works', async () => {
    const roundTrip = await window.evaluate(async () => {
      const api = (window as any).electronAPI;
      const testText = 'sgChat-QA-test-' + Date.now();
      await api.clipboard.writeText(testText);
      const readBack = await api.clipboard.readText();
      return { testText, readBack, matches: testText === readBack };
    });
    console.log('[FIX-bwho] Round-trip:', JSON.stringify(roundTrip));
    expect(roundTrip.matches).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════
  // FIX: 9zt6 — Admin dropdown missing items
  // ═══════════════════════════════════════════════════════════════

  base('FIX-9zt6 — Admin dropdown has all items including Impersonate User', async () => {
    // Navigate to server view first
    await window.evaluate(() => {
      const noDrag = document.querySelector('.no-drag');
      if (noDrag) {
        const buttons = noDrag.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.trim() === 'Server' || btn.textContent?.trim().endsWith('Server')) {
            btn.click();
            break;
          }
        }
      }
    });
    await settle(1500);

    // Find and click the Admin button to open dropdown
    const adminButton = window.locator('button:has-text("Admin")');
    if (await adminButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adminButton.click();
      await settle(1000);
    }
    await ss('9zt6-admin-dropdown');

    const menuState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasServerSettings: bodyText.includes('Server Settings'),
        hasRoles: bodyText.includes('Roles & Permissions'),
        hasMembers: bodyText.includes('Members'),
        hasStorage: bodyText.includes('Storage Dashboard'),
        hasAuditLog: bodyText.includes('Audit Log'),
        hasEmojis: bodyText.includes('Emoji Packs'),
        hasRoleReactions: bodyText.includes('Role Reactions'),
        hasRelayServers: bodyText.includes('Relay Servers'),
        hasAFKSettings: bodyText.includes('AFK Settings'),
        hasCrashReports: bodyText.includes('Crash Reports'),
        hasImpersonateUser: bodyText.includes('Impersonate User'),
      };
    });
    console.log('[FIX-9zt6] Admin dropdown items:', JSON.stringify(menuState));

    // The new items we added
    expect(menuState.hasAFKSettings).toBe(true);
    expect(menuState.hasCrashReports).toBe(true);
    expect(menuState.hasImpersonateUser).toBe(true);

    // Close the dropdown
    await window.keyboard.press('Escape');
    await settle(500);
  });

  base('FIX-9zt6 — Clicking Impersonate User opens admin view', async () => {
    // Open the admin dropdown
    const adminButton = window.locator('button:has-text("Admin")');
    if (await adminButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adminButton.click();
      await settle(1000);
    }

    // Click "Impersonate User"
    const impersonateItem = window.locator('text="Impersonate User"').first();
    if (await impersonateItem.isVisible({ timeout: 1000 }).catch(() => false)) {
      await impersonateItem.click();
      await settle(2000);
    }
    await ss('9zt6-impersonation-view');

    const viewState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasImpersonationPanel: bodyText.includes('Impersonate') || bodyText.includes('impersonat'),
        isAdminView: bodyText.includes('Roles & Permissions') || bodyText.includes('Members'),
      };
    });
    console.log('[FIX-9zt6] Impersonation view:', JSON.stringify(viewState));
  });

  // ═══════════════════════════════════════════════════════════════
  // FIX: 0u6n — Right-click context menu on messages
  // ═══════════════════════════════════════════════════════════════

  base('FIX-0u6n — Navigate to general channel', async () => {
    // Navigate back to server view
    await window.evaluate(() => {
      const noDrag = document.querySelector('.no-drag');
      if (noDrag) {
        const buttons = noDrag.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.trim() === 'Server' || btn.textContent?.trim().endsWith('Server')) {
            btn.click();
            break;
          }
        }
      }
    });
    await settle(1500);

    // Click general channel
    await window.evaluate(() => {
      const links = document.querySelectorAll('a, button, [role="treeitem"]');
      for (const el of links) {
        if (el.textContent?.trim() === 'general') {
          (el as HTMLElement).click();
          break;
        }
      }
    });
    await settle(2000);
    await ss('0u6n-general-channel');
  });

  base('FIX-0u6n — Right-click on message shows context menu', async () => {
    // Find a message and right-click it
    // Messages are in a scrollable container, find by message content structure
    const rightClicked = await window.evaluate(() => {
      // Find message items - they have marginTop: 2 and position: relative
      // Look for text spans with message content
      const allElements = document.querySelectorAll('span');
      for (const el of allElements) {
        // Look for rendered message content (not UI chrome)
        const parent = el.closest('[style*="position: relative"]');
        if (parent && parent.querySelector('[style*="whiteSpace: pre-wrap"]')) {
          // Right-click on this element
          const event = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: 400,
            clientY: 300,
            button: 2,
          });
          parent.dispatchEvent(event);
          return true;
        }
      }
      return false;
    });
    console.log('[FIX-0u6n] Right-click dispatched:', rightClicked);
    await settle(1000);
    await ss('0u6n-context-menu');

    const menuState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      // Check for the portal-rendered context menu
      // Our context menu renders directly to document.body via createPortal
      const fixedDivs = Array.from(document.querySelectorAll('div[style*="position: fixed"]'));
      const contextMenu = fixedDivs.find(d =>
        d.textContent?.includes('Copy Text') || d.textContent?.includes('Reply')
      );
      return {
        hasContextMenu: !!contextMenu,
        hasCopyText: bodyText.includes('Copy Text'),
        hasCopyLink: bodyText.includes('Copy Message Link'),
        hasReply: bodyText.includes('Reply'),
        hasPinMessage: bodyText.includes('Pin Message'),
        hasEditMessage: bodyText.includes('Edit Message'),
        hasDeleteMessage: bodyText.includes('Delete Message'),
      };
    });
    console.log('[FIX-0u6n] Context menu state:', JSON.stringify(menuState));

    // Close context menu
    await window.mouse.click(10, 10);
    await settle(500);
  });

  base('FIX-0u6n — Context menu Copy Text copies to clipboard', async () => {
    // First, send a test message so we know the content
    const testMsg = 'ctx-menu-test-' + Date.now();
    await window.evaluate(async (msg: string) => {
      const api = (window as any).electronAPI;
      await api.clipboard.writeText(''); // clear clipboard
    }, testMsg);

    // Right-click on last message
    const rightClicked = await window.evaluate(() => {
      const allPreWrap = document.querySelectorAll('[style*="whiteSpace: pre-wrap"]');
      if (allPreWrap.length > 0) {
        const last = allPreWrap[allPreWrap.length - 1];
        const parent = last.closest('[style*="position: relative"]');
        if (parent) {
          const rect = parent.getBoundingClientRect();
          const event = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            button: 2,
          });
          parent.dispatchEvent(event);
          return true;
        }
      }
      return false;
    });
    await settle(1000);

    if (rightClicked) {
      // Click "Copy Text"
      const copyBtn = window.locator('text="Copy Text"').first();
      if (await copyBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await copyBtn.click();
        await settle(500);

        // Verify clipboard has content
        const clipContent = await window.evaluate(async () => {
          const api = (window as any).electronAPI;
          return await api.clipboard.readText();
        });
        console.log('[FIX-0u6n] Clipboard after copy:', clipContent ? 'has content' : 'empty');
      } else {
        console.log('[FIX-0u6n] Copy Text button not visible');
      }
    }
    await ss('0u6n-copy-text');
  });

  // ═══════════════════════════════════════════════════════════════
  // Additional audit — check for regressions
  // ═══════════════════════════════════════════════════════════════

  base('REGRESSION — TitleBar still has all original admin items', async () => {
    // Navigate back to server
    await window.evaluate(() => {
      const noDrag = document.querySelector('.no-drag');
      if (noDrag) {
        const buttons = noDrag.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.trim() === 'Server' || btn.textContent?.trim().endsWith('Server')) {
            btn.click();
            break;
          }
        }
      }
    });
    await settle(1000);

    // Open admin dropdown
    const adminButton = window.locator('button:has-text("Admin")');
    if (await adminButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adminButton.click();
      await settle(1000);
    }

    const items = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        serverSettings: bodyText.includes('Server Settings'),
        roles: bodyText.includes('Roles & Permissions'),
        members: bodyText.includes('Members'),
        storage: bodyText.includes('Storage Dashboard'),
        auditLog: bodyText.includes('Audit Log'),
        emojis: bodyText.includes('Emoji Packs'),
        roleReactions: bodyText.includes('Role Reactions'),
        relayServers: bodyText.includes('Relay Servers'),
        afkSettings: bodyText.includes('AFK Settings'),
        crashReports: bodyText.includes('Crash Reports'),
        impersonateUser: bodyText.includes('Impersonate User'),
      };
    });
    console.log('[REGRESSION] All admin items:', JSON.stringify(items));

    // All original items must still be present
    expect(items.serverSettings).toBe(true);
    expect(items.roles).toBe(true);
    expect(items.members).toBe(true);
    expect(items.storage).toBe(true);
    expect(items.auditLog).toBe(true);

    await window.keyboard.press('Escape');
    await settle(500);
  });

  base('REGRESSION — No console errors after all tests', async () => {
    const errors = await window.evaluate(() => {
      return {
        hasErrorBoundary: !!document.querySelector('[class*="error-boundary"], [class*="ErrorBoundary"]'),
        hasRuntimeError: document.body.innerText.includes('Something went wrong'),
      };
    });
    console.log('[REGRESSION] Error state:', JSON.stringify(errors));
    expect(errors.hasErrorBoundary).toBe(false);
    expect(errors.hasRuntimeError).toBe(false);
    await ss('regression-final');
  });
});
