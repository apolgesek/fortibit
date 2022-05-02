import { expect, test } from '@playwright/test';
import { ElectronApplication, Page, _electron as electron } from 'playwright';
import { ProcessArgument } from '../main/process-argument.enum';

const PATH = require('path');

interface IEntryModel {
  title: string;
  username: string
}

test.describe('Entry/group', async () => {
  let app: ElectronApplication;
  let firstWindow: Page;

  async function addEntry(model?: IEntryModel) {
    await firstWindow.click('#add-entry', { force: true });
  
    const title = await firstWindow.locator('#entry-title');
    const username = await firstWindow.locator('#entry-username');
    const submitBtn = await firstWindow.locator('#entry-submit');
  
    await title.type(model?.title ?? 'Title');
    await username.type(model?.username ?? 'Username');
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

  test.afterEach(async () => {
    await app.close();
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
    const el = await firstWindow.locator('.list-cta p').getAttribute('class');
  
    expect(el).toMatch('no-entries');
  });

  test('Check entry modal opened', async () => {
    const addEntryBtn = await firstWindow.locator('#add-entry');
    await addEntryBtn.click();
    const modal = await firstWindow.waitForSelector('app-modal', { state: 'visible' });
  
    expect(modal).toBeDefined();
  });

  test('Check entry added', async () => {
    await addEntry();

    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });
    const entryListCount = await firstWindow.locator('.row-entry').count();
  
    expect(entryListCount).toBe(1);
  });

  test('Check entry edited', async () => {
    await addEntry();
    const newEntry = await firstWindow.locator('.row-entry');

    await newEntry.click();
    await firstWindow.keyboard.press('E');

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
    await addEntry();
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
    await firstWindow.dragAndDrop('.row-entry', '.node-group:has-text("General")');
    await firstWindow.locator('.node-group:has-text("General")').first().click();
    const entriesCount = await firstWindow.locator('.row-entry').count();

    expect(entriesCount).toBe(1);
  });

  test('Check entries moved', async () => {
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });
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

    const boundingBoxTarget = await firstWindow.locator('.node-group:has-text("Email")').boundingBox();
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

  test('Check group added', async () => {
    await firstWindow.waitForSelector('app-groups-sidebar', { state: 'visible' });
    const groupCountBefore = await firstWindow.locator('.node-group').count();
    await addGroup();    
    const groupCountAfter = await firstWindow.locator('.node-group').count();

    expect(groupCountAfter).toEqual(groupCountBefore + 1);
  });

  test('Check group name changed', async () => {
    const emailGroup = await firstWindow.locator('.node-group:has-text("Email")');
    await emailGroup.click({ button: 'right' });
    const renameOption = await firstWindow.locator('.context-menu li:has-text("Rename")');
    await renameOption.click();
    const input = await firstWindow.locator('.rename-group input');

    expect(input).toBeDefined();

    await firstWindow.keyboard.press('Enter');
  });

  test('Check group moved', async () => {
    await firstWindow.dragAndDrop('.node-group:has-text("Email")', '.node-group:has-text("Work")');
    const expander = await firstWindow.locator('.tree-node-level-2 .toggle-children-wrapper-collapsed');
    await expander.click();

    const workGroup = await firstWindow.locator('.node-group:has-text("Email")');
    const level = await workGroup.getAttribute('aria-level');
    expect(level).toBe("3");
  });

  test('Check group deleted', async() => {
    await firstWindow.waitForSelector('app-groups-sidebar', { state: 'visible' });
    const groupCountBefore = await firstWindow.locator('.node-group').count();

    const group = await firstWindow.locator('.node-group:has-text("Banking")');
    await group.click({ button: 'right' });
    const deleteOption = await firstWindow.locator('.context-menu li:last-child');
    await deleteOption.click();
    const modal = await firstWindow.locator('app-modal');
    const confirmDelete = await modal.locator('.primary-btn');
    await confirmDelete.click();

    await modal.waitFor({ state: 'detached' });
    const groupCountAfter = await firstWindow.locator('.node-group').count();

    expect(groupCountAfter).toEqual(groupCountBefore - 1);
  });

  test('Check entry local search', async () => {
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });

    await addEntry({ title: 'Aaaa', username: 'Bbbb' });
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });

    const searchInput = await firstWindow.locator('.search');
    const searchPhrase = 'User';

    await searchInput.type(searchPhrase);
    const resultsBadge = await firstWindow.waitForSelector('.results-badge');
    const resultsBadgeText = await resultsBadge.innerText();
    const row = await firstWindow.locator('.row-entry');
    const rowHTML = await row.innerHTML();

    expect(resultsBadge).toBeDefined();
    expect(resultsBadgeText).toMatch('1');
    expect(rowHTML).toMatch(`<strong>${searchPhrase}</strong>`);
  });

  test('Check entry global search', async () => {
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });

    const group = await firstWindow.locator('.node-group:has-text("Email")');
    await group.click();

    await addEntry();

    const groupToggle = await firstWindow.locator('.group-mode-btn');
    await groupToggle.click();
    const globalBtn = await firstWindow.locator('.dropdown-content a');
    await globalBtn.click();

    const searchInput = await firstWindow.locator('.search');
    await searchInput.type('User');
    const resultsBadge = await firstWindow.waitForSelector('.results-badge');
    const resultsBadgeText = await resultsBadge.innerText();

    expect(resultsBadge).toBeDefined();
    expect(resultsBadgeText).toMatch('2');
  });

  test('Check entry details', async () => {
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });
    const row = await firstWindow.locator('.row-entry');
    await row.click();
    const details = await firstWindow.locator('.details-container');
    const header = await details.locator('.header').innerText();
    const sectionsCount = await details.locator('.section').count();

    expect(header).toBe('Entry details');
    expect(sectionsCount).toBe(5);
  });
});