import { expect, test } from '@playwright/test';
import { ElectronApplication, Page, _electron as electron } from 'playwright';
import { ProcessArgument } from '../main/process-argument.enum';

const PATH = require('path');

interface IEntryModel {
  title: string;
  username: string
}

let app: ElectronApplication;
let firstWindow: Page;

async function addEntry(model?: IEntryModel) {
  await firstWindow.click('#add-entry', { force: true });

  const title = firstWindow.locator('#entry-title');
  const username = firstWindow.locator('#entry-username');
  const submitBtn = firstWindow.locator('#entry-submit');

  await title.type(model?.title ?? 'Title');
  await username.type(model?.username ?? 'Username');
  await submitBtn.click();
}

async function addGroup() {
  await firstWindow.locator('.separator').hover();
  await firstWindow.locator('.add-group').waitFor({ state: 'visible' });
  await firstWindow.locator('.add-group').click();
  await firstWindow.locator('#group-name').waitFor({ state: 'attached' });
  await firstWindow.locator('#group-name').focus();
  await firstWindow.keyboard.insertText('newgroup');
  await firstWindow.locator('.primary-btn').click();
  await firstWindow.locator('app-group-dialog').waitFor({ state: 'detached' });
}

test.beforeEach(async () => {
  app = await electron.launch({ args: [PATH.join(__dirname, '../main.js'), `--${ProcessArgument.E2E}`], colorScheme: 'dark' });
  firstWindow = await app.firstWindow();
  
  await firstWindow.waitForLoadState('domcontentloaded');
  await firstWindow.locator('.inputgroup.password input').focus();
  await firstWindow.keyboard.insertText('test123');
  await firstWindow.keyboard.press('Enter');
});

test.afterEach(async () => {
  await app.evaluate(process => process.app.exit());
});

