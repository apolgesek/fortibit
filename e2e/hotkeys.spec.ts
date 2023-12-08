import { expect, test } from '@playwright/test';
import { ElectronApplication, Page, _electron as electron } from 'playwright-core';
import { ProcessArgument } from '../main/process-argument.enum';
import { addEntry } from './helpers/add-entry';
import { authenticate } from './helpers/auth';

const PATH = require('path');

test.describe('Hotkeys after auth', async () => {
  let app: ElectronApplication;
  let firstWindow: Page;

  test.beforeEach(async () => {
    app = await electron.launch({ args: [PATH.join(__dirname, '../main.js'), `--${ProcessArgument.E2E}`], colorScheme: 'dark', env: { E2E_FILES_PATH: 'C:\\Users\\icema\\fortibit\\e2e\\files' } });
    firstWindow = await app.firstWindow();
    await app.waitForEvent('window');
    await authenticate(firstWindow);
    await firstWindow.getByRole('main').waitFor({ state: 'visible' });
  });

  test.afterEach(async () => {
    await app.evaluate(process => process.app.exit());
  });

  test('Check open new entry modal', async () => {
    await firstWindow.keyboard.press('Control+N');
    await firstWindow.getByText(/add entry in general/i).waitFor({ state: 'visible' });
  });

  test('Check open edit entry modal', async () => {
    await addEntry(firstWindow, { config: { close: true } });
    await firstWindow.getByText(/username1/i).click();
    await firstWindow.keyboard.press('Control+E');
    await firstWindow.getByText(/edit entry in general/i).waitFor({ state: 'visible' });
  });

  test('Check open delete entry modal', async () => {
    await addEntry(firstWindow, { config: { close: true } });
    await firstWindow.getByText(/username1/i).click();
    await firstWindow.keyboard.press('Delete');
    await firstWindow.getByText(/remove entry/i).waitFor({ state: 'visible' });
  });

  test('Check open add group modal', async () => {
    await firstWindow.keyboard.press('Control+O');
    await firstWindow.getByRole('dialog').getByText(/add group/i).waitFor({ state: 'visible' });
  });

  test('Check lock database', async () => {
    await addEntry(firstWindow, { config: { close: true } });
    await firstWindow.keyboard.press('Control+L');
    await firstWindow.getByPlaceholder(/password/i).waitFor({ state: 'visible' });
  });

  test('Check copy username', async () => {
    await addEntry(firstWindow, { config: { close: true } });
    await firstWindow.getByText(/username1/i).click();
    await firstWindow.keyboard.press('Control+Shift+U');
    const notification = await firstWindow.getByRole('alert').innerText();

    expect(notification).toMatch(/username copied/i);
  });

  test('Check copy password', async () => {
    await addEntry(firstWindow, { config: { close: true } });
    await firstWindow.getByText(/username1/i).click();
    await firstWindow.keyboard.press('Control+Shift+C');
    const notification = await firstWindow.getByRole('alert').innerText();

    expect(notification).toMatch(/password copied/i);
  });
});

test.describe('Hotkeys before auth', async () => {
  let app: ElectronApplication;
  let firstWindow: Page;

  test.beforeEach(async () => {
    app = await electron.launch({ args: [PATH.join(__dirname, '../main.js'), `--${ProcessArgument.E2E}`], colorScheme: 'dark' });
    firstWindow = await app.firstWindow();
    await firstWindow.getByPlaceholder(/password/i).waitFor({ state: 'visible' });
  });

  test.afterEach(async () => {
    await app.evaluate(process => process.app.exit());
  });

  test('Check should not open new entry modal', async () => {
    await firstWindow.keyboard.press('Control+N');
    const dialog = firstWindow.getByRole('dialog');

    expect(dialog).not.toBeAttached();
  });

  test('Check should open settings modal', async () => {
    await firstWindow.keyboard.press('Control+.');
    const dialog = firstWindow.getByRole('dialog').getByText(/^Settings$/);
    await dialog.waitFor({ state: 'visible' });
  });
});