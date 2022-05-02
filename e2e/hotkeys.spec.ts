import { expect, test } from '@playwright/test';
import { ElectronApplication, Page, _electron as electron } from 'playwright-core';
import { ProcessArgument } from '../main/process-argument.enum';

const PATH = require('path');

test.describe('Hotkeys', async () => {
  let app: ElectronApplication;
  let firstWindow: Page;

  async function addEntry() {
    await firstWindow.click('#add-entry', { force: true });
  
    const title = await firstWindow.locator('#entry-title');
    const username = await firstWindow.locator('#entry-username');
    const submitBtn = await firstWindow.locator('#entry-submit');
  
    await title.type('Title');
    await username.type('Username');
    await submitBtn.click();
  }
  
  async function addGroup() {
    const general = await firstWindow.locator('.node-group:has-text("Database")');
    await general.click({ button: 'right' });
    const addGroup = await firstWindow.locator('.context-menu li:first-child');
    await addGroup.click();
    await firstWindow.locator('.rename-group').waitFor({ state: 'visible' });
    await firstWindow.keyboard.press('Enter');
  }

  test.beforeEach(async () => {
    app = await electron.launch({ args: [PATH.join(__dirname, '../main.js'), `--${ProcessArgument.E2E}`] });
    firstWindow = await app.firstWindow();
    await firstWindow.waitForLoadState('domcontentloaded');
  });

  test('Launch electron app', async () => {
    const windowState: { isVisible: boolean; isDevToolsOpened: boolean; isCrashed: boolean } = await app.evaluate(async (process) => {
      const mainWindow = process.BrowserWindow.getAllWindows()[0];

      const getState = () => ({
        isVisible: mainWindow.isVisible(),
        isDevToolsOpened: mainWindow.webContents.isDevToolsOpened(),
        isCrashed: mainWindow.webContents.isCrashed(),
      });

      return new Promise((resolve) => {
        if (mainWindow.isVisible()) {
          setTimeout(() => {
            resolve(getState());
          }, 1000);
        } else {
          mainWindow.once('ready-to-show', () => setTimeout(() => resolve(getState()), 1000));
        }
      });
    });

    expect(windowState.isVisible).toBeTruthy();
    expect(windowState.isDevToolsOpened).toBeFalsy();
    expect(windowState.isCrashed).toBeFalsy();
  });

  test('Check open new entry modal', async () => {
    await firstWindow.waitForSelector('app-dashboard', { state: 'visible' });
    await firstWindow.keyboard.press('Control+I');
    const modal = await firstWindow.waitForSelector('app-modal', { state: 'visible' });
    const header = await firstWindow.locator('.dialog-header h2').innerText();

    expect(modal).toBeDefined();
    expect(header).toBe('Add entry');
  });

  test('Check open edit entry modal', async () => {
    await addEntry();
    const row = await firstWindow.locator('.row-entry');
    await row.click();

    await firstWindow.keyboard.press('Control+E');
    const modal = await firstWindow.locator('app-modal');
    const header = await firstWindow.locator('.dialog-header h2').innerText();

    expect(modal).not.toBeNull();
    expect(header).toBe('Edit entry')
  });

  test('Check open delete entry modal', async () => {
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });

    const row = await firstWindow.locator('.row-entry');
    await row.click();

    await firstWindow.keyboard.press('Delete');
    const modal = await firstWindow.locator('app-modal');
    const header = await firstWindow.locator('.dialog-header h2').innerText();

    expect(modal).not.toBeNull();
    expect(header).toBe('Remove entry')
  });

  test.afterEach(async () => {
    await app.close();
  });
});