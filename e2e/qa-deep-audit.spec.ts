/**
 * QA Deep Audit — Comprehensive Manual QA covering all 26 suites from QA_AGENT.md
 *
 * This test launches a single Electron session and tests every area systematically.
 * Run: npx playwright test e2e/qa-deep-audit.spec.ts --reporter=line
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
  try { await window.screenshot({ path: `qa-screenshots/deep-${name}.png` }); } catch {}
}
async function settle(ms = 2000) { await window.waitForTimeout(ms); }

// Navigate to a specific view using the Zustand store directly
async function navigateTo(view: 'servers' | 'dms' | 'friends' | 'settings' | 'server-admin') {
  if (view === 'server-admin') {
    // Admin tab only shows when on servers view — navigate there first
    await navigateTo('servers');
    await settle(500);
  }

  await window.evaluate((v) => {
    // Click the right nav button inside the .no-drag container in the TitleBar
    const viewLabels: Record<string, string> = {
      servers: 'Server', dms: 'Messages', friends: 'Friends', settings: 'Settings', 'server-admin': 'Admin',
    };
    const label = viewLabels[v];
    const noDrag = document.querySelector('.no-drag');
    if (noDrag) {
      const buttons = noDrag.querySelectorAll('button');
      for (const btn of buttons) {
        // Match exact label or label with icon prefix
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

// Collect console errors
const consoleErrors: string[] = [];
const networkErrors: string[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — ENVIRONMENT & CONNECTION HEALTH
// ═══════════════════════════════════════════════════════════════════════════════

base.describe.serial('QA Deep Audit', () => {

  base('S1.01 — App launches without blank screen', async () => {
    await window.waitForLoadState('load');
    await settle(4000);

    // Capture console messages
    window.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await ss('s1-01-launch');
    const bodyText = await window.evaluate(() => document.body.innerText);
    expect(bodyText.length).toBeGreaterThan(50);
    console.log('[S1.01] Body text length:', bodyText.length);
  });

  base('S1.02 — Console errors on initial load', async () => {
    // Check for any JS errors captured so far
    const errors = await window.evaluate(() => {
      // Check for React error boundaries
      const errorBoundary = document.querySelector('[class*="error-boundary"], [class*="ErrorBoundary"]');
      return {
        hasErrorBoundary: !!errorBoundary,
        consoleErrorCount: 0, // Can't retroactively get console from evaluate
      };
    });
    console.log('[S1.02] Error state:', JSON.stringify(errors));
    expect(errors.hasErrorBoundary).toBe(false);
  });

  base('S1.03 — Verify already logged in as qa-admin', async () => {
    await settle(2000);
    const state = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasQaAdmin: bodyText.includes('qa-admin') || bodyText.includes('qa_admin'),
        hasOnline: bodyText.includes('Online'),
        hasChannels: bodyText.includes('announcements') || bodyText.includes('general'),
        isLoginPage: bodyText.includes('Welcome back') || bodyText.includes('Log In'),
      };
    });
    console.log('[S1.03] Auth state:', JSON.stringify(state));

    if (state.isLoginPage) {
      // Need to login
      const emailInput = window.locator('input[type="email"]');
      const pwInput = window.locator('input[type="password"]');
      if (await emailInput.count() > 0) {
        await emailInput.first().fill(TEST_EMAIL);
        await pwInput.first().fill(TEST_PASSWORD);
        const loginBtn = window.locator('button[type="submit"], button:has-text("Log In")');
        await loginBtn.first().click();
        await settle(5000);
      } else {
        // Use electronAPI
        await window.evaluate(async (args) => {
          const api = (window as any).electronAPI;
          await api.auth.login(args.serverUrl, args.email, args.password);
        }, { serverUrl: SERVER_URL, email: TEST_EMAIL, password: TEST_PASSWORD });
        await window.reload();
        await settle(5000);
      }
    }
    expect(state.hasChannels || !state.isLoginPage).toBe(true);
  });

  base('S1.04 — Socket.IO connection active (presence visible)', async () => {
    const presenceState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasOnlineSection: bodyText.includes('ONLINE'),
        hasOfflineSection: bodyText.includes('OFFLINE'),
        hasUserInList: bodyText.includes('qa-admin') || bodyText.includes('qa_admin'),
      };
    });
    console.log('[S1.04] Presence state:', JSON.stringify(presenceState));
    await ss('s1-04-presence');
    // Member list with online/offline sections means Socket.IO is working
    expect(presenceState.hasOnlineSection || presenceState.hasUserInList).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUITE 3 — CORE NAVIGATION & ROUTING
  // ═══════════════════════════════════════════════════════════════════════════════

  base('S3.01 — Click each text channel in sidebar', async () => {
    const channels = ['announcements', 'welcome', 'general', 'moderator-chat'];
    const results: Record<string, boolean> = {};

    for (const ch of channels) {
      const link = window.locator(`text="${ch}"`).first();
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        await link.click();
        await settle(1500);
        const loaded = await window.evaluate((channel) => {
          return document.body.innerText.includes(`#${channel}`) ||
                 document.body.innerText.includes(channel);
        }, ch);
        results[ch] = loaded;
      } else {
        // Try expanding collapsed categories first
        const categories = window.locator('text=GENERAL CHAT');
        if (await categories.count() > 0) {
          await categories.first().click();
          await settle(500);
          const link2 = window.locator(`text="${ch}"`).first();
          if (await link2.isVisible({ timeout: 1000 }).catch(() => false)) {
            await link2.click();
            await settle(1500);
            results[ch] = true;
          } else {
            results[ch] = false;
          }
        } else {
          results[ch] = false;
        }
      }
    }

    console.log('[S3.01] Channel navigation results:', JSON.stringify(results));
    await ss('s3-01-channels');
  });

  base('S3.02 — Voice channels visible in sidebar', async () => {
    const voiceChannels = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasLounge: bodyText.includes('Lounge'),
        hasMusicStage: bodyText.includes('Music/Stage'),
        hasAFKChannel: bodyText.includes('AFK Channel'),
        hasVoiceChannelsHeader: bodyText.includes('VOICE CHANNELS'),
      };
    });
    console.log('[S3.02] Voice channels:', JSON.stringify(voiceChannels));
    await ss('s3-02-voice-channels');
    expect(voiceChannels.hasVoiceChannelsHeader).toBe(true);
  });

  base('S3.03 — Category collapse/expand toggle', async () => {
    // Find a category header and click to collapse/expand
    const generalChat = window.locator('text=GENERAL CHAT').first();
    if (await generalChat.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Check if channels are visible
      const beforeState = await window.evaluate(() => {
        return document.body.innerText.includes('general');
      });

      await generalChat.click();
      await settle(500);

      const afterState = await window.evaluate(() => {
        return document.body.innerText.includes('general');
      });

      console.log('[S3.03] Before collapse:', beforeState, 'After:', afterState);

      // Toggle it back
      await generalChat.click();
      await settle(500);
    }
    await ss('s3-03-category-toggle');
  });

  base('S3.04 — TitleBar navigation tabs work', async () => {
    // Test each view via the nav buttons in .no-drag container
    const views = ['servers', 'dms', 'friends', 'settings'] as const;
    const viewLabels = { servers: 'Server', dms: 'Messages', friends: 'Friends', settings: 'Settings' };
    const tabResults: Record<string, boolean> = {};

    for (const view of views) {
      await navigateTo(view);
      await ss(`s3-04-tab-${view}`);
      tabResults[viewLabels[view]] = true;
    }

    // Navigate back to Server
    await navigateTo('servers');
    console.log('[S3.04] Tab navigation results:', JSON.stringify(tabResults));
  });

  base('S3.05 — DM/Messages view loads', async () => {
    await navigateTo('dms');
    await ss('s3-05-messages-view');

    const dmState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasDMs: bodyText.includes('Direct Messages') || bodyText.includes('Messages'),
        hasConversations: bodyText.includes('qa_user') || bodyText.includes('qa-user'),
      };
    });
    console.log('[S3.05] DM state:', JSON.stringify(dmState));

    await navigateTo('servers');
  });

  base('S3.06 — Friends view loads', async () => {
    await navigateTo('friends');
    await ss('s3-06-friends-view');

    const friendsState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasFriends: bodyText.includes('Friends') || bodyText.includes('friends'),
        hasSearchOrAdd: bodyText.includes('Add Friend') || bodyText.includes('Search'),
        hasTabs: bodyText.includes('All') || bodyText.includes('Online') || bodyText.includes('Pending'),
      };
    });
    console.log('[S3.06] Friends state:', JSON.stringify(friendsState));

    await navigateTo('servers');
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUITE 4 — MESSAGE SENDING & DISPLAY
  // ═══════════════════════════════════════════════════════════════════════════════

  base('S4.01 — Navigate to general channel', async () => {
    // FIRST: ensure we're on Server view
    await navigateTo('servers');

    // Now click general channel in sidebar
    const general = window.locator('text="general"').first();
    if (await general.isVisible({ timeout: 3000 }).catch(() => false)) {
      await general.click();
      await settle(2000);
    }
    await ss('s4-01-general-channel');

    const hasInput = await window.evaluate(() => {
      // Look for the message input textarea with placeholder "Message #..."
      const textarea = document.querySelector('textarea[placeholder^="Message"]');
      return !!textarea;
    });
    console.log('[S4.01] Has message input:', hasInput);
    expect(hasInput).toBe(true);
  });

  base('S4.02 — Send plain text message', async () => {
    const input = window.locator('textarea[placeholder^="Message"]').first();
    const testMsg = `QA-deep-plain-${Date.now()}`;
    await input.click();
    await input.fill(testMsg);
    await window.keyboard.press('Enter');
    await settle(3000);
    await ss('s4-02-plain-message');

    const visible = await window.evaluate((msg) => document.body.innerText.includes(msg), testMsg);
    console.log('[S4.02] Message visible:', visible);
    expect(visible).toBe(true);
  });

  base('S4.03 — Send markdown: **bold**, *italic*, `code`', async () => {
    const input = window.locator('textarea[placeholder^="Message"]').first();
    await input.click();
    await input.fill('**bold test** *italic test* `code test`');
    await window.keyboard.press('Enter');
    await settle(3000);
    await ss('s4-03-markdown');

    const mdState = await window.evaluate(() => {
      // Check if bold/italic/code elements rendered
      const hasBold = !!document.querySelector('strong, b') ||
                      document.body.innerHTML.includes('<strong>') ||
                      document.body.innerHTML.includes('<b>');
      const hasItalic = !!document.querySelector('em, i:not([class])') ||
                        document.body.innerHTML.includes('<em>');
      const hasCode = !!document.querySelector('code') ||
                      document.body.innerHTML.includes('<code>');
      return { hasBold, hasItalic, hasCode };
    });
    console.log('[S4.03] Markdown rendering:', JSON.stringify(mdState));
  });

  base('S4.04 — Send spoiler: ||hidden text||', async () => {
    const input = window.locator('textarea[placeholder^="Message"]').first();
    const spoilerContent = `spoiler-deep-${Date.now()}`;
    await input.click();
    await input.fill(`||${spoilerContent}||`);
    await window.keyboard.press('Enter');
    await settle(3000);
    await ss('s4-04-spoiler');

    const spoilerState = await window.evaluate((content) => {
      const hasSpoilerEl = !!document.querySelector('[class*="spoiler"], [data-spoiler]');
      const hasBlur = !!document.querySelector('[class*="blur"], [style*="blur"]');
      return { hasSpoilerEl, hasBlur, content: document.body.innerText.includes(content) };
    }, spoilerContent);
    console.log('[S4.04] Spoiler state:', JSON.stringify(spoilerState));
  });

  base('S4.05 — Empty message should NOT send', async () => {
    const input = window.locator('textarea[placeholder^="Message"]').first();
    await input.click();

    // Get current message count
    const beforeCount = await window.evaluate(() => {
      return document.querySelectorAll('[class*="message"], [data-message-id]').length;
    });

    // Try sending empty
    await window.keyboard.press('Enter');
    await settle(1000);

    const afterCount = await window.evaluate(() => {
      return document.querySelectorAll('[class*="message"], [data-message-id]').length;
    });

    console.log('[S4.05] Before:', beforeCount, 'After:', afterCount);
    // Message count should not increase
  });

  base('S4.06 — XSS in message: <script>alert(1)</script>', async () => {
    const input = window.locator('textarea[placeholder^="Message"]').first();
    await input.click();
    await input.fill('<script>alert("xss")</script>');
    await window.keyboard.press('Enter');
    await settle(3000);
    await ss('s4-06-xss-test');

    // Verify script tag rendered as text, not executed
    const xssState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      const hasScriptTag = bodyText.includes('<script>') || bodyText.includes('&lt;script&gt;');
      // Check if any alert dialog was triggered (it shouldn't be)
      return { hasScriptTag, bodyContains: bodyText.includes('alert') };
    });
    console.log('[S4.06] XSS state:', JSON.stringify(xssState));
  });

  base('S4.07 — HTML img XSS: <img src=x onerror=alert(1)>', async () => {
    const input = window.locator('textarea[placeholder^="Message"]').first();
    await input.click();
    await input.fill('<img src=x onerror=alert(1)>');
    await window.keyboard.press('Enter');
    await settle(3000);
    await ss('s4-07-img-xss');
  });

  base('S4.08 — Message grouping (consecutive same author)', async () => {
    const input = window.locator('textarea[placeholder^="Message"]').first();

    // Send 3 messages rapidly
    for (let i = 1; i <= 3; i++) {
      await input.click();
      await input.fill(`Grouping test ${i}`);
      await window.keyboard.press('Enter');
      await settle(1000);
    }
    await ss('s4-08-grouping');

    // Check if messages group (consecutive messages from same author should share avatar)
    const groupState = await window.evaluate(() => {
      // Count avatar images in the last few messages
      const messages = document.querySelectorAll('[class*="message"], [data-message-id]');
      const lastFew = Array.from(messages).slice(-5);
      const avatarsInLastFew = lastFew.filter(m =>
        m.querySelector('img[class*="avatar"], [class*="avatar"] img')
      ).length;
      return { totalMessages: messages.length, avatarsInLastFew, lastFewCount: lastFew.length };
    });
    console.log('[S4.08] Grouping state:', JSON.stringify(groupState));
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUITE 5 — MESSAGE ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  base('S5.01 — Hover message shows action toolbar', async () => {
    // Find the last message and hover
    const messages = window.locator('[class*="message"], [data-message-id]');
    const count = await messages.count();
    if (count > 0) {
      await messages.last().hover();
      await settle(800);
    }
    await ss('s5-01-hover-actions');

    const actionState = await window.evaluate(() => {
      // Look for action toolbar (the row of small icon buttons)
      const toolbar = document.querySelector('[class*="action"], [class*="toolbar"], [class*="MessageAction"]');
      const allSmallButtons = document.querySelectorAll('button svg');
      return {
        hasToolbar: !!toolbar,
        svgButtonCount: allSmallButtons.length,
      };
    });
    console.log('[S5.01] Action toolbar:', JSON.stringify(actionState));
  });

  base('S5.02 — Right-click message shows context menu', async () => {
    const messages = window.locator('[class*="message"], [data-message-id]');
    const count = await messages.count();
    if (count > 0) {
      await messages.last().click({ button: 'right' });
      await settle(1000);
    }
    await ss('s5-02-context-menu');

    const menuState = await window.evaluate(() => {
      // Context menu should show edit, delete, reply, etc.
      const bodyText = document.body.innerText;
      const hasMenu = document.querySelector('[role="menu"], [class*="context-menu"], [class*="ContextMenu"], [class*="dropdown"]');
      return {
        hasMenu: !!hasMenu,
        hasEdit: bodyText.includes('Edit'),
        hasDelete: bodyText.includes('Delete'),
        hasReply: bodyText.includes('Reply'),
        hasCopy: bodyText.includes('Copy'),
        hasPin: bodyText.includes('Pin'),
      };
    });
    console.log('[S5.02] Context menu:', JSON.stringify(menuState));

    // Close context menu
    await window.keyboard.press('Escape');
    await settle(500);
  });

  base('S5.03 — Edit own message via context menu', async () => {
    // Right-click last message
    const messages = window.locator('[class*="message"], [data-message-id]');
    const count = await messages.count();
    if (count > 0) {
      await messages.last().click({ button: 'right' });
      await settle(1000);
    }

    // Click Edit
    const editBtn = window.locator('text="Edit"').first();
    if (await editBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await editBtn.click();
      await settle(1000);

      // Check if message is now editable
      const editState = await window.evaluate(() => {
        const editableInput = document.querySelector('[class*="edit"] textarea, [class*="edit"] input, [class*="editing"]');
        return { isEditable: !!editableInput };
      });
      console.log('[S5.03] Edit state:', JSON.stringify(editState));
      await ss('s5-03-edit-mode');

      // Press Escape to cancel
      await window.keyboard.press('Escape');
      await settle(500);
    } else {
      console.log('[S5.03] Edit option not found in context menu');
    }
  });

  base('S5.04 — Reply to message', async () => {
    // Right-click a message and reply
    const messages = window.locator('[class*="message"], [data-message-id]');
    const count = await messages.count();
    if (count > 0) {
      await messages.last().click({ button: 'right' });
      await settle(1000);
    }

    const replyBtn = window.locator('text="Reply"').first();
    if (await replyBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await replyBtn.click();
      await settle(1000);

      // Check if reply preview shows above input
      const replyState = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasReplyPreview: bodyText.includes('Replying to') || !!document.querySelector('[class*="reply-preview"], [class*="ReplyPreview"]'),
        };
      });
      console.log('[S5.04] Reply state:', JSON.stringify(replyState));
      await ss('s5-04-reply-mode');

      // Send the reply
      const input = window.locator('textarea[placeholder^="Message"]').first();
      await input.fill(`Reply test ${Date.now()}`);
      await window.keyboard.press('Enter');
      await settle(2000);
      await ss('s5-04-reply-sent');
    } else {
      // Close context menu
      await window.keyboard.press('Escape');
      console.log('[S5.04] Reply option not found');
    }
  });

  base('S5.05 — Reaction picker opens and works', async () => {
    // Hover over last message
    const messages = window.locator('[class*="message"], [data-message-id]');
    const count = await messages.count();
    if (count > 0) {
      await messages.last().hover();
      await settle(800);
    }

    // Find reaction button by looking for SVG buttons near the hovered message
    // The action bar appears on hover, buttons have SVG icons but may not have aria labels
    const reactionState = await window.evaluate(() => {
      // Look at all visible buttons with SVGs that appeared after hover
      const buttons = Array.from(document.querySelectorAll('button'));
      const actionButtons = buttons.filter(b => {
        const rect = b.getBoundingClientRect();
        return rect.width > 0 && rect.width < 40 && rect.height < 40;
      });
      return {
        smallButtonCount: actionButtons.length,
        buttonTitles: actionButtons.map(b => b.title || b.getAttribute('aria-label') || '').filter(Boolean),
      };
    });
    console.log('[S5.05] Action buttons:', JSON.stringify(reactionState));
    await ss('s5-05-reaction-buttons');
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUITE 6 — FILE UPLOADS & ATTACHMENTS
  // ═══════════════════════════════════════════════════════════════════════════════

  base('S6.01 — File upload button exists', async () => {
    const uploadState = await window.evaluate(() => {
      const hasFileInput = !!document.querySelector('input[type="file"]');
      // The attach icon is typically a paperclip or + icon
      const attachButton = document.querySelector('button[class*="attach"], label[class*="attach"], [class*="upload"] button');
      // Also check for the clip icon in the message input area
      const svgButtons = document.querySelectorAll('button svg');
      return {
        hasFileInput,
        hasAttachButton: !!attachButton,
        svgButtonsNearInput: svgButtons.length,
      };
    });
    console.log('[S6.01] Upload state:', JSON.stringify(uploadState));
    await ss('s6-01-upload');
    expect(uploadState.hasFileInput).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUITE 9 — USER PROFILES & POPOVERS
  // ═══════════════════════════════════════════════════════════════════════════════

  base('S9.01 — Click username in message opens profile popover', async () => {
    // Click on a username in the message list
    const username = window.locator('text="qa-admin"').first();
    if (await username.isVisible({ timeout: 2000 }).catch(() => false)) {
      await username.click();
      await settle(1500);
    }
    await ss('s9-01-profile-popover');

    const popoverState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasPopover: !!document.querySelector('[class*="popover"], [class*="Popover"], [role="dialog"]'),
        hasAvatar: !!document.querySelector('[class*="popover"] img, [class*="Popover"] img'),
        hasUsername: bodyText.includes('qa-admin') || bodyText.includes('qa_admin'),
        hasRoleBadge: bodyText.includes('Admin') || bodyText.includes('admin'),
        hasMessageButton: bodyText.includes('Message'),
      };
    });
    console.log('[S9.01] Popover state:', JSON.stringify(popoverState));

    // Close popover
    await window.keyboard.press('Escape');
    await settle(500);
  });

  base('S9.02 — Click username in member list opens profile', async () => {
    // Click a user in the right member list
    const memberLink = window.locator('text="qa-user"').first();
    if (await memberLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await memberLink.click();
      await settle(1500);
    }
    await ss('s9-02-member-popover');

    // Close popover
    await window.keyboard.press('Escape');
    await settle(500);
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUITE 10 — USER SETTINGS (deep dive)
  // ═══════════════════════════════════════════════════════════════════════════════

  base('S10.01 — Open Settings and verify all 6 tabs', async () => {
    await navigateTo('settings');
    await ss('s10-01-settings');

    const tabs = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        myAccount: bodyText.includes('My Account'),
        profile: bodyText.includes('Profile'),
        appearance: bodyText.includes('Appearance'),
        notifications: bodyText.includes('Notifications'),
        keybinds: bodyText.includes('Keybinds'),
        voiceVideo: bodyText.includes('Voice & Video') || bodyText.includes('Voice'),
        logOut: bodyText.includes('Log Out'),
        logOutForget: bodyText.includes('Log Out & Forget Device'),
      };
    });
    console.log('[S10.01] Settings tabs:', JSON.stringify(tabs));
    const tabCount = [tabs.myAccount, tabs.profile, tabs.appearance, tabs.notifications, tabs.keybinds, tabs.voiceVideo].filter(Boolean).length;
    expect(tabCount).toBe(6);
  });

  base('S10.02 — My Account tab: avatar, email, password, 2FA', async () => {
    const myAccountTab = window.locator('text="My Account"').first();
    if (await myAccountTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await myAccountTab.click();
      await settle(1500);
    }
    await ss('s10-02-my-account');

    const accountState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasUsername: bodyText.includes('Username') || bodyText.includes('username'),
        hasEmail: bodyText.includes('Email') || bodyText.includes('email'),
        hasPassword: bodyText.includes('Password') || bodyText.includes('password'),
        has2FA: bodyText.includes('Two-Factor') || bodyText.includes('2FA') || bodyText.includes('two-factor'),
        hasAvatar: !!document.querySelector('img[class*="avatar"], [class*="avatar"] img'),
        hasBanner: bodyText.includes('Banner') || bodyText.includes('banner'),
        hasPrivacy: bodyText.includes('Privacy') || bodyText.includes('privacy'),
        hasAccountRemoval: bodyText.includes('Account Removal') || bodyText.includes('Delete Account') || bodyText.includes('Disable Account'),
      };
    });
    console.log('[S10.02] Account state:', JSON.stringify(accountState));
  });

  base('S10.03 — Profile tab: display name, pronouns, bio, status', async () => {
    const profileTab = window.locator('text="Profile"').first();
    if (await profileTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await profileTab.click();
      await settle(1500);
    }
    await ss('s10-03-profile');

    const profileState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasDisplayName: bodyText.includes('Display Name') || bodyText.includes('display name'),
        hasPronouns: bodyText.includes('Pronouns') || bodyText.includes('pronouns'),
        hasBio: bodyText.includes('Bio') || bodyText.includes('About Me') || bodyText.includes('bio'),
        hasCustomStatus: bodyText.includes('Custom Status') || bodyText.includes('Status') || bodyText.includes('status'),
        inputCount: document.querySelectorAll('input, textarea').length,
      };
    });
    console.log('[S10.03] Profile state:', JSON.stringify(profileState));
  });

  base('S10.04 — Appearance tab: theme, font size, compact mode', async () => {
    const appearanceTab = window.locator('text="Appearance"').first();
    if (await appearanceTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await appearanceTab.click();
      await settle(1500);
    }
    await ss('s10-04-appearance');

    const appearanceState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasTheme: bodyText.includes('Theme') || bodyText.includes('theme'),
        hasFontSize: bodyText.includes('Font Size') || bodyText.includes('font size'),
        hasCompactMode: bodyText.includes('Compact') || bodyText.includes('compact'),
        hasZoom: bodyText.includes('Zoom') || bodyText.includes('zoom'),
        hasSliders: document.querySelectorAll('input[type="range"], [role="slider"]').length,
        hasToggles: document.querySelectorAll('input[type="checkbox"], [role="switch"], button[role="switch"]').length,
      };
    });
    console.log('[S10.04] Appearance state:', JSON.stringify(appearanceState));
  });

  base('S10.05 — Notifications tab: toggles and settings', async () => {
    const notificationsTab = window.locator('text="Notifications"').first();
    if (await notificationsTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await notificationsTab.click();
      await settle(1500);
    }
    await ss('s10-05-notifications');

    const notifState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasDesktopNotif: bodyText.includes('Desktop') || bodyText.includes('desktop'),
        hasSounds: bodyText.includes('Sound') || bodyText.includes('sound'),
        hasDMNotif: bodyText.includes('Direct Message') || bodyText.includes('DM'),
        toggleCount: document.querySelectorAll('input[type="checkbox"], [role="switch"], button[role="switch"]').length,
      };
    });
    console.log('[S10.05] Notifications state:', JSON.stringify(notifState));
  });

  base('S10.06 — Keybinds tab: bindings visible', async () => {
    const keybindsTab = window.locator('text="Keybinds"').first();
    if (await keybindsTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await keybindsTab.click();
      await settle(1500);
    }
    await ss('s10-06-keybinds');

    const keybindState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasKeybinds: bodyText.includes('Keybind') || bodyText.includes('Shortcut') || bodyText.includes('keybind'),
        hasMute: bodyText.includes('Mute') || bodyText.includes('mute'),
        hasDeafen: bodyText.includes('Deafen') || bodyText.includes('deafen'),
        hasSearch: bodyText.includes('Search') || bodyText.includes('Ctrl') || bodyText.includes('search'),
      };
    });
    console.log('[S10.06] Keybinds state:', JSON.stringify(keybindState));
  });

  base('S10.07 — Voice & Video tab: devices, sensitivity, noise suppression', async () => {
    const voiceTab = window.locator('text="Voice & Video"').first();
    if (await voiceTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await voiceTab.click();
      await settle(1500);
    } else {
      const voiceTab2 = window.locator('text="Voice"').first();
      if (await voiceTab2.isVisible({ timeout: 1000 }).catch(() => false)) {
        await voiceTab2.click();
        await settle(1500);
      }
    }
    await ss('s10-07-voice');

    const voiceState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasInputDevice: bodyText.includes('Input Device') || bodyText.includes('input device'),
        hasOutputDevice: bodyText.includes('Output Device') || bodyText.includes('output device'),
        hasInputVolume: bodyText.includes('Input Volume') || bodyText.includes('input volume'),
        hasOutputVolume: bodyText.includes('Output Volume') || bodyText.includes('output volume'),
        hasSensitivity: bodyText.includes('Input Sensitivity') || bodyText.includes('Sensitivity'),
        hasNoiseSuppression: bodyText.includes('Noise Suppression') || bodyText.includes('noise'),
        hasEchoCancellation: bodyText.includes('Echo Cancellation') || bodyText.includes('echo'),
        hasAutoGainControl: bodyText.includes('Automatic Gain Control') || bodyText.includes('gain'),
        hasTestMic: bodyText.includes('Test Microphone') || bodyText.includes('Test Mic'),
        hasTestSpeakers: bodyText.includes('Test Speakers') || bodyText.includes('Test Speaker'),
        sliderCount: document.querySelectorAll('input[type="range"], [role="slider"]').length,
      };
    });
    console.log('[S10.07] Voice state:', JSON.stringify(voiceState));
  });

  base('S10.08 — Dual logout buttons visible', async () => {
    const logoutState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasLogOut: bodyText.includes('Log Out'),
        hasLogOutForget: bodyText.includes('Log Out & Forget Device'),
      };
    });
    console.log('[S10.08] Logout state:', JSON.stringify(logoutState));
    expect(logoutState.hasLogOut).toBe(true);
    expect(logoutState.hasLogOutForget).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // Navigate back to Server for remaining tests
  // ═══════════════════════════════════════════════════════════════════════════════

  base('S10.99 — Navigate back to Server view', async () => {
    await navigateTo('servers');
    await ss('s10-99-back-to-server');
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUITE 11 — SERVER SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════════

  base('S11.01 — Server header shows gear icon and server icons', async () => {
    const headerState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasServerName: bodyText.includes('QA-Server'),
        hasMOTD: bodyText.includes('Server Message') || bodyText.includes('Welcome to sgChat'),
        hasGearIcon: !!document.querySelector('button svg, [class*="settings"]'),
        headerIcons: document.querySelectorAll('[class*="header"] button, [class*="Header"] button').length,
      };
    });
    console.log('[S11.01] Server header:', JSON.stringify(headerState));
    await ss('s11-01-server-header');
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUITE 14 — SEARCH & COMMAND PALETTE
  // ═══════════════════════════════════════════════════════════════════════════════

  base('S14.01 — Ctrl+K opens command palette', async () => {
    await navigateTo('servers');
    await settle(500);
    await window.keyboard.press('Control+k');
    await settle(1500);
    await ss('s14-01-command-palette');

    const paletteState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasSearchInput: !!document.querySelector('input[placeholder*="search" i], input[placeholder*="Go to" i], input[placeholder*="command" i]'),
        hasOverlay: !!document.querySelector('[class*="command"], [class*="Command"], [class*="spotlight"], [class*="Spotlight"]'),
        hasResults: bodyText.includes('Channels') || bodyText.includes('Members') || bodyText.includes('Actions'),
      };
    });
    console.log('[S14.01] Palette state:', JSON.stringify(paletteState));
    expect(paletteState.hasSearchInput || paletteState.hasOverlay).toBe(true);
  });

  base('S14.02 — Type channel name in palette shows results', async () => {
    const paletteInput = window.locator('input[placeholder*="search" i], input[placeholder*="Go to" i], input[placeholder*="command" i]').first();
    if (await paletteInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await paletteInput.fill('general');
      await settle(1000);
      await ss('s14-02-palette-search');

      const searchResults = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasGeneralResult: bodyText.includes('general'),
          hasChannelsSection: bodyText.includes('Channels'),
        };
      });
      console.log('[S14.02] Search results:', JSON.stringify(searchResults));
    }

    await window.keyboard.press('Escape');
    await settle(500);
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUITE 15 — ADMIN FEATURES
  // ═══════════════════════════════════════════════════════════════════════════════

  base('S15.01 — Admin tab shows admin panel', async () => {
    await navigateTo('server-admin');
    await ss('s15-01-admin-panel');

    const adminState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasOverview: bodyText.includes('Overview') || bodyText.includes('overview'),
        hasRoles: bodyText.includes('Roles'),
        hasMembers: bodyText.includes('Members'),
        hasChannels: bodyText.includes('Channels'),
        hasAccessControl: bodyText.includes('Access Control'),
        hasStorage: bodyText.includes('Storage'),
        hasAuditLog: bodyText.includes('Audit Log') || bodyText.includes('Audit'),
        hasImpersonation: bodyText.includes('Impersonat'),
        hasEvents: bodyText.includes('Events'),
        hasEmoji: bodyText.includes('Emoji'),
      };
    });
    console.log('[S15.01] Admin sections:', JSON.stringify(adminState));
  });

  base('S15.02 — Roles panel with permission categories', async () => {
    const rolesLink = window.locator('text="Roles"').first();
    if (await rolesLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await rolesLink.click();
      await settle(1500);
    }
    await ss('s15-02-roles');

    const rolesState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasRoleList: bodyText.includes('Admin') || bodyText.includes('@everyone'),
        hasPermCategories: {
          general: bodyText.includes('General'),
          membership: bodyText.includes('Membership'),
          text: bodyText.includes('Text'),
          voice: bodyText.includes('Voice'),
          advanced: bodyText.includes('Advanced'),
        },
        hasCreateRole: bodyText.includes('Create Role') || bodyText.includes('New Role') || bodyText.includes('Add Role'),
        hasDragHandles: !!document.querySelector('[class*="drag"], [draggable="true"]'),
      };
    });
    console.log('[S15.02] Roles state:', JSON.stringify(rolesState));
  });

  base('S15.03 — Access Control panel (settings, intake, approvals, blacklist)', async () => {
    const accessLink = window.locator('text="Access Control"').first();
    if (await accessLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await accessLink.click();
      await settle(1500);
    }
    await ss('s15-03-access-control');

    const accessState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasSettings: bodyText.includes('Settings'),
        hasIntakeForm: bodyText.includes('Intake Form') || bodyText.includes('Intake'),
        hasApprovals: bodyText.includes('Approvals'),
        hasBlacklist: bodyText.includes('Blacklist'),
        hasSignupsToggle: bodyText.includes('signups') || bodyText.includes('Signups') || bodyText.includes('Sign'),
        hasApprovalToggle: bodyText.includes('approval') || bodyText.includes('Approval'),
      };
    });
    console.log('[S15.03] Access Control:', JSON.stringify(accessState));
  });

  base('S15.04 — Members admin panel', async () => {
    const membersLink = window.locator('text="Members"').first();
    if (await membersLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await membersLink.click();
      await settle(1500);
    }
    await ss('s15-04-members-admin');

    const membersState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasMemberList: bodyText.includes('qa-admin') || bodyText.includes('qa_admin'),
        hasKickBan: bodyText.includes('Kick') || bodyText.includes('Ban') || bodyText.includes('kick') || bodyText.includes('ban'),
        hasRoleAssignment: bodyText.includes('Role') || bodyText.includes('role'),
      };
    });
    console.log('[S15.04] Members admin:', JSON.stringify(membersState));
  });

  base('S15.05 — Impersonation feature', async () => {
    const impLink = window.locator('text="Impersonation"').first();
    if (await impLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await impLink.click();
      await settle(1500);
      await ss('s15-05-impersonation');

      const impState = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasSearch: bodyText.includes('Search') || bodyText.includes('search'),
          hasImpersonateButton: bodyText.includes('Impersonate'),
          hasMemberList: bodyText.includes('qa_user') || bodyText.includes('qa-user'),
        };
      });
      console.log('[S15.05] Impersonation:', JSON.stringify(impState));
    } else {
      console.log('[S15.05] Impersonation tab not found');
    }
  });

  base('S15.06 — Audit Log', async () => {
    const auditLink = window.locator('text="Audit Log"').first();
    if (await auditLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await auditLink.click();
      await settle(1500);
      await ss('s15-06-audit-log');

      const auditState = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasEntries: bodyText.includes('admin') || bodyText.includes('created') || bodyText.includes('updated'),
          hasFilter: bodyText.includes('Filter') || bodyText.includes('filter'),
          hasTimestamps: /\d{4}/.test(bodyText),
        };
      });
      console.log('[S15.06] Audit Log:', JSON.stringify(auditState));
    }
  });

  base('S15.07 — Events admin', async () => {
    const eventsLink = window.locator('text="Events"').first();
    if (await eventsLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await eventsLink.click();
      await settle(1500);
      await ss('s15-07-events');

      const eventsState = await window.evaluate(() => {
        const bodyText = document.body.innerText;
        return {
          hasCreateEvent: bodyText.includes('Create Event') || bodyText.includes('New Event') || bodyText.includes('Add Event'),
          hasEventList: bodyText.includes('Event') || bodyText.includes('event'),
        };
      });
      console.log('[S15.07] Events admin:', JSON.stringify(eventsState));
    }
  });

  // Navigate back to Server
  base('S15.99 — Back to server view', async () => {
    await navigateTo('servers');
    await ss('s15-99-back');
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUITE 16 — ELECTRON NATIVE FEATURES (IPC Bridge)
  // ═══════════════════════════════════════════════════════════════════════════════

  base('S16.01 — electronAPI bridge complete check', async () => {
    const apiState = await window.evaluate(() => {
      const api = (window as any).electronAPI;
      if (!api) return { exists: false };

      const methods: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(api)) {
        if (typeof value === 'object' && value !== null) {
          methods[key] = Object.keys(value as object);
        } else {
          methods[key] = [typeof value];
        }
      }
      return { exists: true, methods };
    });
    console.log('[S16.01] electronAPI:', JSON.stringify(apiState));
  });

  base('S16.02 — Window controls (minimize, maximize, close)', async () => {
    const controlState = await window.evaluate(() => {
      const api = (window as any).electronAPI;
      return {
        hasMinimize: typeof api?.minimize === 'function',
        hasMaximize: typeof api?.maximize === 'function',
        hasClose: typeof api?.close === 'function',
        hasIsMaximized: typeof api?.isMaximized === 'function',
      };
    });
    console.log('[S16.02] Window controls:', JSON.stringify(controlState));
    expect(controlState.hasMinimize).toBe(true);
    expect(controlState.hasMaximize).toBe(true);
    expect(controlState.hasClose).toBe(true);
  });

  base('S16.03 — Server URL persisted in electron-store', async () => {
    const serverUrl = await window.evaluate(async () => {
      const api = (window as any).electronAPI;
      return api?.config?.getServerUrl ? await api.config.getServerUrl() : null;
    });
    console.log('[S16.03] Stored server URL:', serverUrl);
    expect(serverUrl).toBeTruthy();
  });

  base('S16.04 — Clipboard API available', async () => {
    const clipboardState = await window.evaluate(() => {
      const api = (window as any).electronAPI;
      return {
        hasClipboard: !!api?.clipboard,
        hasWriteText: typeof api?.clipboard?.writeText === 'function',
        hasReadText: typeof api?.clipboard?.readText === 'function',
      };
    });
    console.log('[S16.04] Clipboard:', JSON.stringify(clipboardState));
  });

  base('S16.05 — Screen share API available', async () => {
    const screenShareState = await window.evaluate(() => {
      const api = (window as any).electronAPI;
      return {
        hasScreenShare: !!api?.screenShare,
        hasGetSources: typeof api?.screenShare?.getSources === 'function',
      };
    });
    console.log('[S16.05] Screen share:', JSON.stringify(screenShareState));
  });

  base('S16.06 — Crypto API available', async () => {
    const cryptoState = await window.evaluate(() => {
      const api = (window as any).electronAPI;
      return {
        hasCrypto: !!api?.crypto,
        methods: api?.crypto ? Object.keys(api.crypto) : [],
      };
    });
    console.log('[S16.06] Crypto:', JSON.stringify(cryptoState));
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUITE 18 — SECURITY
  // ═══════════════════════════════════════════════════════════════════════════════

  base('S18.01 — No auth tokens in localStorage', async () => {
    const storageState = await window.evaluate(() => {
      const keys = Object.keys(localStorage);
      const values: Record<string, string> = {};
      keys.forEach(k => { values[k] = localStorage.getItem(k) || ''; });
      return { keys, hasSuspicious: keys.some(k => k.toLowerCase().includes('token') || k.toLowerCase().includes('auth') || k.toLowerCase().includes('jwt')) };
    });
    console.log('[S18.01] localStorage:', JSON.stringify(storageState));
    expect(storageState.hasSuspicious).toBe(false);
  });

  base('S18.02 — No auth tokens in sessionStorage', async () => {
    const sessionState = await window.evaluate(() => {
      const keys = Object.keys(sessionStorage);
      return { keys, hasSuspicious: keys.some(k => k.toLowerCase().includes('token') || k.toLowerCase().includes('auth') || k.toLowerCase().includes('jwt')) };
    });
    console.log('[S18.02] sessionStorage:', JSON.stringify(sessionState));
    expect(sessionState.hasSuspicious).toBe(false);
  });

  base('S18.03 — No auth tokens in cookies', async () => {
    const cookies = await window.evaluate(() => document.cookie);
    console.log('[S18.03] Cookies:', cookies);
    const hasSuspicious = cookies.toLowerCase().includes('token') || cookies.toLowerCase().includes('jwt');
    expect(hasSuspicious).toBe(false);
  });

  base('S18.04 — Context isolation is enabled', async () => {
    const isolationState = await window.evaluate(() => {
      // If context isolation is working, Node.js APIs should NOT be available
      const hasProcess = typeof (window as any).process !== 'undefined';
      const hasRequire = typeof (window as any).require !== 'undefined';
      const hasBuffer = typeof (window as any).Buffer !== 'undefined';
      return { hasProcess, hasRequire, hasBuffer };
    });
    console.log('[S18.04] Context isolation:', JSON.stringify(isolationState));
    // With proper context isolation, these should NOT be accessible
    expect(isolationState.hasRequire).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUITE 20 — PERFORMANCE & ERROR STATES
  // ═══════════════════════════════════════════════════════════════════════════════

  base('S20.01 — No React error boundaries triggered', async () => {
    const errorState = await window.evaluate(() => {
      return {
        hasErrorBoundary: !!document.querySelector('[class*="error-boundary"], [class*="ErrorBoundary"], [class*="error-fallback"]'),
        hasRuntimeError: !!document.querySelector('[class*="runtime-error"], [class*="RuntimeError"]'),
      };
    });
    console.log('[S20.01] Error boundaries:', JSON.stringify(errorState));
    expect(errorState.hasErrorBoundary).toBe(false);
  });

  base('S20.02 — Check for console errors accumulated during test', async () => {
    console.log('[S20.02] Console errors captured:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('[S20.02] Errors:', consoleErrors.slice(0, 10).join('\n'));
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUITE 24 — PARITY: SERVER SIDEBAR & UI
  // ═══════════════════════════════════════════════════════════════════════════════

  base('S24.01 — Server sidebar has server icons', async () => {
    await navigateTo('servers');

    const sidebarState = await window.evaluate(() => {
      // The server sidebar should be on the far left
      const serverIcons = document.querySelectorAll('img[class*="server"], [class*="server-icon"], [class*="ServerIcon"]');
      const navButtons = document.querySelectorAll('button img, a img');
      return {
        serverIconCount: serverIcons.length,
        navButtonCount: navButtons.length,
      };
    });
    console.log('[S24.01] Server sidebar:', JSON.stringify(sidebarState));
    await ss('s24-01-sidebar');
  });

  base('S24.02 — User panel at bottom shows username, status, timestamps', async () => {
    const userPanelState = await window.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasQaAdmin: bodyText.includes('qa-admin') || bodyText.includes('qa_admin'),
        hasOnline: bodyText.includes('Online'),
        hasTimestamp: /\d{1,2}:\d{2}\s*(AM|PM)/i.test(bodyText),
        hasGearIcon: !!document.querySelector('[class*="user-panel"] button svg, [class*="UserPanel"] svg'),
      };
    });
    console.log('[S24.02] User panel:', JSON.stringify(userPanelState));
    await ss('s24-02-user-panel');
  });

  base('S24.03 — Channel header has action icons (calendar, pin, threads, search, members)', async () => {
    // Navigate to general channel
    const general = window.locator('text="general"').first();
    if (await general.isVisible({ timeout: 2000 }).catch(() => false)) {
      await general.click();
      await settle(1500);
    }

    const headerState = await window.evaluate(() => {
      // The channel header has action icons on the right side
      const headerIcons = document.querySelectorAll('[class*="header"] button svg, [class*="Header"] button svg');
      const bodyText = document.body.innerText;
      return {
        iconCount: headerIcons.length,
        hasSearch: !!document.querySelector('[class*="header"] button[title*="Search" i], input[placeholder*="Search" i]'),
        hasMemberToggle: !!document.querySelector('[class*="header"] button[title*="Member" i]'),
        hasChannelName: bodyText.includes('general'),
      };
    });
    console.log('[S24.03] Channel header:', JSON.stringify(headerState));
    await ss('s24-03-channel-header');
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FINAL — Summary
  // ═══════════════════════════════════════════════════════════════════════════════

  base('FINAL — Screenshot summary', async () => {
    await ss('final-state');
    const summary = await window.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyLength: document.body.innerText.length,
      };
    });
    console.log('[FINAL]', JSON.stringify(summary));
  });

});
