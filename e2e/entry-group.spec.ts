import { BrowserContext, ElectronApplication, Page, _electron as electron } from 'playwright-core';
import { test, expect } from '@playwright/test';

const PATH = require('path');

test.describe('Entry/group', async () => {
  let app: ElectronApplication;
  let firstWindow: Page;
  let context: BrowserContext;

  test.beforeAll( async () => {
    app = await electron.launch({ args: [PATH.join(__dirname, '../main.js'), PATH.join(__dirname, '../package.json')] });
    context = app.context();
    await context.tracing.start({ screenshots: true, snapshots: true });
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

  test('Check entries table - no entries', async () => {
      const el = await firstWindow.$('.list-cta p');
      const text = await el.innerText();
    
      expect(text).toBe('No entries have been added yet');
  });

  test('Check entry modal opened', async () => {
    await firstWindow.click('#add-entry');
    const modal = await firstWindow.locator('app-modal');
  
    expect(modal).toBeVisible();
  });

  async function addEntry() {
    await firstWindow.click('#add-entry', { force: true });

    const title = await firstWindow.locator('#entry-title');
    const username = await firstWindow.locator('#entry-username');
    const submitBtn = await firstWindow.locator('#entry-submit');

    await title.type('Title');
    await username.type('Username');
    await submitBtn.click();
  }

  test('Check entry added', async () => {
    addEntry();

    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });
    const entryListCount = await firstWindow.locator('.row-entry').count();
  
    expect(entryListCount).toBe(1);
  });

  test('Check entry edited', async () => {
    const newEntry = await firstWindow.locator('.row-entry');

    await newEntry.click();
    await firstWindow.keyboard.press('Enter');

    const modal = await firstWindow.locator('app-modal');
    await modal.waitFor({ state: 'attached' });

    expect(modal).toBeVisible();
    expect(await firstWindow.locator('#entry-title').inputValue()).toBe('Title');
    expect(await firstWindow.locator('#entry-username').inputValue()).toBe('Username');
  });

  test('Check entry modal closed', async () => {
    let modal = await firstWindow.locator('app-modal');
    await firstWindow.keyboard.press('Escape');

    await modal.waitFor({ state: 'detached'  });

    expect(true).toBeTruthy();
  });

  test('Check entry removed', async () => {
    const newEntry = await firstWindow.locator('.row-entry');

    await newEntry.click();

    await firstWindow.keyboard.press('Delete');

    const modal = await firstWindow.locator('app-modal');
    const removeBtn = await firstWindow.locator('#entry-remove');
  
    await removeBtn.click();
    await modal.waitFor({ state: 'detached' });
  
    const entryListCount = await firstWindow.locator('.row-entry').count();

    expect(entryListCount).toBe(0);
  });

  test('Check entries removed', async () => {
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });

    const entries = await firstWindow.locator('.row-entry');
    const firstEntry = await entries.nth(0);
    const secondEntry = await entries.nth(1);

    await firstEntry.click();
    await secondEntry.click({ modifiers: ['Control'] });

    await firstWindow.keyboard.press('Delete');
    const modal = await firstWindow.locator('app-modal');
  
    await modal.waitFor({ state: 'attached' });

    const removeBtn = await firstWindow.locator('#entry-remove');
    await removeBtn.click();

    await modal.waitFor({ state: 'detached' });

    const entryListCount = await firstWindow.locator('.row-entry').count();
    expect(entryListCount).toBe(0);
  });

  test('Check entry moved', async () => {
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });
    await firstWindow.dragAndDrop('.row-entry', '.node-group-name:has-text("General")');
    await firstWindow.locator('.node-group-name:has-text("General")').first().click();
    const entriesCount = await firstWindow.locator('.row-entry').count();

    expect(entriesCount).toBe(1);
  });

  test('Check entries moved', async () => {
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });
    const rowEntries = await firstWindow.locator('.row-entry');

    await rowEntries.nth(0).click();

    const boundingBoxSource = await rowEntries.nth(1).boundingBox();
    await firstWindow.mouse.move(boundingBoxSource.x + boundingBoxSource.width / 2, boundingBoxSource.y + boundingBoxSource.height / 2);
    await firstWindow.keyboard.down('Control');
    await firstWindow.mouse.down();
    await firstWindow.mouse.up();
    await firstWindow.mouse.down();
    await firstWindow.keyboard.up('Control');

    const boundingBoxTarget = await firstWindow.locator('.node-group-name:has-text("Email")').boundingBox();
    await firstWindow.mouse.move(boundingBoxTarget.x + boundingBoxTarget.width / 2, boundingBoxTarget.y + boundingBoxTarget.height / 2, { steps: 5 });
    await firstWindow.mouse.up();

    const entriesCount = await firstWindow.locator('.row-entry').count();

    expect(entriesCount).toBe(0);
  });

  test('Check entry password copied', async () => {
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });

    const entryPassword = await firstWindow.locator('.row-entry .column:last-child');
    await entryPassword.dblclick();
    const notification = await firstWindow.locator('app-notification');

    expect(notification).toBeTruthy();
    expect(await notification.innerText()).toMatch('Password copied');
  });

  test.afterAll( async () => {
    await context.tracing.stop({ path: 'e2e/tracing/trace.zip' });
    await app.close();
  });
});