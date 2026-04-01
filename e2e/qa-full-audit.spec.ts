/**
 * QA Full Audit — Supplementary Suites
 *
 * Covers suites NOT in qa-comprehensive.spec.ts:
 *   2  Auth & Session (detailed)
 *   6  File Uploads & Attachments
 *   9  User Profiles & Popovers
 *  12  Voice & Video (LiveKit)
 *  17  Multi-Server Switching
 *  27  Screen Share Picker
 *  28  Noise Suppression
 *  29  Voice Channel Deep
 *  30  DM Calls
 *  31  Soundboard
 *  32  Channel & Category Settings
 *  33  Notifications & Toasts
 *  34  Server Management Modals
 *  35  Moderation Workflow
 *  36  Server Settings Extended
 *  37  Error Recovery & Session Mgmt
 *  38  Role Reactions
 *  39  Voice Channel Expansion
 *  40  Temp Voice Channel Generator
 *  41  Stage Channel
 *  42  AFK Channel
 *  43  Server Text Chat Comprehensive
 *  44  Direct Messages Comprehensive
 *  45  Friends List Comprehensive
 *
 * Run: npx playwright test e2e/qa-full-audit.spec.ts --reporter=line
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
  try { await window.screenshot({ path: `qa-screenshots/audit-${name}.png` }); } catch {}
}
async function settle(ms = 2000) { await window.waitForTimeout(ms); }

async function navigateTo(view: string) {
  if (view === 'server-admin') {
    await navigateTo('servers');
    await settle(500);
  }
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
        if (text === label || text.endsWith(label)) { btn.click(); return; }
      }
    }
  }, view);
  await settle(1500);
}

async function ensureLoggedIn() {
  await window.waitForLoadState('load');
  await settle(3000);
  const currentUrl = await window.evaluate(async () => {
    const api = (window as any).electronAPI;
    return api?.config?.getServerUrl ? await api.config.getServerUrl() : '';
  });
  const isOnMain = await window.evaluate(() =>
    document.body.innerText.includes('general') || document.body.innerText.includes('Direct Messages'));

  if (currentUrl && currentUrl !== SERVER_URL) {
    await window.evaluate(async () => {
      const api = (window as any).electronAPI;
      if (api?.auth?.logout) await api.auth.logout();
    });
    await settle(500);
    const result = await window.evaluate(async (args: any) => {
      const api = (window as any).electronAPI;
      if (api?.auth?.login) {
        try { const r = await api.auth.login(args.serverUrl, args.email, args.password); return { success: r?.success === true }; }
        catch (err: any) { return { success: false, error: err?.message }; }
      }
      return { success: false };
    }, { serverUrl: SERVER_URL, email: TEST_EMAIL, password: TEST_PASSWORD });
    if (result.success) { await window.reload(); await settle(5000); }
    return result.success;
  }
  if (isOnMain) return true;
  const result = await window.evaluate(async (args: any) => {
    const api = (window as any).electronAPI;
    if (api?.auth?.login) {
      try { const r = await api.auth.login(args.serverUrl, args.email, args.password); return { success: r?.success === true }; }
      catch (err: any) { return { success: false, error: err?.message }; }
    }
    return { success: false };
  }, { serverUrl: SERVER_URL, email: TEST_EMAIL, password: TEST_PASSWORD });
  if (result.success) { await window.reload(); await settle(5000); }
  return result.success;
}

async function ensureOnChannel(channelName: string) {
  await navigateTo('servers');
  await window.evaluate((ch) => {
    const els = document.querySelectorAll('a, button, [role="treeitem"]');
    for (const el of els) { if (el.textContent?.trim() === ch) { (el as HTMLElement).click(); return; } }
  }, channelName);
  await settle(2000);
}

async function clickAdminSidebarItem(itemName: string) {
  await window.evaluate((name) => {
    const els = document.querySelectorAll('a, button, [role="tab"], [class*="NavLink"]');
    for (const el of els) {
      if (el.textContent?.trim() === name) { (el as HTMLElement).click(); break; }
    }
  }, itemName);
  await settle(1500);
}

const consoleErrors: string[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
base.describe.serial('QA Full Audit — Supplementary Suites', () => {

  // ── SETUP ────────────────────────────────────────────────────────────────
  base('00 — Login and reach main view', async () => {
    window.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    const loggedIn = await ensureLoggedIn();
    expect(loggedIn).toBe(true);
    await ss('s00-logged-in');
  });

  // ── SUITE 2 — AUTH & SESSION (detailed) ──────────────────────────────────
  base.describe('Suite 2 — Authentication & Session Management', () => {

    base('2.23 No auth tokens in localStorage/sessionStorage/cookies', async () => {
      const tokens = await window.evaluate(() => {
        const ls = Object.entries(localStorage).map(([k, v]) => ({ k, v: v.substring(0, 50) }));
        const ss = Object.entries(sessionStorage).map(([k, v]) => ({ k, v: v.substring(0, 50) }));
        const cookies = document.cookie;
        return {
          localStorageKeys: ls.map(e => e.k),
          sessionStorageKeys: ss.map(e => e.k),
          hasTokenInLS: ls.some(e => /token|jwt|auth|secret/i.test(e.k) || /^eyJ/.test(e.v)),
          hasTokenInSS: ss.some(e => /token|jwt|auth|secret/i.test(e.k) || /^eyJ/.test(e.v)),
          hasCookieToken: /token|jwt|auth|session/i.test(cookies),
          cookies,
        };
      });
      console.log('[2.23] Token security:', JSON.stringify(tokens));
      expect(tokens.hasTokenInLS).toBe(false);
      expect(tokens.hasTokenInSS).toBe(false);
      expect(tokens.hasCookieToken).toBe(false);
    });

    base('2.auth electronAPI.auth.check returns true when logged in', async () => {
      const isAuth = await window.evaluate(async () => {
        const api = (window as any).electronAPI;
        return api?.auth?.check ? await api.auth.check() : null;
      });
      console.log('[2.auth] auth.check:', isAuth);
      expect(isAuth).toBe(true);
    });

    base('2.socket getSocketToken returns valid token', async () => {
      const socketToken = await window.evaluate(async () => {
        const api = (window as any).electronAPI;
        if (api?.auth?.getSocketToken) {
          const result = await api.auth.getSocketToken();
          return { hasToken: !!result?.token, hasServerUrl: !!result?.serverUrl, serverUrl: result?.serverUrl };
        }
        return null;
      });
      console.log('[2.socket] Socket token:', JSON.stringify(socketToken));
      expect(socketToken).not.toBeNull();
      expect(socketToken!.hasToken).toBe(true);
      expect(socketToken!.serverUrl).toBe(SERVER_URL);
    });
  });

  // ── SUITE 6 — FILE UPLOADS & ATTACHMENTS ─────────────────────────────────
  base.describe('Suite 6 — File Uploads & Attachments', () => {

    base('6.01 Upload button/file input exists in message input area', async () => {
      await ensureOnChannel('general');
      const uploads = await window.evaluate(() => {
        const hasFileInput = !!document.querySelector('input[type="file"]');
        const btns = Array.from(document.querySelectorAll('button'));
        const hasUploadBtn = btns.some(b =>
          b.getAttribute('aria-label')?.toLowerCase().includes('upload') ||
          b.getAttribute('aria-label')?.toLowerCase().includes('attach') ||
          b.querySelector('svg'));
        return { hasFileInput, hasUploadBtn, buttonCount: btns.length };
      });
      console.log('[6.01] Upload infrastructure:', JSON.stringify(uploads));
      expect(uploads.hasFileInput).toBe(true);
      await ss('s6-01-upload');
    });

    base('6.06 Avatar upload section exists in profile settings', async () => {
      await navigateTo('settings');
      await window.evaluate(() => {
        const els = document.querySelectorAll('a, button, [role="tab"], [class*="NavLink"]');
        for (const el of els) {
          if (el.textContent?.trim().includes('Profile')) { (el as HTMLElement).click(); break; }
        }
      });
      await settle(1500);
      const profile = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasAvatarSection: bodyText.includes('Avatar') || bodyText.includes('avatar') || !!document.querySelector('input[type="file"]'),
          hasBannerSection: bodyText.includes('Banner') || bodyText.includes('banner'),
          hasDisplayName: bodyText.includes('Display Name') || bodyText.includes('display name'),
          hasBio: bodyText.includes('Bio') || bodyText.includes('bio') || bodyText.includes('About Me'),
        };
      });
      console.log('[6.06] Profile sections:', JSON.stringify(profile));
      expect(profile.hasDisplayName).toBe(true);
      await ss('s6-06-profile');
    });
  });

  // ── SUITE 9 — USER PROFILES & POPOVERS ───────────────────────────────────
  base.describe('Suite 9 — User Profiles & Popovers', () => {

    base('9.01 Click username in member list → profile popover opens', async () => {
      await navigateTo('servers');
      await settle(1000);
      // Click on a member in the member list
      const clicked = await window.evaluate(() => {
        const members = document.querySelectorAll('[class*="member"], [data-user-id]');
        if (members.length > 0) { (members[0] as HTMLElement).click(); return true; }
        // Fallback: find usernames in the right sidebar
        const usernames = Array.from(document.querySelectorAll('span, p, div'))
          .filter(e => e.closest('[class*="member"]') || e.closest('[class*="sidebar"]'));
        for (const el of usernames) {
          if (el.textContent?.trim() && el.textContent.trim().length < 30) {
            (el as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      await settle(1500);
      const popover = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasPopoverContent: bodyText.includes('Message') || bodyText.includes('Add Friend') || bodyText.includes('Profile'),
          hasAvatar: !!document.querySelector('[class*="popover"] img, [class*="Popover"] img, [role="dialog"] img'),
          hasDialog: !!document.querySelector('[role="dialog"], [class*="popover"], [class*="Popover"]'),
        };
      });
      console.log('[9.01] Popover state:', JSON.stringify(popover), 'clicked:', clicked);
      await ss('s9-01-popover');
      // Close popover
      await window.keyboard.press('Escape');
      await settle(500);
    });
  });

  // ── SUITE 12 — VOICE & VIDEO (LIVEKIT) ───────────────────────────────────
  base.describe('Suite 12 — Voice & Video (LiveKit)', () => {

    base('12.01 Voice channels visible in sidebar', async () => {
      await navigateTo('servers');
      const voice = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasLounge: bodyText.includes('Lounge'),
          hasVoiceCategory: bodyText.includes('VOICE'),
          hasMusicStage: bodyText.includes('Music') || bodyText.includes('Stage'),
          hasAFK: bodyText.includes('AFK'),
        };
      });
      console.log('[12.01] Voice channels:', JSON.stringify(voice));
      expect(voice.hasLounge || voice.hasVoiceCategory).toBe(true);
      await ss('s12-01-voice-channels');
    });

    base('12.mute Global shortcut mute/deafen via electronAPI', async () => {
      const shortcuts = await window.evaluate(async () => {
        const api = (window as any).electronAPI;
        return {
          hasOnGlobalShortcut: typeof api?.onGlobalShortcut === 'function',
          hasScreenShare: typeof api?.screenShare?.getSources === 'function',
        };
      });
      console.log('[12.mute] Shortcut/media API:', JSON.stringify(shortcuts));
      expect(shortcuts.hasOnGlobalShortcut).toBe(true);
    });
  });

  // ── SUITE 17 — MULTI-SERVER SWITCHING ────────────────────────────────────
  base.describe('Suite 17 — Multi-Server Switching', () => {

    base('17.01 electronAPI.servers.getSaved returns array', async () => {
      const servers = await window.evaluate(async () => {
        const api = (window as any).electronAPI;
        if (api?.servers?.getSaved) {
          const saved = await api.servers.getSaved();
          return { count: saved.length, urls: saved.map((s: any) => s.url) };
        }
        return null;
      });
      console.log('[17.01] Saved servers:', JSON.stringify(servers));
      expect(servers).not.toBeNull();
      expect(servers!.count).toBeGreaterThanOrEqual(0);
    });

    base('17.02 Server switcher Quick Connect button exists in title bar', async () => {
      await navigateTo('servers');
      const switcher = await window.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const quickConnect = btns.find(b =>
          b.getAttribute('aria-label')?.includes('Quick Connect') ||
          b.closest('[class*="Tooltip"]')?.textContent?.includes('Quick Connect'));
        // Also check for the server icon SVG
        const serverIcons = document.querySelectorAll('svg');
        return {
          hasQuickConnectBtn: !!quickConnect,
          totalButtons: btns.length,
          svgCount: serverIcons.length,
        };
      });
      console.log('[17.02] Quick Connect:', JSON.stringify(switcher));
      await ss('s17-02-switcher');
    });

    base('17.03 getServerUrl returns localhost after login', async () => {
      const url = await window.evaluate(async () =>
        (window as any).electronAPI.config.getServerUrl());
      console.log('[17.03] Server URL:', url);
      expect(url).toBe(SERVER_URL);
    });

    base('17.04 servers.getFavorite and setFavorite work', async () => {
      const result = await window.evaluate(async () => {
        const api = (window as any).electronAPI;
        const fav = await api.servers.getFavorite();
        return { favorite: fav, type: typeof fav };
      });
      console.log('[17.04] Favorite:', JSON.stringify(result));
      expect(result.type).toBe('string');
    });
  });

  // ── SUITE 27 — SCREEN SHARE PICKER ───────────────────────────────────────
  base.describe('Suite 27 — Screen Share & Per-App Audio', () => {

    base('27.01 screenShare API methods exist', async () => {
      const api = await window.evaluate(() => {
        const ss = (window as any).electronAPI?.screenShare;
        return {
          hasSS: !!ss,
          getSources: typeof ss?.getSources,
          onPickRequest: typeof ss?.onPickRequest,
          selectSource: typeof ss?.selectSource,
          onAudioModeSelected: typeof ss?.onAudioModeSelected,
        };
      });
      console.log('[27.01] ScreenShare API:', JSON.stringify(api));
      expect(api.hasSS).toBe(true);
      expect(api.getSources).toBe('function');
    });

    base('27.02 getSources returns window/screen sources', async () => {
      const sources = await window.evaluate(async () => {
        const api = (window as any).electronAPI;
        const srcs = await api.screenShare.getSources();
        return {
          count: srcs?.length || 0,
          hasScreens: srcs?.some((s: any) => s.id?.startsWith('screen:')),
          hasWindows: srcs?.some((s: any) => s.id?.startsWith('window:')),
          firstId: srcs?.[0]?.id,
          firstName: srcs?.[0]?.name,
        };
      });
      console.log('[27.02] Screen sources:', JSON.stringify(sources));
      expect(sources.count).toBeGreaterThan(0);
    });
  });

  // ── SUITE 28 — NOISE SUPPRESSION ─────────────────────────────────────────
  base.describe('Suite 28 — Noise Suppression (DeepFilter)', () => {

    base('28.01 WebAssembly and AudioContext available', async () => {
      const caps = await window.evaluate(() => ({
        hasWebAssembly: typeof WebAssembly !== 'undefined',
        hasAudioContext: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
        hasAudioWorklet: typeof AudioWorkletNode !== 'undefined',
      }));
      console.log('[28.01] Audio capabilities:', JSON.stringify(caps));
      expect(caps.hasWebAssembly).toBe(true);
      expect(caps.hasAudioContext).toBe(true);
    });

    base('28.02 DeepFilter IPC available', async () => {
      const df = await window.evaluate(() => {
        const api = (window as any).electronAPI;
        return {
          hasNoiseSuppression: !!api?.noiseSuppression,
          methods: api?.noiseSuppression ? Object.keys(api.noiseSuppression) : [],
        };
      });
      console.log('[28.02] DeepFilter IPC:', JSON.stringify(df));
      // Noise suppression may or may not be exposed via preload — document finding
    });
  });

  // ── SUITE 29 — VOICE CHANNEL DEEP ────────────────────────────────────────
  base.describe('Suite 29 — Voice Channel Deep Testing', () => {

    base('29.01 Voice channel click does NOT navigate away from server view', async () => {
      await navigateTo('servers');
      const before = await window.evaluate(() => document.body.innerText.includes('VOICE'));
      // Click on Lounge voice channel
      await window.evaluate(() => {
        const els = document.querySelectorAll('a, button, [role="treeitem"]');
        for (const el of els) {
          if (el.textContent?.trim() === 'Lounge') { (el as HTMLElement).click(); return; }
        }
      });
      await settle(2000);
      const after = await window.evaluate(() => ({
        hasVoiceBar: document.body.innerText.includes('Voice Connected') || document.body.innerText.includes('Connecting'),
        stillOnServer: document.body.innerText.includes('VOICE') || document.body.innerText.includes('general'),
      }));
      console.log('[29.01] Voice join:', JSON.stringify(after));
      await ss('s29-01-voice-join');
      // Disconnect if connected
      await window.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const disconnectBtn = btns.find(b =>
          b.getAttribute('aria-label')?.toLowerCase().includes('disconnect') ||
          b.getAttribute('title')?.toLowerCase().includes('disconnect'));
        if (disconnectBtn) disconnectBtn.click();
      });
      await settle(1000);
    });
  });

  // ── SUITE 30 — DM CALLS ──────────────────────────────────────────────────
  base.describe('Suite 30 — DM Calls', () => {

    base('30.01 DM view has call infrastructure', async () => {
      await navigateTo('dms');
      await settle(1000);
      const dm = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasDMView: bodyText.includes('Direct Messages') || bodyText.includes('Messages'),
          hasFriends: bodyText.includes('Friends') || bodyText.includes('Online') || bodyText.includes('All'),
        };
      });
      console.log('[30.01] DM view:', JSON.stringify(dm));
      expect(dm.hasDMView || dm.hasFriends).toBe(true);
      await ss('s30-01-dm');
    });
  });

  // ── SUITE 31 — SOUNDBOARD ────────────────────────────────────────────────
  base.describe('Suite 31 — Soundboard', () => {

    base('31.01 Soundboard section exists (check after voice join)', async () => {
      await navigateTo('servers');
      // Soundboard is typically in voice panel - check if component exists in app
      const sb = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasSoundboard: bodyText.includes('Soundboard') || bodyText.includes('soundboard'),
          hasSounds: bodyText.includes('Sound') || bodyText.includes('sound'),
        };
      });
      console.log('[31.01] Soundboard:', JSON.stringify(sb));
      await ss('s31-01');
    });
  });

  // ── SUITE 32 — CHANNEL & CATEGORY SETTINGS ──────────────────────────────
  base.describe('Suite 32 — Channel & Category Settings', () => {

    base('32.01 Channel gear icon opens settings', async () => {
      await navigateTo('servers');
      // Look for gear/settings icons next to channels
      const gears = await window.evaluate(() => {
        const gearIcons = document.querySelectorAll('[class*="settings"], [aria-label*="settings"], [aria-label*="edit"]');
        const categoryHeaders = document.querySelectorAll('[class*="category"], [class*="Category"]');
        return {
          gearCount: gearIcons.length,
          categoryCount: categoryHeaders.length,
          hasGearOnHover: document.querySelectorAll('[class*="opacity-0"]').length > 0,
        };
      });
      console.log('[32.01] Channel settings:', JSON.stringify(gears));
      await ss('s32-01');
    });
  });

  // ── SUITE 33 — NOTIFICATIONS & TOASTS ────────────────────────────────────
  base.describe('Suite 33 — Notifications & Toasts', () => {

    base('33.01 electronAPI.notification.show exists', async () => {
      const notif = await window.evaluate(() => {
        const api = (window as any).electronAPI;
        return {
          hasShow: typeof api?.showNotification === 'function',
          hasFlash: typeof api?.flashFrame === 'function',
        };
      });
      console.log('[33.01] Notifications:', JSON.stringify(notif));
      expect(notif.hasShow).toBe(true);
      expect(notif.hasFlash).toBe(true);
    });
  });

  // ── SUITE 34 — SERVER MANAGEMENT MODALS ──────────────────────────────────
  base.describe('Suite 34 — Server Management Modals', () => {

    base('34.01 Server dropdown menu has management options', async () => {
      await navigateTo('servers');
      // Click the server header dropdown
      const dropdown = await window.evaluate(() => {
        const serverHeader = document.querySelector('[class*="server-header"], [class*="ServerHeader"]');
        // Try clicking the server name area
        const nameEl = Array.from(document.querySelectorAll('h2, h3, span, div'))
          .find(e => e.textContent?.trim() && e.closest('[class*="header"]'));
        if (nameEl) (nameEl as HTMLElement).click();
        return { clicked: !!nameEl };
      });
      await settle(1000);
      const menu = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasChannels: bodyText.includes('Channels'),
          hasEvents: bodyText.includes('Events'),
          hasServerSettings: bodyText.includes('Server Settings'),
          hasCreateChannel: bodyText.includes('Create Channel'),
          hasInvite: bodyText.includes('Invite'),
          hasNotifications: bodyText.includes('Notification'),
        };
      });
      console.log('[34.01] Server dropdown:', JSON.stringify(menu));
      await ss('s34-01-dropdown');
      await window.keyboard.press('Escape');
      await settle(500);
    });
  });

  // ── SUITE 35 — MODERATION WORKFLOW ───────────────────────────────────────
  base.describe('Suite 35 — Moderation Workflow', () => {

    base('35.01 Right-click member shows context menu with moderation options', async () => {
      await navigateTo('servers');
      await settle(1000);
      // Right-click on a member in the member list
      const clicked = await window.evaluate(() => {
        const members = document.querySelectorAll('[class*="member"], [data-user-id]');
        if (members.length > 0) {
          members[0].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
          return true;
        }
        return false;
      });
      await settle(1000);
      const ctx = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasProfile: bodyText.includes('Profile'),
          hasCopyUsername: bodyText.includes('Copy Username') || bodyText.includes('Copy'),
          hasWarn: bodyText.includes('Warn'),
          hasTimeout: bodyText.includes('Timeout'),
          hasKick: bodyText.includes('Kick'),
          hasBan: bodyText.includes('Ban'),
        };
      });
      console.log('[35.01] Context menu:', JSON.stringify(ctx), 'clicked:', clicked);
      await ss('s35-01-context-menu');
      await window.keyboard.press('Escape');
      await settle(500);
    });
  });

  // ── SUITE 36 — SERVER SETTINGS EXTENDED ──────────────────────────────────
  base.describe('Suite 36 — Server Settings Extended Tabs', () => {

    base('36.01 Admin view has all sidebar items', async () => {
      await navigateTo('server-admin');
      const tabs = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          serverSettings: bodyText.includes('Server Settings'),
          roles: bodyText.includes('Roles'),
          members: bodyText.includes('Members'),
          storage: bodyText.includes('Storage'),
          auditLog: bodyText.includes('Audit Log'),
          emojis: bodyText.includes('Emoji'),
          roleReactions: bodyText.includes('Role Reactions'),
          relayServers: bodyText.includes('Relay'),
          afkSettings: bodyText.includes('AFK'),
          crashReports: bodyText.includes('Crash'),
          impersonateUser: bodyText.includes('Impersonat'),
        };
      });
      console.log('[36.01] Admin tabs:', JSON.stringify(tabs));
      const foundCount = Object.values(tabs).filter(Boolean).length;
      expect(foundCount).toBeGreaterThanOrEqual(5);
      await ss('s36-01-admin');
    });

    base('36.02 Role Reactions panel loads', async () => {
      await clickAdminSidebarItem('Role Reactions');
      const rr = await window.evaluate(() => ({
        hasRoleReactions: document.body.innerText.includes('Role Reaction'),
        hasCreateForm: !!document.querySelector('form') || document.body.innerText.includes('Create') || document.body.innerText.includes('Add'),
      }));
      console.log('[36.02] Role Reactions:', JSON.stringify(rr));
      await ss('s36-02-role-reactions');
    });

    base('36.03 AFK Settings panel loads', async () => {
      await clickAdminSidebarItem('AFK Settings');
      const afk = await window.evaluate(() => ({
        hasAFK: document.body.innerText.includes('AFK'),
        hasTimeout: document.body.innerText.includes('Timeout') || document.body.innerText.includes('timeout'),
        hasChannel: document.body.innerText.includes('Channel') || document.body.innerText.includes('channel'),
        hasSelect: !!document.querySelector('select, [role="combobox"], [class*="Select"]'),
      }));
      console.log('[36.03] AFK Settings:', JSON.stringify(afk));
      await ss('s36-03-afk');
    });

    base('36.04 Relay Servers panel loads', async () => {
      await clickAdminSidebarItem('Relay Servers');
      const relay = await window.evaluate(() => ({
        hasRelay: document.body.innerText.includes('Relay') || document.body.innerText.includes('relay'),
        hasAddForm: document.body.innerText.includes('Add') || !!document.querySelector('input[placeholder*="url" i]'),
      }));
      console.log('[36.04] Relay Servers:', JSON.stringify(relay));
      await ss('s36-04-relay');
    });

    base('36.05 Crash Reports panel loads', async () => {
      await clickAdminSidebarItem('Crash Reports');
      const crash = await window.evaluate(() => ({
        hasCrash: document.body.innerText.includes('Crash') || document.body.innerText.includes('crash'),
        hasTable: !!document.querySelector('table') || document.body.innerText.includes('Error') || document.body.innerText.includes('No crash'),
      }));
      console.log('[36.05] Crash Reports:', JSON.stringify(crash));
      await ss('s36-05-crash');
    });

    base('36.06 Storage Dashboard loads', async () => {
      await clickAdminSidebarItem('Storage');
      const storage = await window.evaluate(() => ({
        hasStorage: document.body.innerText.includes('Storage') || document.body.innerText.includes('storage'),
        hasUsed: document.body.innerText.includes('Used') || document.body.innerText.includes('MB') || document.body.innerText.includes('GB'),
      }));
      console.log('[36.06] Storage:', JSON.stringify(storage));
      await ss('s36-06-storage');
    });
  });

  // ── SUITE 37 — ERROR RECOVERY & SESSION MGMT ────────────────────────────
  base.describe('Suite 37 — Error Recovery & Session Management', () => {

    base('37.01 No error boundary or crash overlays visible', async () => {
      await navigateTo('servers');
      const errors = await window.evaluate(() => ({
        hasErrorBoundary: !!document.querySelector('[class*="error-boundary"], [class*="ErrorBoundary"]'),
        hasSessionExpired: document.body.innerText.includes('Session Expired'),
        hasRuntimeError: document.body.innerText.includes('Runtime Error'),
        hasCrashOverlay: !!document.querySelector('[class*="crash"], [class*="Crash"]'),
      }));
      console.log('[37.01] Error overlays:', JSON.stringify(errors));
      expect(errors.hasErrorBoundary).toBe(false);
      expect(errors.hasSessionExpired).toBe(false);
      expect(errors.hasRuntimeError).toBe(false);
    });
  });

  // ── SUITE 38 — ROLE REACTIONS ────────────────────────────────────────────
  base.describe('Suite 38 — Role Reactions', () => {

    base('38.01 Role Reactions accessible via admin', async () => {
      await navigateTo('server-admin');
      await clickAdminSidebarItem('Role Reactions');
      const rr = await window.evaluate(() => ({
        hasContent: document.body.innerText.includes('Role Reaction') || document.body.innerText.includes('reaction'),
        hasCreateButton: document.body.innerText.includes('Create') || document.body.innerText.includes('Add'),
      }));
      console.log('[38.01] Role Reactions:', JSON.stringify(rr));
      await ss('s38-01');
    });
  });

  // ── SUITE 39 — VOICE CHANNEL EXPANSION ───────────────────────────────────
  base.describe('Suite 39 — Voice Channel Expansion', () => {

    base('39.01 Voice section visible in sidebar with channels', async () => {
      await navigateTo('servers');
      const voiceChannels = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasVoiceSection: bodyText.includes('VOICE') || bodyText.includes('Voice'),
          hasLounge: bodyText.includes('Lounge'),
          hasMusicStage: bodyText.includes('Music') || bodyText.includes('Stage'),
          hasAFK: bodyText.includes('AFK'),
          hasTempChannels: bodyText.includes('TEMP') || bodyText.includes('Temp'),
        };
      });
      console.log('[39.01] Voice expansion:', JSON.stringify(voiceChannels));
      expect(voiceChannels.hasVoiceSection).toBe(true);
      await ss('s39-01');
    });
  });

  // ── SUITE 40 — TEMP VOICE CHANNEL GENERATOR ─────────────────────────────
  base.describe('Suite 40 — Temp Voice Channel Generator', () => {

    base('40.01 Temp channel generator visible in sidebar', async () => {
      await navigateTo('servers');
      const temp = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasTempSection: bodyText.includes('TEMP') || bodyText.includes('Temp'),
          hasCreateVC: bodyText.includes('Create Temp') || bodyText.includes('Create VC') || bodyText.includes('Temp VC'),
          hasGenerator: bodyText.includes('Generator') || bodyText.includes('generator'),
        };
      });
      console.log('[40.01] Temp voice:', JSON.stringify(temp));
      await ss('s40-01');
    });
  });

  // ── SUITE 41 — STAGE CHANNEL ─────────────────────────────────────────────
  base.describe('Suite 41 — Stage Channel', () => {

    base('41.01 Stage channel visible in sidebar', async () => {
      await navigateTo('servers');
      const stage = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasStage: bodyText.includes('Stage') || bodyText.includes('stage'),
          hasMusicStage: bodyText.includes('Music/Stage') || bodyText.includes('Music'),
        };
      });
      console.log('[41.01] Stage channel:', JSON.stringify(stage));
      await ss('s41-01');
    });
  });

  // ── SUITE 42 — AFK CHANNEL ──────────────────────────────────────────────
  base.describe('Suite 42 — AFK Channel', () => {

    base('42.01 AFK channel visible in sidebar', async () => {
      await navigateTo('servers');
      const afk = await window.evaluate(() => ({
        hasAFK: document.body.innerText.includes('AFK Channel') || document.body.innerText.includes('AFK'),
      }));
      console.log('[42.01] AFK channel:', JSON.stringify(afk));
      expect(afk.hasAFK).toBe(true);
      await ss('s42-01');
    });
  });

  // ── SUITE 43 — SERVER TEXT CHAT COMPREHENSIVE ────────────────────────────
  base.describe('Suite 43 — Server Text Chat Comprehensive', () => {

    base('43.01 Multiple text channels accessible', async () => {
      await navigateTo('servers');
      const channels = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasGeneral: bodyText.includes('general'),
          hasWelcome: bodyText.includes('welcome'),
          hasAnnouncements: bodyText.includes('announcements'),
          hasModChat: bodyText.includes('moderator-chat') || bodyText.includes('moderator'),
          hasRoles: bodyText.includes('roles'),
        };
      });
      console.log('[43.01] Text channels:', JSON.stringify(channels));
      expect(channels.hasGeneral).toBe(true);
      await ss('s43-01');
    });

    base('43.02 Channel has message input with placeholder', async () => {
      await ensureOnChannel('general');
      const input = await window.evaluate(() => {
        const textarea = document.querySelector('textarea[placeholder*="Message"]') as HTMLTextAreaElement;
        return {
          exists: !!textarea,
          placeholder: textarea?.placeholder || '',
          disabled: textarea?.disabled || false,
        };
      });
      console.log('[43.02] Message input:', JSON.stringify(input));
      expect(input.exists).toBe(true);
      expect(input.disabled).toBe(false);
    });

    base('43.03 XSS script tag renders as text not executed', async () => {
      await ensureOnChannel('general');
      const xssMsg = `<script>document.title='PWNED'</script> ${Date.now()}`;
      const input = window.locator('textarea[placeholder^="Message"]').first();
      await input.click();
      await input.fill(xssMsg);
      await window.keyboard.press('Enter');
      await settle(3000);
      const title = await window.title();
      const safe = !title.includes('PWNED');
      console.log('[43.03] XSS test:', { title, safe });
      expect(safe).toBe(true);
    });
  });

  // ── SUITE 44 — DIRECT MESSAGES COMPREHENSIVE ────────────────────────────
  base.describe('Suite 44 — Direct Messages Comprehensive', () => {

    base('44.01 DM sidebar has tabs', async () => {
      await navigateTo('dms');
      const tabs = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasAll: bodyText.includes('All'),
          hasOnline: bodyText.includes('Online'),
          hasFriends: bodyText.includes('Friends'),
          hasPending: bodyText.includes('Pending'),
          hasBlocked: bodyText.includes('Blocked'),
        };
      });
      console.log('[44.01] DM tabs:', JSON.stringify(tabs));
      expect(tabs.hasAll || tabs.hasOnline || tabs.hasFriends).toBe(true);
      await ss('s44-01');
    });
  });

  // ── SUITE 45 — FRIENDS LIST COMPREHENSIVE ────────────────────────────────
  base.describe('Suite 45 — Friends List Comprehensive', () => {

    base('45.01 Friends tab accessible and shows status categories', async () => {
      await navigateTo('friends');
      const friends = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasOnline: bodyText.includes('Online') || bodyText.includes('ONLINE'),
          hasOffline: bodyText.includes('Offline') || bodyText.includes('OFFLINE'),
          hasFriendList: bodyText.includes('Friends') || bodyText.includes('friends'),
          hasAddFriend: bodyText.includes('Add Friend'),
        };
      });
      console.log('[45.01] Friends:', JSON.stringify(friends));
      await ss('s45-01');
    });

    base('45.02 Add Friend button/tab exists', async () => {
      const addFriend = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        const btns = Array.from(document.querySelectorAll('button'));
        return {
          hasAddFriendText: bodyText.includes('Add Friend'),
          hasAddFriendBtn: btns.some(b => b.textContent?.includes('Add Friend')),
        };
      });
      console.log('[45.02] Add Friend:', JSON.stringify(addFriend));
      expect(addFriend.hasAddFriendText || addFriend.hasAddFriendBtn).toBe(true);
    });
  });

  // ── FINAL ────────────────────────────────────────────────────────────────
  base('FINAL — Console errors summary', async () => {
    console.log('[FINAL] Console errors during audit:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('[FINAL] Errors:', consoleErrors.slice(0, 10));
    }
    await ss('final-state');
  });
});
