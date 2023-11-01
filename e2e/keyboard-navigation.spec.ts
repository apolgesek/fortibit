import { expect, test } from '@playwright/test';
import { ElectronApplication, Page, _electron as electron } from 'playwright-core';
import { ProcessArgument } from '../main/process-argument.enum';
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

test.describe('Keyboard navigation/menu', async () => {
  test('Check arrow down navigation', async () => {
    await firstWindow.getByRole('menubar').getByText(/file/i).click();
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    const focusedItem = firstWindow.getByRole('menubar').getByText(/new file.../i);
    await focusedItem.waitFor({ state: 'visible' });
    await firstWindow.waitForTimeout(100);
    expect(focusedItem).toBeFocused();
  });

  test('Check arrow up navigation should focus first item', async () => {
    await firstWindow.getByRole('menubar').getByText(/file/i).click();
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowUp', { delay: 50 });
    const focusedItem = firstWindow.getByRole('menubar').getByText(/new file.../i);
    await focusedItem.waitFor({ state: 'visible' });
    expect(focusedItem).toBeFocused();
  });

  test('Check arrow up navigation should focus last item', async () => {
    await firstWindow.getByRole('menubar').getByText(/file/i).click();
    await firstWindow.keyboard.press('ArrowUp', { delay: 50 });
    const focusedItem = firstWindow.getByRole('menubar').getByText(/exit/i);
    await focusedItem.waitFor({ state: 'visible' });
    expect(focusedItem).toBeFocused();
  });

  test('Check arrow right navigation open menu to the right', async () => {
    await firstWindow.getByRole('menubar').getByText(/file/i).click();
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowRight', { delay: 50 });
    const focusedItem = firstWindow.getByRole('menubar').getByText(/view/i);
    await focusedItem.waitFor({ state: 'visible' });
    expect(focusedItem).toBeFocused();
  });

  test('Check arrow right navigation open submenu to the right', async () => {
    await firstWindow.getByRole('menubar').getByText(/file/i).click();
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowRight', { delay: 50 });
    const focusedItem = firstWindow.getByRole('menubar').getByText(/keepass/i)
    await focusedItem.waitFor({ state: 'visible' });
    expect(focusedItem).toBeFocused();
  });

  test('Check disabled menu item skipped', async () => {
    await firstWindow.getByRole('menubar').getByText(/file/i).click();
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    const menuItem = await firstWindow.getByRole('menubar').getByText(/^save$/i);
    await menuItem.waitFor({ state: 'visible' });
    expect(menuItem).toBeDisabled();
  });

  test('Check arrow left close submenu', async () => {
    await firstWindow.getByRole('menubar').getByText(/file/i).click();
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowRight', { delay: 50 });
    const focusedItem = firstWindow.getByRole('menubar').getByText(/keepass/i)
    await focusedItem.waitFor({ state: 'visible' });
    await firstWindow.keyboard.press('ArrowLeft', { delay: 50 });
    await focusedItem.waitFor({ state: 'hidden' });
  });
});

test.describe('Keyboard navigation/focusable list', async () => {
  test('Check arrow down navigation', async () => {
    const groups = firstWindow.getByRole('complementary').getByRole('listitem');
    await groups.first().click();
    await firstWindow.keyboard.press('ArrowDown');
    
    expect(groups.nth(1)).toHaveClass(/active/i);
  });

  test('Check arrow up navigation', async () => {
    const groups = firstWindow.getByRole('complementary').getByRole('listitem');
    await groups.nth(2).click();
    await firstWindow.keyboard.press('ArrowUp');
    
    expect(groups.nth(1)).toHaveClass(/active/);
  });

  test('Check arrow down custom group selection', async () => {
    const groups = firstWindow.getByRole('complementary').getByRole('listitem');
    await groups.first().click();
    await firstWindow.keyboard.press('ArrowDown', { delay: 100 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 100 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 100 });

    expect(groups.nth(3)).toHaveClass(/active/);
    expect(await groups.nth(3).innerText()).toBe('General');
  });
});