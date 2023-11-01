import { expect, test } from '@playwright/test';
import { ElectronApplication, Page, _electron as electron } from 'playwright-core';
import { ProcessArgument } from '../main/process-argument.enum';
import { addEntry } from './helpers/add-entry';
import { authenticate } from './helpers/auth';

const PATH = require('path');

let app: ElectronApplication;
let firstWindow: Page;

test.beforeEach(async () => {
  app = await electron.launch({ args: [PATH.join(__dirname, '../main.js'), `--${ProcessArgument.E2E}`], colorScheme: 'dark', env: { E2E_FILES_PATH: 'C:\\Users\\icema\\fortibit\\e2e\\files' } });
  firstWindow = await app.firstWindow();
  await authenticate(firstWindow);
});

test.afterEach(async () => {
  await app.evaluate(process => process.app.exit());
});

test.describe('Settings', async () => {
  test('Check open settings modal', async () => {
    await firstWindow.getByRole('banner').waitFor({ state: 'visible' });
    await firstWindow.keyboard.press('Control+.');
    await firstWindow.getByRole('dialog').getByText(/settings/i);
  });

  test('Check clipboard clear time change', async () => {
    await firstWindow.getByRole('banner').waitFor({ state: 'visible' });
    await firstWindow.keyboard.press('Control+.');
    const settingsModal = firstWindow.getByRole('dialog');
    await settingsModal.getByText(/^Settings$/).waitFor({ state: 'visible' });
    const clipboardTimeInput = settingsModal.getByLabel(/clipboard auto-clear/i);
    await clipboardTimeInput.clear();
    await clipboardTimeInput.type('5');
    await firstWindow.keyboard.press('Escape');
    await addEntry(firstWindow, { config: { close: true } });
    await firstWindow.getByText(/\•{6}/i).dblclick();
    const notificationSeconds = await firstWindow.getByRole('alert').innerText();
    
    expect(notificationSeconds).toContain('5');
  });

  test('Check auto-type disabled', async () => {
    await firstWindow.getByRole('banner').waitFor({ state: 'visible' });
    await firstWindow.keyboard.press('Control+.');
    await firstWindow.getByRole('dialog').getByText(/^Settings$/).waitFor({ state: 'visible' });
    await firstWindow.getByRole('dialog').getByText(/enable auto-type/i).click();
    await firstWindow.keyboard.press('Escape');
    await firstWindow.getByText(/(disabled)/i);
  });
});