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

  test('Check open new entry modal', async () => {
    await firstWindow.waitForSelector('app-workspace', { state: 'visible' });
    await firstWindow.keyboard.press('Control+I');
    const modal = await firstWindow.waitForSelector('app-modal', { state: 'attached' });
    const header = await firstWindow.locator('.dialog-header h2').innerText();

    expect(modal).toBeDefined();
    expect(header).toBe('Add entry\nin General');
  });

  test('Check open edit entry modal', async () => {
    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });

    const row = await firstWindow.locator('.row-entry');
    await row.click();

    await firstWindow.keyboard.press('E');
    const modal = await firstWindow.waitForSelector('app-modal', { state: 'attached' });
    const header = await firstWindow.locator('.dialog-header h2').innerText();

    expect(modal).not.toBeNull();
    expect(header).toBe('Edit entry\nin General')
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
});