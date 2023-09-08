import { expect, test } from '@playwright/test';
import { ElectronApplication, Page, _electron as electron } from 'playwright-core';
import { ProcessArgument } from '../main/process-argument.enum';

const PATH = require('path');

let app: ElectronApplication;
let firstWindow: Page;

interface IEntryModel {
  title: string;
  username: string
}

async function addEntry(model?: IEntryModel) {
  await firstWindow.click('#add-entry', { force: true });

  const title = firstWindow.locator('#entry-title');
  const username = firstWindow.locator('#entry-username');
  const submitBtn = firstWindow.locator('#entry-submit');

  await title.type(model?.title ?? 'Title');
  await username.type(model?.username ?? 'Username');
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

test.describe('Settings', async () => {
  test('Check open settings modal', async () => {
    await firstWindow.waitForSelector('app-workspace', { state: 'visible' });
    await firstWindow.keyboard.press('Control+.');
    const settingsModal = firstWindow.locator('app-modal');
    await settingsModal.waitFor({ state: 'attached' });
    expect(firstWindow.locator('app-modal')).toBeAttached();
  });

  test('Check clipboard clear time change', async () => {
    await firstWindow.waitForSelector('app-workspace', { state: 'visible' });
    await firstWindow.keyboard.press('Control+.');
    const settingsModal = firstWindow.locator('app-modal');
    await settingsModal.waitFor({ state: 'attached' });

    const clipboardTimeInput = settingsModal.locator('#clipboardTime');
    await clipboardTimeInput.clear();
    await clipboardTimeInput.type('5');
    await firstWindow.keyboard.press('Escape');

    await addEntry();
    await firstWindow.locator('app-modal').waitFor({ state: 'detached' });

    const entry = firstWindow.locator('.row-entry').first();
    await entry.locator('.password').dblclick();
    
    const notificationSeconds = await firstWindow.locator('.seconds-left').innerText();
    expect(notificationSeconds).toBe('5');
  });

  test('Check auto-type disabled', async () => {
    await firstWindow.waitForSelector('app-workspace', { state: 'visible' });
    await firstWindow.keyboard.press('Control+.');
    const settingsModal = firstWindow.locator('app-modal');
    await settingsModal.waitFor({ state: 'attached' });

    const autoTypeSwitch = settingsModal.locator('.switch').first();
    await autoTypeSwitch.click();
    await firstWindow.pause();
    await firstWindow.keyboard.press('Escape');
  });
});