test.describe('Entry/group', async () => {
  test('Launch electron app', async () => {
    const windowState: { isVisible: boolean; isDevToolsOpened: boolean; isCrashed: boolean } = await app.evaluate(async (process) => {
      const mainWindow = process.BrowserWindow.getAllWindows()[1];

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
    const addEntryBtn = firstWindow.locator('#add-entry');
    await addEntryBtn.click();
    const modal = await firstWindow.waitForSelector('.modal-body', { state: 'attached' });
  
    expect(modal).toBeDefined();
  });

  test('Check entry added', async () => {
    await addEntry();

    await firstWindow.locator('.modal-body').waitFor({ state: 'detached' });
    const entryListCount = await firstWindow.locator('.row-entry').count();
  
    expect(entryListCount).toBe(1);
  });

  test('Check entry edited', async () => {
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });

    const newEntry = firstWindow.locator('.row-entry');

    await newEntry.click();
    await firstWindow.keyboard.press('E');

    const modal = firstWindow.locator('.modal-body');
    await modal.waitFor({ state: 'visible' });

    expect(await firstWindow.locator('#entry-title').inputValue()).toBe('Title');
    expect(await firstWindow.locator('#entry-username').inputValue()).toBe('Username');
  });

  test('Check entry modal closed', async () => {
    await firstWindow.click('#add-entry', { force: true });
    await firstWindow.locator('app-modal').waitFor({ state: 'attached' });

    await firstWindow.keyboard.press('Escape');
    let modal = firstWindow.locator('.modal-body');
    await modal.waitFor({ state: 'detached' });

    expect(modal).toBeAttached({ attached: false });
  });

  test('Check entry removed', async () => {
    await addEntry();
    const newEntry = firstWindow.locator('.row-entry');
    await newEntry.click();

    await firstWindow.keyboard.press('Delete');

    const modal = firstWindow.locator('.modal-body');
    const removeBtn = firstWindow.locator('#entry-remove');
  
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

    const entries = firstWindow.locator('.row-entry');
    const firstEntry = await entries.nth(0);
    const secondEntry = await entries.nth(1);

    await firstEntry.click();
    await secondEntry.click({ modifiers: ['Control'] });

    await firstWindow.keyboard.press('Delete');

    const modal = firstWindow.locator('app-modal');
    const removeBtn = firstWindow.locator('#entry-remove');
    await removeBtn.click();

    await modal.waitFor({ state: 'detached' });

    const entryListCount = await firstWindow.locator('.row-entry').count();
    expect(entryListCount).toBe(0);
  });

  test('Check entry moved', async () => {
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });

    await firstWindow.dragAndDrop('.row-entry', '.group-item:nth-child(6)');

    await firstWindow.locator('.group-item:nth-child(6)').click();
    await firstWindow.locator('.row-entry').waitFor({ state: 'visible' });
    const entriesCount = await firstWindow.locator('.row-entry').count();

    expect(entriesCount).toBe(1);
  });

  test('Check entries moved', async () => {
    await firstWindow.click('.group-item:nth-child(5)');
    await addEntry();
    await firstWindow.locator('.modal-body').waitFor({ state: 'detached' });
    await addEntry();
    await firstWindow.locator('.modal-body').waitFor({ state: 'detached' });

    const rowEntries = firstWindow.locator('.row-entry');
    await rowEntries.nth(0).click();

    const boundingBoxSource = await rowEntries.nth(1).boundingBox();

    await firstWindow.mouse.move(boundingBoxSource.x + boundingBoxSource.width / 2, boundingBoxSource.y + boundingBoxSource.height / 2, { steps: 5 });
    await firstWindow.keyboard.down('Control');
    await firstWindow.mouse.down();
    await firstWindow.mouse.up();
    await firstWindow.keyboard.up('Control');

    await firstWindow.dragAndDrop('.row-entry', '.group-item:nth-child(6)');
    const entriesCount = await firstWindow.locator('.row-entry').count();

    expect(entriesCount).toBe(0);
  });

  test('Check entry password copied', async () => {
    await addEntry();
    await firstWindow.locator('.modal-body').waitFor({ state: 'detached' });

    const entryPassword = firstWindow.locator('.row-entry .column:last-child');
    await entryPassword.dblclick();
    const notification = firstWindow.locator('app-notification');

    expect(notification).toBeTruthy();
    expect(await notification.innerText()).toMatch('Password copied');
  });

  test('Check group added', async () => {
    await firstWindow.waitForSelector('app-groups-sidebar', { state: 'visible' });
    const groupCountBefore = await firstWindow.locator('.group-item').count();
    await addGroup();    
    const groupCountAfter = await firstWindow.locator('.group-item').count();

    expect(groupCountAfter).toEqual(groupCountBefore + 1);
  });

  test('Check group name changed', async () => {
    const emailGroup = firstWindow.locator('.group-item:has-text("Banking")');
    await emailGroup.click({ button: 'right' });
    const renameOption = firstWindow.locator('.context-menu li:has-text("Rename")');
    await renameOption.click();
    await firstWindow.locator('#group-name').focus();
    await firstWindow.keyboard.insertText('example');
    await firstWindow.locator('.primary-btn').click();
    await firstWindow.locator('app-group-dialog').waitFor({ state: 'detached' });
    const changedNameGroup = firstWindow.locator('.group-item:has-text("example")');

    expect(changedNameGroup).toBeDefined();
  });

  test('Check group deleted', async() => {
    await firstWindow.waitForSelector('app-groups-sidebar', { state: 'visible' });
    const groupCountBefore = await firstWindow.locator('.group-item').count();

    const group = firstWindow.locator('.group-item:has-text("Banking")');
    await group.click({ button: 'right' });
    const deleteOption = firstWindow.locator('.context-menu li:has-text("Delete")');
    await deleteOption.click();
    const modal = firstWindow.locator('.modal-body');
    const confirmDelete = modal.locator('.primary-btn');
    await confirmDelete.click();

    await modal.waitFor({ state: 'detached' });
    const groupCountAfter = await firstWindow.locator('.group-item').count();

    expect(groupCountAfter).toEqual(groupCountBefore - 1);
  });

  test('Check add entry button disabled/hidden when built-in group active', async () => {
    const trashGroup = firstWindow.locator('.group-item:nth-child(3)');
    const starredGroup = firstWindow.locator('.group-item:nth-child(2)');

    await trashGroup.click();
    let addNewButton = firstWindow.locator('#add-entry-list');
    let toolbarAddNewButtonDisabled = await firstWindow.locator('#add-entry').getAttribute('disabled');
    
    expect(await addNewButton.count()).toBe(0);
    expect(toolbarAddNewButtonDisabled).toBe('');

    await starredGroup.click();

    addNewButton = firstWindow.locator('#add-entry-list');
    toolbarAddNewButtonDisabled = await firstWindow.locator('#add-entry').getAttribute('disabled');

    expect(await addNewButton.count()).toBe(0);
    expect(toolbarAddNewButtonDisabled).toBe('');
  });

  test('Check entry local search', async () => {
    await addEntry();
    await firstWindow.locator('.modal-body').waitFor({ state: 'detached' });

    await addEntry({ title: 'Aaaa', username: 'Bbbb' });
    await firstWindow.locator('.modal-body').waitFor({ state: 'detached' });

    await firstWindow.locator('.search').focus();
    const searchPhrase = 'User';

    await firstWindow.keyboard.insertText(searchPhrase);
    const resultsBadge = await firstWindow.waitForSelector('.results-badge');
    const resultsBadgeText = await resultsBadge.innerText();
    const row = firstWindow.locator('.row-entry .username');
    const rowHTML = await row.innerHTML();

    expect(resultsBadge).toBeDefined();
    expect(resultsBadgeText).toMatch('1');
    expect(rowHTML).toMatch(`<span class="emp">${searchPhrase}</span>`);
  });

  test('Check entry global search', async () => {
    await addEntry();
    await firstWindow.locator('.modal-body').waitFor({ state: 'detached' });

    const group = firstWindow.locator('.group-item:has-text("Email")');
    await group.click();

    await addEntry();

    await firstWindow.locator('.global-search-icon').click();

    await firstWindow.locator('.search').type('User');
    const resultsBadge = await firstWindow.waitForSelector('.results-badge');
    const resultsBadgeText = await resultsBadge.innerText();

    expect(resultsBadge).toBeDefined();
    expect(resultsBadgeText).toMatch('2');
  });

  test('Check entry details', async () => {
    await addEntry();
    const group = await firstWindow.locator('h2 small').innerText();
    const title = await firstWindow.locator('#entry-title').inputValue();

    await firstWindow.locator('.modal-body').waitFor({ state: 'detached' });
    await firstWindow.locator('.row-entry').click();
    await firstWindow.locator('.entry-details').waitFor({ state: 'attached' });

    const details = firstWindow.locator('.details-container');
    const header = await details.locator('.header').innerText();
    const sectionsCount = await details.locator('.section').count();

    expect(header).toBe(`${group.substring('in '.length)}\n${title}`);
    expect(sectionsCount).toBe(5);
  });

  test('Check weak passwords found', async () => {
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });
    await firstWindow.getByText('Tools').click();
    await firstWindow.getByText('Report').hover();
    await firstWindow.getByText('Weak passwords').click();
    await firstWindow.locator('app-modal').waitFor({ state: 'attached' });
    await firstWindow.getByRole('button', { name: 'Scan' }).click();
    const lastScanDetails = firstWindow.getByText('Last scan');
    await lastScanDetails.waitFor({ state: 'attached' });

    expect(lastScanDetails).toBeAttached();
  });

  test('Check entry context menu displayed', async () => {
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });
    await firstWindow.locator('.row-entry').click({ button: 'right' });
    const contextMenu = firstWindow.locator('.context-menu');
    await contextMenu.waitFor({ state: 'attached' });
    const menuItemsCount = await contextMenu.locator('li').count();
    
    expect(contextMenu).toBeVisible();
    expect(menuItemsCount).toBe(5);
  });

  test('Check group context menu displayed', async () => {
    await firstWindow.locator('.group-item:nth-child(6)').click({ button: 'right' });
    const contextMenu = firstWindow.locator('.context-menu');
    await contextMenu.waitFor({ state: 'attached' });
    const menuItemsCount = await contextMenu.locator('li').count();
    
    expect(contextMenu).toBeVisible();
    expect(menuItemsCount).toBe(2);
  });
});

