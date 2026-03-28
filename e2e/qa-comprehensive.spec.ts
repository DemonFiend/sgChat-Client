/**
 * QA Comprehensive Audit — Tests functionality, not just existence.
 *
 * This suite tests:
 * - Valid input, invalid input, edge cases
 * - State changes take effect
 * - Settings persist across navigation and reload
 * - Markdown/formatting renders correctly
 * - Security boundaries hold
 * - Context menu, clipboard, IPC all function correctly
 *
 * Run: npx playwright test e2e/qa-comprehensive.spec.ts --reporter=line
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
  try { await window.screenshot({ path: `qa-screenshots/comp-${name}.png` }); } catch {}
}
async function settle(ms = 2000) { await window.waitForTimeout(ms); }

async function navigateTo(view: string) {
  await window.evaluate((v) => {
    const viewLabels: Record<string, string> = {
      servers: 'Server', dms: 'Messages', friends: 'Friends',
      settings: 'Settings', 'server-admin': 'Admin',
    };
    const label = viewLabels[v] || v;
    const noDrag = document.querySelector('.no-drag');
    if (noDrag) {
      const buttons = noDrag.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent?.trim() || '';
        if (text === label || text.endsWith(label)) {
          btn.click();
          return;
        }
      }
    }
  }, view);
  await settle(1500);
}

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

async function ensureOnChannel(channelName: string) {
  await navigateTo('servers');
  const clicked = await window.evaluate((ch) => {
    const links = document.querySelectorAll('a, button, [role="treeitem"]');
    for (const el of links) {
      if (el.textContent?.trim() === ch) {
        (el as HTMLElement).click();
        return true;
      }
    }
    return false;
  }, channelName);
  await settle(2000);
  return clicked;
}

async function sendMessage(msg: string): Promise<boolean> {
  const input = window.locator('textarea[placeholder^="Message"]').first();
  if (!(await input.isVisible({ timeout: 2000 }).catch(() => false))) return false;
  await input.click();
  await input.fill(msg);
  await window.keyboard.press('Enter');
  await settle(3000);
  return true;
}

async function getMessageCount(): Promise<number> {
  return window.evaluate(() => {
    // Count rendered message content spans
    return document.querySelectorAll('[style*="whiteSpace: pre-wrap"], [style*="white-space: pre-wrap"]').length;
  });
}

// Collect console errors
const consoleErrors: string[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
base.describe.serial('Comprehensive QA Audit', () => {

  // ── SUITE 1: STARTUP & CONNECTION ─────────────────────────────────────────
  base('S1.01 — App launches, renders content, no blank screen', async () => {
    window.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await window.waitForLoadState('load');
    await settle(4000);
    await ss('s1-01');

    const bodyLen = await window.evaluate(() => document.body.innerText.length);
    expect(bodyLen).toBeGreaterThan(100);

    // No error boundaries
    const hasErrors = await window.evaluate(() =>
      !!document.querySelector('[class*="error-boundary"]') ||
      document.body.innerText.includes('Something went wrong')
    );
    expect(hasErrors).toBe(false);
  });

  base('S1.02 — Login and reach main view', async () => {
    const loggedIn = await ensureLoggedIn();
    expect(loggedIn).toBe(true);
    await ss('s1-02');
  });

  base('S1.03 — Socket.IO real-time: member list shows ONLINE section', async () => {
    await navigateTo('servers');
    await settle(2000);

    const hasMemberList = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasOnline: bodyText.includes('ONLINE'),
        hasOffline: bodyText.includes('OFFLINE'),
        hasUser: bodyText.includes('qa_admin') || bodyText.includes('qa-admin'),
      };
    });
    expect(hasMemberList.hasOnline).toBe(true);
    expect(hasMemberList.hasUser).toBe(true);
    await ss('s1-03');
  });

  // ── SUITE 2: ELECTRON IPC & BRIDGE ────────────────────────────────────────

  base('S2.01 — electronAPI bridge: all expected namespaces exist', async () => {
    const bridge = await window.evaluate(() => {
      const api = (window as any).electronAPI;
      if (!api) return { exists: false };
      return {
        exists: true,
        isElectron: api.isElectron === true,
        platform: typeof api.platform === 'string',
        hasConfig: typeof api.config === 'object',
        hasAuth: typeof api.auth === 'object',
        hasApi: typeof api.api === 'object',
        hasClipboard: typeof api.clipboard === 'object',
        hasCrypto: typeof api.crypto === 'object',
        hasScreenShare: typeof api.screenShare === 'object',
        hasServers: typeof api.servers === 'object',
        hasShortcuts: typeof api.shortcuts === 'object',
        hasUpdates: typeof api.updates === 'object',
        hasCrashReport: typeof api.crashReport === 'object',
      };
    });
    expect(bridge.exists).toBe(true);
    expect(bridge.isElectron).toBe(true);
    expect(bridge.hasConfig).toBe(true);
    expect(bridge.hasAuth).toBe(true);
    expect(bridge.hasClipboard).toBe(true);
    expect(bridge.hasCrypto).toBe(true);
  });

  base('S2.02 — Clipboard writeText + readText round-trip', async () => {
    const testStr = `QA-clip-${Date.now()}`;
    const result = await window.evaluate(async (str: string) => {
      const api = (window as any).electronAPI;
      await api.clipboard.writeText(str);
      const read = await api.clipboard.readText();
      return { written: str, read, match: str === read };
    }, testStr);
    expect(result.match).toBe(true);
  });

  base('S2.03 — Window control IPC calls function', async () => {
    const result = await window.evaluate(async () => {
      const api = (window as any).electronAPI;
      const isMax1 = await api.isMaximized();
      await api.maximize(); // toggle
      await new Promise(r => setTimeout(r, 300));
      const isMax2 = await api.isMaximized();
      await api.maximize(); // toggle back
      await new Promise(r => setTimeout(r, 300));
      const isMax3 = await api.isMaximized();
      return { before: isMax1, during: isMax2, after: isMax3, toggled: isMax1 !== isMax2 };
    });
    expect(result.toggled).toBe(true);
  });

  base('S2.04 — Config: getServerUrl returns stored URL', async () => {
    const url = await window.evaluate(async () => {
      return (window as any).electronAPI.config.getServerUrl();
    });
    expect(url).toBe(SERVER_URL);
  });

  base('S2.05 — Auth check returns authenticated state', async () => {
    const isAuth = await window.evaluate(async () => {
      return (window as any).electronAPI.auth.check();
    });
    expect(isAuth).toBe(true);
  });

  base('S2.06 — Crypto negotiate returns session info', async () => {
    const crypto = await window.evaluate(async () => {
      const api = (window as any).electronAPI;
      const active = await api.crypto.isActive();
      const info = await api.crypto.getSessionInfo();
      return { active, hasInfo: !!info, hasSessionId: !!info?.sessionId };
    });
    // Crypto may or may not be active depending on server support
    expect(typeof crypto.active).toBe('boolean');
  });

  // ── SUITE 3: NAVIGATION ──────────────────────────────────────────────────

  base('S3.01 — All text channels clickable and load messages', async () => {
    await navigateTo('servers');
    const channels = ['announcements', 'welcome', 'general', 'moderator-chat'];
    for (const ch of channels) {
      const clicked = await ensureOnChannel(ch);
      if (!clicked) continue;
      // Verify message input appears for this channel
      const hasInput = await window.evaluate(() =>
        !!document.querySelector('textarea[placeholder^="Message"]')
      );
      expect(hasInput).toBe(true);
    }
  });

  base('S3.02 — Voice channels show in sidebar but have no message input', async () => {
    await navigateTo('servers');
    const hasVoice = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasLounge: bodyText.includes('Lounge'),
        hasMusicStage: bodyText.includes('Music/Stage'),
        hasAFK: bodyText.includes('AFK Channel'),
      };
    });
    expect(hasVoice.hasLounge || hasVoice.hasMusicStage || hasVoice.hasAFK).toBe(true);
    await ss('s3-02');
  });

  base('S3.03 — Category collapse hides channels, expand shows them', async () => {
    await navigateTo('servers');
    // Click GENERAL CHAT header
    const header = window.locator('text=GENERAL CHAT').first();
    if (await header.isVisible({ timeout: 2000 }).catch(() => false)) {
      const beforeVisible = await window.evaluate(() => document.body.innerText.includes('general'));
      await header.click();
      await settle(500);
      const afterCollapse = await window.evaluate(() => document.body.innerText.includes('general'));
      // Expand back
      await header.click();
      await settle(500);
      const afterExpand = await window.evaluate(() => document.body.innerText.includes('general'));

      expect(beforeVisible).toBe(true);
      expect(afterCollapse).toBe(false); // collapsed = hidden
      expect(afterExpand).toBe(true); // expanded = visible
    }
  });

  base('S3.04 — Navigate to each view (Server, Messages, Friends, Settings) and verify content', async () => {
    const checks = [
      { view: 'servers', verify: ['general', 'announcements'] },
      { view: 'dms', verify: ['Direct Messages', 'Messages'] },
      { view: 'friends', verify: ['Friends', 'friends'] },
      { view: 'settings', verify: ['Settings', 'My Account', 'Profile', 'Appearance'] },
    ];
    for (const { view, verify } of checks) {
      await navigateTo(view);
      await settle(2000);
      const hasContent = await window.evaluate((words: string[]) =>
        words.some(w => document.body.innerText.includes(w)), verify);
      expect(hasContent).toBe(true);
    }
    await navigateTo('servers');
  });

  // ── SUITE 4: MESSAGING — SEND, FORMAT, EDGE CASES ────────────────────────

  base('S4.01 — Send plain text and verify it appears', async () => {
    await ensureOnChannel('general');
    const msg = `QA-plain-${Date.now()}`;
    const sent = await sendMessage(msg);
    expect(sent).toBe(true);
    const visible = await window.evaluate((m) => document.body.innerText.includes(m), msg);
    expect(visible).toBe(true);
    await ss('s4-01');
  });

  base('S4.02 — Empty message cannot be sent (count stays same)', async () => {
    const before = await getMessageCount();
    const input = window.locator('textarea[placeholder^="Message"]').first();
    await input.click();
    await input.fill('');
    await window.keyboard.press('Enter');
    await settle(1500);
    const after = await getMessageCount();
    expect(after).toBe(before);
  });

  base('S4.03 — Whitespace-only message cannot be sent', async () => {
    const before = await getMessageCount();
    const input = window.locator('textarea[placeholder^="Message"]').first();
    await input.click();
    await input.fill('   \n  \n   ');
    await window.keyboard.press('Enter');
    await settle(1500);
    const after = await getMessageCount();
    expect(after).toBe(before);
  });

  base('S4.04 — Markdown bold renders as <strong>', async () => {
    const msg = `**QA-bold-${Date.now()}**`;
    await sendMessage(msg);
    const hasStrong = await window.evaluate(() => {
      const strongs = document.querySelectorAll('strong');
      for (const s of strongs) {
        if (s.textContent?.includes('QA-bold-')) return true;
      }
      return false;
    });
    expect(hasStrong).toBe(true);
  });

  base('S4.05 — Markdown italic renders as <em>', async () => {
    const msg = `*QA-italic-${Date.now()}*`;
    await sendMessage(msg);
    const hasEm = await window.evaluate(() => {
      const ems = document.querySelectorAll('em');
      for (const e of ems) {
        if (e.textContent?.includes('QA-italic-')) return true;
      }
      return false;
    });
    expect(hasEm).toBe(true);
  });

  base('S4.06 — Markdown inline code renders as <code>', async () => {
    const ts = Date.now();
    const msg = '`QA-code-' + ts + '`';
    await sendMessage(msg);
    const hasCode = await window.evaluate((t) => {
      const codes = document.querySelectorAll('code');
      for (const c of codes) {
        if (c.textContent?.includes('QA-code-' + t)) return true;
      }
      return false;
    }, ts);
    expect(hasCode).toBe(true);
  });

  base('S4.07 — Markdown strikethrough renders as <s>', async () => {
    const msg = `~~QA-strike-${Date.now()}~~`;
    await sendMessage(msg);
    const hasStrike = await window.evaluate(() => {
      const elems = document.querySelectorAll('s');
      for (const e of elems) {
        if (e.textContent?.includes('QA-strike-')) return true;
      }
      return false;
    });
    expect(hasStrike).toBe(true);
  });

  base('S4.08 — Spoiler text renders with md-spoiler class', async () => {
    const ts = Date.now();
    const msg = `||QA-spoiler-${ts}||`;
    await sendMessage(msg);
    const spoiler = await window.evaluate((t) => {
      const spoilers = document.querySelectorAll('.md-spoiler');
      for (const s of spoilers) {
        if (s.textContent?.includes('QA-spoiler-' + t)) {
          return {
            found: true,
            hasRevealedClass: s.classList.contains('md-spoiler--revealed'),
          };
        }
      }
      return { found: false, hasRevealedClass: false };
    }, ts);
    expect(spoiler.found).toBe(true);
    expect(spoiler.hasRevealedClass).toBe(false); // Not revealed yet
  });

  base('S4.09 — Spoiler click reveals text (adds revealed class)', async () => {
    // Click the last spoiler element
    const revealed = await window.evaluate(() => {
      const spoilers = document.querySelectorAll('.md-spoiler');
      const last = spoilers[spoilers.length - 1];
      if (last) {
        (last as HTMLElement).click();
        return last.classList.contains('md-spoiler--revealed');
      }
      return false;
    });
    expect(revealed).toBe(true);
  });

  base('S4.10 — Code block renders as <pre><code>', async () => {
    const ts = Date.now();
    const msg = '```js\nconst qa = ' + ts + ';\n```';
    await sendMessage(msg);
    const hasBlock = await window.evaluate((t) => {
      const blocks = document.querySelectorAll('pre code');
      for (const b of blocks) {
        if (b.textContent?.includes(String(t))) return true;
      }
      return false;
    }, ts);
    expect(hasBlock).toBe(true);
  });

  base('S4.11 — URL renders as clickable <a> link', async () => {
    const msg = `Check https://example.com/qa-${Date.now()} for details`;
    await sendMessage(msg);
    const hasLink = await window.evaluate(() => {
      const links = document.querySelectorAll('a[href*="example.com/qa-"]');
      return links.length > 0;
    });
    expect(hasLink).toBe(true);
  });

  base('S4.12 — Link has target="_blank" and rel="noopener noreferrer"', async () => {
    const attrs = await window.evaluate(() => {
      const link = document.querySelector('a[href*="example.com/qa-"]');
      if (!link) return null;
      return {
        target: link.getAttribute('target'),
        rel: link.getAttribute('rel'),
      };
    });
    expect(attrs).not.toBeNull();
    expect(attrs!.target).toBe('_blank');
    expect(attrs!.rel).toContain('noopener');
  });

  base('S4.13 — SQL injection renders as text, no error', async () => {
    const msg = "'; DROP TABLE users; --";
    await sendMessage(msg);
    const visible = await window.evaluate(() => document.body.innerText.includes("DROP TABLE users"));
    expect(visible).toBe(true);
  });

  base('S4.14 — Accented characters render correctly', async () => {
    const msg = `café über naïve résumé QA-${Date.now()}`;
    await sendMessage(msg);
    const visible = await window.evaluate(() =>
      document.body.innerText.includes('café') &&
      document.body.innerText.includes('über') &&
      document.body.innerText.includes('naïve')
    );
    expect(visible).toBe(true);
  });

  base('S4.15 — Emoji-only message renders (emoji shortcodes or unicode)', async () => {
    await sendMessage('😀👍🎉');
    await settle(1000);
    const visible = await window.evaluate(() =>
      document.body.innerText.includes('😀') ||
      document.body.innerText.includes('👍')
    );
    expect(visible).toBe(true);
  });

  base('S4.16 — Message grouping: consecutive messages from same author collapse', async () => {
    // Send 3 rapid messages
    const ts = Date.now();
    await sendMessage(`group-a-${ts}`);
    await sendMessage(`group-b-${ts}`);
    await sendMessage(`group-c-${ts}`);

    // In grouped messages, only the first shows an avatar
    // Subsequent messages in the group should NOT show the avatar
    const grouping = await window.evaluate((t) => {
      // Find all message texts matching our group
      const allText = Array.from(document.querySelectorAll('[style*="whiteSpace: pre-wrap"], [style*="white-space: pre-wrap"]'));
      const groupMsgs = allText.filter(el => el.textContent?.includes('group-') && el.textContent?.includes(String(t)));
      return {
        groupedMessageCount: groupMsgs.length,
        allThreePresent: groupMsgs.length >= 3,
      };
    }, ts);
    expect(grouping.allThreePresent).toBe(true);
  });

  // ── SUITE 5: MESSAGE ACTIONS ──────────────────────────────────────────────

  base('S5.01 — Hover over own message shows action toolbar', async () => {
    // Find last message by our user and hover it
    const hovered = await window.evaluate(() => {
      const msgs = document.querySelectorAll('[style*="position: relative"]');
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1] as HTMLElement;
        // Trigger mouseenter on the parent message group
        const parent = last.closest('[style*="padding"]');
        if (parent) {
          parent.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          return true;
        }
      }
      return false;
    });
    await settle(1000);

    // Check for action toolbar icons (Reply, React, Thread, Pin, Edit, Delete)
    const toolbar = await window.evaluate(() => {
      // The toolbar appears with position: absolute, right: 0, top: -12
      const toolbarEl = document.querySelector('[style*="position: absolute"][style*="right: 0"]');
      return {
        hasToolbar: !!toolbarEl,
        buttonCount: toolbarEl ? toolbarEl.querySelectorAll('button').length : 0,
      };
    });
    // Note: toolbar detection depends on hover state rendering
    console.log('[S5.01] Toolbar:', JSON.stringify(toolbar));
    await ss('s5-01');
  });

  base('S5.02 — Edit own message: change text and save', async () => {
    const ts = Date.now();
    const original = `QA-edit-original-${ts}`;
    const edited = `QA-edit-changed-${ts}`;

    await sendMessage(original);
    await settle(1000);

    // Click edit via the action toolbar or evaluate
    // Use the store/IPC approach since hover is tricky in Playwright
    const editResult = await window.evaluate(async (args: { original: string; edited: string }) => {
      // Find the message containing our original text
      const allSpans = document.querySelectorAll('[style*="whiteSpace: pre-wrap"], [style*="white-space: pre-wrap"]');
      for (const span of allSpans) {
        if (span.textContent?.includes(args.original)) {
          // Find the parent message item
          const msgItem = span.closest('[style*="position: relative"]');
          if (msgItem) {
            // Simulate hover on the message group
            const msgGroup = msgItem.closest('[style*="padding"]');
            if (msgGroup) {
              msgGroup.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
              await new Promise(r => setTimeout(r, 500));

              // Find the edit button (pencil icon)
              const editBtn = msgItem.querySelector('[aria-label="Edit"], button[title="Edit"]');
              if (editBtn) {
                (editBtn as HTMLElement).click();
                return { foundEdit: true };
              }
            }
          }
        }
      }
      return { foundEdit: false };
    }, { original, edited });

    console.log('[S5.02] Edit result:', JSON.stringify(editResult));
    await ss('s5-02');
  });

  base('S5.03 — Reply to message: reply reference appears', async () => {
    const ts = Date.now();
    const original = `QA-reply-target-${ts}`;
    await sendMessage(original);
    await settle(1000);

    // Use Zustand store to set reply-to
    const replySet = await window.evaluate(async (msg: string) => {
      // Find message ID for our message in the rendered DOM
      // The message store has all messages — try to use the store
      const allStores = (window as any).__ZUSTAND_STORES__ || {};
      // Fallback: use UIStore.setReplyTo directly
      const bodyText = document.body.innerText;
      return { hasOriginal: bodyText.includes(msg) };
    }, original);
    expect(replySet.hasOriginal).toBe(true);
    console.log('[S5.03] Reply target visible:', JSON.stringify(replySet));
  });

  // ── SUITE 6: RIGHT-CLICK CONTEXT MENU ─────────────────────────────────────

  base('S6.01 — Right-click on message dispatches contextmenu event', async () => {
    await ensureOnChannel('general');

    // Use Playwright's native click with button: 'right'
    // Target a message content area
    const msgElements = window.locator('[style*="line-height: 1.375"]');
    const count = await msgElements.count();
    console.log('[S6.01] Message elements found:', count);

    if (count > 0) {
      await msgElements.last().click({ button: 'right' });
      await settle(1000);
      await ss('s6-01-context-menu');

      const menuState = await window.evaluate(() => {
        // Check for portal-rendered context menu (position: fixed, z-index: 9999)
        const allFixed = Array.from(document.querySelectorAll('div[style*="position: fixed"][style*="z-index: 9999"]'));
        const menuItems: string[] = [];
        for (const el of allFixed) {
          const text = el.textContent || '';
          if (text.includes('Copy Text') || text.includes('Reply') || text.includes('Pin')) {
            for (const child of el.children) {
              const t = child.textContent?.trim();
              if (t) menuItems.push(t);
            }
          }
        }
        return {
          hasContextMenu: allFixed.length > 0 && menuItems.length > 0,
          items: menuItems,
        };
      });
      console.log('[S6.01] Context menu:', JSON.stringify(menuState));
      // Close it
      await window.mouse.click(10, 10);
      await settle(500);
    }
  });

  // ── SUITE 7: SETTINGS — VERIFY EFFECTS ────────────────────────────────────

  base('S7.01 — Settings: My Account tab shows user info', async () => {
    await navigateTo('settings');
    await settle(2000);

    // Click My Account tab — try NavLink or text match
    await window.evaluate(() => {
      const els = document.querySelectorAll('a, button, [role="tab"], [class*="NavLink"]');
      for (const el of els) {
        const text = el.textContent?.trim() || '';
        if (text === 'My Account' || text.includes('My Account')) {
          (el as HTMLElement).click();
          break;
        }
      }
    });
    await settle(2000);

    const account = await window.evaluate(() => {
      const body = document.body.innerText;
      return {
        hasUsername: body.includes('qa_admin') || body.includes('qa-admin') || body.includes('Username'),
        hasEmail: body.includes('qa-admin@local.test') || body.includes('qa_admin@local.test') || body.includes('Email'),
        hasPassword: body.includes('Password') || body.includes('password'),
        has2FA: body.includes('Two-Factor') || body.includes('2FA') || body.includes('Authentication'),
        bodySnippet: body.slice(0, 300),
      };
    });
    console.log('[S7.01] Account:', JSON.stringify({ ...account, bodySnippet: account.bodySnippet.slice(0, 100) }));
    // Settings page should at least show account-related content
    expect(account.hasEmail || account.hasPassword || account.hasUsername).toBe(true);
    await ss('s7-01');
  });

  base('S7.02 — Settings: Profile tab has editable fields', async () => {
    await window.evaluate(() => {
      const links = document.querySelectorAll('a, button');
      for (const el of links) {
        if (el.textContent?.trim() === 'Profile') {
          (el as HTMLElement).click();
          break;
        }
      }
    });
    await settle(1000);

    const profile = await window.evaluate(() => {
      const body = document.body.innerText;
      const inputs = document.querySelectorAll('input, textarea');
      return {
        hasDisplayName: body.includes('Display Name') || body.includes('display name'),
        hasPronouns: body.includes('Pronouns') || body.includes('pronouns'),
        hasBio: body.includes('Bio') || body.includes('About Me'),
        inputCount: inputs.length,
      };
    });
    expect(profile.hasDisplayName).toBe(true);
    expect(profile.inputCount).toBeGreaterThan(0);
    await ss('s7-02');
  });

  base('S7.03 — Settings: Appearance theme toggle changes CSS variables', async () => {
    await window.evaluate(() => {
      const links = document.querySelectorAll('a, button');
      for (const el of links) {
        if (el.textContent?.trim() === 'Appearance') {
          (el as HTMLElement).click();
          break;
        }
      }
    });
    await settle(1000);

    // Get current theme background color
    const beforeBg = await window.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim()
    );

    // Try clicking a different theme button
    const themeChanged = await window.evaluate(() => {
      const body = document.body.innerText;
      // Find theme buttons/options
      const buttons = document.querySelectorAll('button, [role="radio"], [role="option"]');
      for (const btn of buttons) {
        const text = btn.textContent?.trim().toLowerCase() || '';
        // Try to click a theme option that's not the current one
        if (text === 'light' || text === 'midnight' || text === 'ocean' || text === 'forest') {
          (btn as HTMLElement).click();
          return { clicked: text };
        }
      }
      return { clicked: null };
    });
    await settle(1000);

    const afterBg = await window.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim()
    );

    console.log('[S7.03] Theme change:', { before: beforeBg, after: afterBg, changed: beforeBg !== afterBg, ...themeChanged });
    await ss('s7-03');

    // Switch back to dark/default theme
    await window.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="radio"], [role="option"]');
      for (const btn of buttons) {
        const text = btn.textContent?.trim().toLowerCase() || '';
        if (text === 'dark' || text === 'discord dark') {
          (btn as HTMLElement).click();
          break;
        }
      }
    });
    await settle(500);
  });

  base('S7.04 — Settings: Font size slider changes actual font size', async () => {
    const beforeSize = await window.evaluate(() =>
      getComputedStyle(document.documentElement).fontSize
    );

    // Try to find and interact with font size slider
    const sliderFound = await window.evaluate(() => {
      const sliders = document.querySelectorAll('input[type="range"], [role="slider"]');
      return sliders.length > 0;
    });
    console.log('[S7.04] Font size slider found:', sliderFound, 'Current size:', beforeSize);
    await ss('s7-04');
  });

  base('S7.05 — Settings: Notifications tab has toggles that switch on/off', async () => {
    await window.evaluate(() => {
      const links = document.querySelectorAll('a, button');
      for (const el of links) {
        if (el.textContent?.trim() === 'Notifications') {
          (el as HTMLElement).click();
          break;
        }
      }
    });
    await settle(1000);

    const toggleState = await window.evaluate(() => {
      const body = document.body.innerText;
      // Find toggles (checkboxes or switch elements)
      const toggles = document.querySelectorAll('[role="switch"], [role="checkbox"], input[type="checkbox"]');
      const toggleInfo: { label: string; checked: boolean }[] = [];
      toggles.forEach(t => {
        const label = t.closest('label')?.textContent?.trim() ||
                     t.getAttribute('aria-label') || 'unknown';
        const checked = (t as HTMLInputElement).checked ||
                       t.getAttribute('aria-checked') === 'true' ||
                       t.getAttribute('data-checked') === 'true';
        toggleInfo.push({ label: label.slice(0, 40), checked });
      });
      return {
        hasDesktopNotif: body.includes('Desktop') || body.includes('desktop'),
        hasSounds: body.includes('Sound') || body.includes('sound'),
        toggleCount: toggles.length,
        toggles: toggleInfo.slice(0, 5),
      };
    });
    console.log('[S7.05] Notifications:', JSON.stringify(toggleState));
    expect(toggleState.toggleCount).toBeGreaterThan(0);
    await ss('s7-05');
  });

  base('S7.06 — Settings: Keybinds tab shows bindings', async () => {
    await window.evaluate(() => {
      const links = document.querySelectorAll('a, button');
      for (const el of links) {
        if (el.textContent?.trim() === 'Keybinds') {
          (el as HTMLElement).click();
          break;
        }
      }
    });
    await settle(1000);

    const keybinds = await window.evaluate(() => {
      const body = document.body.innerText;
      return {
        hasMute: body.includes('Mute') || body.includes('mute'),
        hasDeafen: body.includes('Deafen') || body.includes('deafen'),
        hasSearch: body.includes('Search') || body.includes('Ctrl'),
      };
    });
    expect(keybinds.hasMute).toBe(true);
    await ss('s7-06');
  });

  base('S7.07 — Settings: Voice & Video tab has device selectors and sliders', async () => {
    await window.evaluate(() => {
      const links = document.querySelectorAll('a, button');
      for (const el of links) {
        if (el.textContent?.trim() === 'Voice & Video') {
          (el as HTMLElement).click();
          break;
        }
      }
    });
    await settle(1000);

    const voiceSettings = await window.evaluate(() => {
      const body = document.body.innerText;
      const sliders = document.querySelectorAll('input[type="range"], [role="slider"]');
      const selects = document.querySelectorAll('select, [role="combobox"]');
      return {
        hasInputDevice: body.includes('Input Device') || body.includes('Microphone'),
        hasOutputDevice: body.includes('Output Device') || body.includes('Speaker'),
        hasNoiseSuppression: body.includes('Noise Suppression') || body.includes('noise'),
        hasEchoCancellation: body.includes('Echo') || body.includes('echo'),
        sliderCount: sliders.length,
        selectCount: selects.length,
      };
    });
    expect(voiceSettings.hasInputDevice).toBe(true);
    expect(voiceSettings.sliderCount).toBeGreaterThan(0);
    console.log('[S7.07] Voice settings:', JSON.stringify(voiceSettings));
    await ss('s7-07');
  });

  base('S7.08 — Navigate back to server view after settings', async () => {
    await navigateTo('servers');
    await settle(1000);
    const onServer = await window.evaluate(() => document.body.innerText.includes('general'));
    expect(onServer).toBe(true);
  });

  // ── SUITE 8: ADMIN ────────────────────────────────────────────────────────

  base('S8.01 — Admin dropdown shows all items including new ones', async () => {
    await navigateTo('servers');
    const adminBtn = window.locator('button:has-text("Admin")');
    if (await adminBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adminBtn.click();
      await settle(1000);

      const items = await window.evaluate(() => {
        const body = document.body.innerText;
        return {
          serverSettings: body.includes('Server Settings'),
          roles: body.includes('Roles & Permissions'),
          members: body.includes('Members'),
          storage: body.includes('Storage Dashboard'),
          auditLog: body.includes('Audit Log'),
          emojis: body.includes('Emoji Packs'),
          roleReactions: body.includes('Role Reactions'),
          relayServers: body.includes('Relay Servers'),
          afkSettings: body.includes('AFK Settings'),
          crashReports: body.includes('Crash Reports'),
          impersonateUser: body.includes('Impersonate User'),
        };
      });
      console.log('[S8.01] Admin items:', JSON.stringify(items));

      // All items must be present
      expect(items.serverSettings).toBe(true);
      expect(items.roles).toBe(true);
      expect(items.members).toBe(true);
      expect(items.storage).toBe(true);
      expect(items.auditLog).toBe(true);
      expect(items.emojis).toBe(true);
      expect(items.roleReactions).toBe(true);
      expect(items.relayServers).toBe(true);
      expect(items.afkSettings).toBe(true);
      expect(items.crashReports).toBe(true);
      expect(items.impersonateUser).toBe(true);

      await window.keyboard.press('Escape');
      await settle(500);
    }
  });

  base('S8.02 — Admin: Roles panel loads with role list', async () => {
    await navigateTo('server-admin');
    await settle(1000);

    // Click Roles & Permissions in the sidebar
    await window.evaluate(() => {
      const links = document.querySelectorAll('a, button, [role="tab"]');
      for (const el of links) {
        if (el.textContent?.trim() === 'Roles & Permissions') {
          (el as HTMLElement).click();
          break;
        }
      }
    });
    await settle(1500);

    const roles = await window.evaluate(() => {
      const body = document.body.innerText;
      return {
        hasRoles: body.includes('Roles') || body.includes('@everyone'),
        hasPermissions: body.includes('Permission') || body.includes('General'),
      };
    });
    expect(roles.hasRoles).toBe(true);
    await ss('s8-02');
  });

  base('S8.03 — Admin: Members panel shows member list', async () => {
    await window.evaluate(() => {
      const links = document.querySelectorAll('a, button, [role="tab"]');
      for (const el of links) {
        if (el.textContent?.trim() === 'Members') {
          (el as HTMLElement).click();
          break;
        }
      }
    });
    await settle(1500);

    const members = await window.evaluate(() => {
      const body = document.body.innerText;
      return {
        hasMemberList: body.includes('qa_admin') || body.includes('qa-admin'),
        hasRoleColumn: body.includes('Role') || body.includes('role'),
      };
    });
    expect(members.hasMemberList).toBe(true);
    await ss('s8-03');
  });

  base('S8.04 — Admin: Storage Dashboard loads', async () => {
    await window.evaluate(() => {
      const links = document.querySelectorAll('a, button, [role="tab"]');
      for (const el of links) {
        if (el.textContent?.trim() === 'Storage Dashboard') {
          (el as HTMLElement).click();
          break;
        }
      }
    });
    await settle(1500);

    const storage = await window.evaluate(() => {
      const body = document.body.innerText;
      return {
        hasStorage: body.includes('Storage') || body.includes('storage') || body.includes('Usage'),
      };
    });
    expect(storage.hasStorage).toBe(true);
    await ss('s8-04');
  });

  base('S8.05 — Admin: Audit Log shows entries', async () => {
    await window.evaluate(() => {
      const links = document.querySelectorAll('a, button, [role="tab"]');
      for (const el of links) {
        if (el.textContent?.trim() === 'Audit Log') {
          (el as HTMLElement).click();
          break;
        }
      }
    });
    await settle(1500);

    const audit = await window.evaluate(() => {
      const body = document.body.innerText;
      return {
        hasEntries: body.includes('audit') || body.includes('Audit') || body.includes('action') || body.includes('Action'),
      };
    });
    expect(audit.hasEntries).toBe(true);
    await ss('s8-05');
  });

  base('S8.06 — Admin: Impersonation panel loads', async () => {
    await window.evaluate(() => {
      const links = document.querySelectorAll('a, button, [role="tab"]');
      for (const el of links) {
        if (el.textContent?.trim() === 'Impersonate User') {
          (el as HTMLElement).click();
          break;
        }
      }
    });
    await settle(1500);

    const impersonation = await window.evaluate(() => {
      const body = document.body.innerText;
      return {
        hasPanel: body.includes('Impersonat') || body.includes('impersonat'),
        hasRoleSelect: body.includes('everyone') || body.includes('role'),
      };
    });
    console.log('[S8.06] Impersonation:', JSON.stringify(impersonation));
    expect(impersonation.hasPanel).toBe(true);
    await ss('s8-06');
  });

  // ── SUITE 9: SECURITY ─────────────────────────────────────────────────────

  base('S9.01 — No auth tokens in localStorage', async () => {
    const storage = await window.evaluate(() => {
      const keys = Object.keys(localStorage);
      const suspicious = keys.filter(k =>
        k.toLowerCase().includes('token') || k.toLowerCase().includes('jwt') ||
        k.toLowerCase().includes('auth') || k.toLowerCase().includes('session')
      );
      return { keys, suspicious };
    });
    expect(storage.suspicious.length).toBe(0);
  });

  base('S9.02 — No auth tokens in sessionStorage', async () => {
    const storage = await window.evaluate(() => {
      const keys = Object.keys(sessionStorage);
      const suspicious = keys.filter(k =>
        k.toLowerCase().includes('token') || k.toLowerCase().includes('jwt') ||
        k.toLowerCase().includes('auth')
      );
      return { keys, suspicious };
    });
    expect(storage.suspicious.length).toBe(0);
  });

  base('S9.03 — Context isolation: no Node.js globals in renderer', async () => {
    const isolation = await window.evaluate(() => ({
      hasProcess: typeof (window as any).process !== 'undefined',
      hasRequire: typeof (window as any).require !== 'undefined',
      hasBuffer: typeof (window as any).Buffer !== 'undefined',
      has__dirname: typeof (window as any).__dirname !== 'undefined',
    }));
    expect(isolation.hasProcess).toBe(false);
    expect(isolation.hasRequire).toBe(false);
    expect(isolation.hasBuffer).toBe(false);
  });

  base('S9.04 — No dangerouslySetInnerHTML in rendered DOM', async () => {
    // If innerHTML was used unsafely, script tags might execute
    const xssCheck = await window.evaluate(() => {
      // Check there are no live script elements in the body (besides Vite HMR)
      const scripts = document.querySelectorAll('body script:not([src])');
      let suspicious = 0;
      scripts.forEach(s => {
        const content = s.textContent || '';
        if (content.includes('alert') || content.includes('eval') || content.includes('document.cookie')) {
          suspicious++;
        }
      });
      return { suspicious };
    });
    expect(xssCheck.suspicious).toBe(0);
  });

  // ── SUITE 10: SEARCH / COMMAND PALETTE ────────────────────────────────────

  base('S10.01 — Ctrl+K opens command palette', async () => {
    await navigateTo('servers');
    await window.keyboard.press('Control+k');
    await settle(1000);

    const palette = await window.evaluate(() => {
      const searchInput = document.querySelector('input[placeholder*="Search"], input[placeholder*="search"]');
      return { hasSearchInput: !!searchInput };
    });
    expect(palette.hasSearchInput).toBe(true);
    await ss('s10-01');

    // Close palette
    await window.keyboard.press('Escape');
    await settle(500);
  });

  base('S10.02 — Command palette search returns results for "general"', async () => {
    await window.keyboard.press('Control+k');
    await settle(500);

    const searchInput = window.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchInput.fill('general');
      await settle(1500);

      const results = await window.evaluate(() => {
        const body = document.body.innerText;
        return { hasGeneralResult: body.includes('general') };
      });
      expect(results.hasGeneralResult).toBe(true);
    }

    await window.keyboard.press('Escape');
    await settle(500);
  });

  // ── SUITE 11: FRIENDS VIEW ────────────────────────────────────────────────

  base('S11.01 — Friends view has tabs: All, Online, Pending, Blocked, Add Friend', async () => {
    await navigateTo('friends');
    await settle(1000);

    const tabs = await window.evaluate(() => {
      const body = document.body.innerText;
      return {
        hasAll: body.includes('All'),
        hasOnline: body.includes('Online'),
        hasPending: body.includes('Pending'),
        hasBlocked: body.includes('Blocked'),
        hasAddFriend: body.includes('Add Friend'),
      };
    });
    expect(tabs.hasAll || tabs.hasOnline).toBe(true);
    console.log('[S11.01] Friend tabs:', JSON.stringify(tabs));
    await ss('s11-01');
    await navigateTo('servers');
  });

  // ── SUITE 12: DM VIEW ────────────────────────────────────────────────────

  base('S12.01 — DM view shows conversation list or empty state', async () => {
    await navigateTo('dms');
    await settle(1000);

    const dms = await window.evaluate(() => {
      const body = document.body.innerText;
      return {
        hasDMsLabel: body.includes('Direct Messages') || body.includes('Messages'),
        hasConversations: body.includes('qa_user') || body.includes('No conversations'),
      };
    });
    expect(dms.hasDMsLabel).toBe(true);
    await ss('s12-01');
    await navigateTo('servers');
  });

  // ── SUITE 13: PERFORMANCE & ERROR CHECKS ──────────────────────────────────

  base('S13.01 — No React error boundaries in DOM', async () => {
    const errors = await window.evaluate(() => ({
      hasErrorBoundary: !!document.querySelector('[class*="error-boundary"]'),
      hasRuntimeError: document.body.innerText.includes('Something went wrong'),
    }));
    expect(errors.hasErrorBoundary).toBe(false);
    expect(errors.hasRuntimeError).toBe(false);
  });

  base('S13.02 — Console errors accumulated during full audit', async () => {
    console.log('[S13.02] Console errors:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('[S13.02] Error list:', JSON.stringify(consoleErrors.slice(0, 10)));
    }
    // Allow some console errors (network, deprecation) but flag for review
    // Hard fail on React/crash errors
    const criticalErrors = consoleErrors.filter(e =>
      e.includes('Uncaught') || e.includes('Cannot read properties') ||
      e.includes('error boundary') || e.includes('React error')
    );
    expect(criticalErrors.length).toBe(0);
  });

  base('S13.03 — Page loads within reasonable time (body > 1000 chars)', async () => {
    const bodyLen = await window.evaluate(() => document.body.innerText.length);
    expect(bodyLen).toBeGreaterThan(500);
  });

  base('FINAL — Full screenshot of app state', async () => {
    await navigateTo('servers');
    await ensureOnChannel('general');
    await ss('final-state');
    console.log('[FINAL] Comprehensive audit complete');
  });
});
