import { test as base, _electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';

type ElectronFixtures = {
  electronApp: ElectronApplication;
  window: Page;
};

const electronPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');

export const test = base.extend<ElectronFixtures>({
  electronApp: async ({}, use) => {
    const { ELECTRON_RUN_AS_NODE, ...cleanEnv } = process.env;
    const app = await _electron.launch({
      executablePath: electronPath,
      args: ['.'],
      env: {
        ...cleanEnv,
        NODE_ENV: 'test',
      },
    });
    await use(app);
    await app.close();
  },

  window: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await use(window);
  },
});

export { expect } from '@playwright/test';