test.describe('Entry/history', async () => {
  async function addHistoryEntry() {
    const newEntry = firstWindow.locator('.row-entry');

    await newEntry.click();
    await firstWindow.keyboard.press('E');

    const modal = firstWindow.locator('app-modal');
    await modal.waitFor({ state: 'attached' });

    const entryTitleInput = firstWindow.locator('#entry-title');
    await entryTitleInput.focus();
    await entryTitleInput.type('Aaaaa');

    const submitBtn = firstWindow.locator('#entry-submit');
    submitBtn.click();

    await modal.waitFor({ state: 'detached' });
    await firstWindow.locator('#open-history-btn').click();
    await firstWindow.locator('app-modal').waitFor({ state: 'attached' });
  }

  test('Check history entry added', async () => {
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });

    await addHistoryEntry();
    const historyEntry = firstWindow.locator('.history-entry');
    const entriesCount = await historyEntry.count();
    const historyCell = historyEntry.locator('.cell');
    const index = await historyCell.nth(0).innerText();
    const title = await historyCell.nth(1).innerText();
    const username = await historyCell.nth(2).innerText();

    expect(entriesCount).toBe(1);
    expect(index).toBe('#1');
    expect(title).toBe('Title');
    expect(username).toBe('Username');
  });

  test('Check history entry restored', async () => {
    await addEntry();
    const modal = await firstWindow.locator('app-modal');
    await modal.nth(0).waitFor({ state: 'detached' });

    await addHistoryEntry();
    await firstWindow.locator('.history-entry a').click();
    await modal.nth(1).waitFor({ state: 'attached' });
    await modal.nth(1).locator('.restore').click();
    await modal.nth(1).waitFor({ state: 'detached' });
    await firstWindow.keyboard.press('Escape');
    await modal.nth(0).waitFor({ state: 'detached' });
    await firstWindow.keyboard.press('E');
    const entryTitle = await modal.nth(0).locator('#entry-title').inputValue();

    expect(entryTitle).toBe('Title');
  });

  test('Check history entry removed', async () => {
    await addEntry();
    const modal = await firstWindow.locator('app-modal');
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });

    await addHistoryEntry();
    await firstWindow.locator('.history-entry a').click();
    await modal.nth(1).waitFor({ state: 'attached' });
    await modal.nth(1).locator('.delete').click();
    await modal.nth(1).waitFor({ state: 'detached' });
    const text = await modal.nth(0).innerText();
    
    expect(text).toContain('History is empty.');
  });
});

