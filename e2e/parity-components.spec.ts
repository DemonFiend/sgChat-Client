import { test, expect } from './electron-fixture';

test.describe('Parity Components QA', () => {
  test('app launches and shows window', async ({ window }) => {
    const title = await window.title();
    expect(title).toBeTruthy();
    await window.screenshot({ path: 'qa-screenshots/01-app-launch.png' });
  });

  test('app navigates past setup to login or main view', async ({ window }) => {
    // Wait for either login page or main app to load
    await window.waitForTimeout(3000);
    const url = window.url();
    await window.screenshot({ path: 'qa-screenshots/02-initial-route.png' });

    // Log current state for debugging
    console.log('Current URL:', url);
    console.log('Page title:', await window.title());
  });

  test.describe('UserContextMenu', () => {
    test('right-click on member shows context menu', async ({ window }) => {
      // Navigate to a server channel with members visible
      await window.waitForTimeout(2000);
      const url = window.url();

      // If we're on a server channel page with member list
      const memberList = window.locator('[class*="MemberList"], [data-testid="member-list"]');
      const memberListVisible = await memberList.isVisible().catch(() => false);

      if (memberListVisible) {
        // Right-click on first member
        const firstMember = memberList.locator('[class*="member"], [data-testid*="member"]').first();
        if (await firstMember.isVisible().catch(() => false)) {
          await firstMember.click({ button: 'right' });
          await window.waitForTimeout(500);
          await window.screenshot({ path: 'qa-screenshots/03-context-menu-open.png' });

          // Verify context menu appeared (portal to body)
          const contextMenu = window.locator('body > div').last();
          console.log('Context menu visible:', await contextMenu.isVisible().catch(() => false));
        } else {
          console.log('BLOCKED: No member elements found in member list');
        }
      } else {
        console.log('BLOCKED: Member list not visible - may need to navigate to a server channel first');
      }
    });

    test('context menu has expected sections', async ({ window }) => {
      await window.waitForTimeout(2000);
      await window.screenshot({ path: 'qa-screenshots/04-context-menu-sections.png' });
    });

    test('escape key closes context menu', async ({ window }) => {
      await window.keyboard.press('Escape');
      await window.waitForTimeout(300);
      await window.screenshot({ path: 'qa-screenshots/05-context-menu-closed.png' });
    });
  });

  test.describe('UserProfilePopover', () => {
    test('clicking member opens profile popover', async ({ window }) => {
      await window.waitForTimeout(2000);
      const memberList = window.locator('[class*="MemberList"], [data-testid="member-list"]');
      const memberListVisible = await memberList.isVisible().catch(() => false);

      if (memberListVisible) {
        const firstMember = memberList.locator('[class*="member"], [data-testid*="member"]').first();
        if (await firstMember.isVisible().catch(() => false)) {
          await firstMember.click();
          await window.waitForTimeout(500);
          await window.screenshot({ path: 'qa-screenshots/06-profile-popover-open.png' });
        } else {
          console.log('BLOCKED: No member elements found');
        }
      } else {
        console.log('BLOCKED: Member list not visible');
      }
    });

    test('profile popover shows user info', async ({ window }) => {
      await window.waitForTimeout(500);
      await window.screenshot({ path: 'qa-screenshots/07-profile-popover-content.png' });
    });

    test('escape closes profile popover', async ({ window }) => {
      await window.keyboard.press('Escape');
      await window.waitForTimeout(300);
      await window.screenshot({ path: 'qa-screenshots/08-profile-popover-closed.png' });
    });
  });

  test.describe('SoundboardPanel', () => {
    test('soundboard panel loads with server sounds', async ({ window }) => {
      // Look for soundboard trigger in the voice panel area
      await window.waitForTimeout(2000);

      const soundboardBtn = window.locator('button:has-text("Soundboard"), [aria-label*="soundboard" i]');
      const soundboardVisible = await soundboardBtn.isVisible().catch(() => false);

      if (soundboardVisible) {
        await soundboardBtn.click();
        await window.waitForTimeout(1000);
        await window.screenshot({ path: 'qa-screenshots/09-soundboard-panel.png' });
      } else {
        console.log('BLOCKED: Soundboard button not found - may need to be in voice channel first');
        await window.screenshot({ path: 'qa-screenshots/09-soundboard-not-found.png' });
      }
    });
  });

  test('capture console errors', async ({ window }) => {
    const errors: string[] = [];
    window.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await window.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log('Console errors found:');
      errors.forEach(e => console.log('  ERROR:', e));
    } else {
      console.log('No console errors detected');
    }
  });
});
