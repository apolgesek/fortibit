import { expect, test } from '@playwright/test';
import { ElectronApplication, Page, _electron as electron } from 'playwright-core';
import { ProcessArgument } from '../main/process-argument.enum';

const PATH = require('path');

let app: ElectronApplication;
let firstWindow: Page;

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

test.describe('Keyboard navigation/menu', async () => {
  test('Check arrow down navigation', async () => {
    await firstWindow.locator('.topbar .menu-bar-item').first().click();
    await firstWindow.keyboard.press('ArrowDown');
    const focusedItemClass = await firstWindow.locator('.topbar .dropdown-content').first().locator('li').first().getAttribute('class');

    expect(focusedItemClass).toBe('focused');
  });

  test('Check arrow up navigation', async () => {
    await firstWindow.locator('.topbar .menu-bar-item').first().click();
    await firstWindow.keyboard.press('ArrowDown');
    await firstWindow.keyboard.press('ArrowDown');
    await firstWindow.keyboard.press('ArrowUp');
    const focusedItemClass = await firstWindow.locator('.topbar .dropdown-content').first().locator('li').first().getAttribute('class');

    expect(focusedItemClass).toMatch(/focused/);
  });

  test('Check arrow up navigation on first element focused last', async () => {
    await firstWindow.locator('.topbar .menu-bar-item').first().click();
    await firstWindow.keyboard.press('ArrowUp');
    const focusedItemClass = await firstWindow.locator('.topbar .dropdown-content').first().locator('> li').last().getAttribute('class');

    expect(focusedItemClass).toMatch(/focused/);
  });

  test('Check arrow right navigation open menu to the right', async () => {
    await firstWindow.locator('.topbar .menu-bar-item').first().click();
    await firstWindow.keyboard.press('ArrowDown');
    await firstWindow.keyboard.press('ArrowRight');

    const items = firstWindow.locator('.topbar .menu-bar-item');
    const focusedItem = items.getByText('View');

    expect(focusedItem).toBeDefined();
    expect(focusedItem).toHaveClass(/expanded/);
  });

  test('Check arrow right navigation open submenu to the right', async () => {
    await firstWindow.locator('.topbar .menu-bar-item').first().click();
    await firstWindow.keyboard.press('ArrowDown');
    await firstWindow.keyboard.press('ArrowDown');
    await firstWindow.keyboard.press('ArrowDown');
    await firstWindow.keyboard.press('ArrowRight');

    const submenu = firstWindow.locator('.topbar .submenu-container');
    expect(submenu).toBeAttached();
  });

  test('Check disabled menu item skipped', async () => {
    await firstWindow.locator('.topbar .menu-bar-item').first().click();
    await firstWindow.keyboard.press('ArrowDown');
    await firstWindow.keyboard.press('ArrowDown');
    await firstWindow.keyboard.press('ArrowDown');
    await firstWindow.keyboard.press('ArrowDown');
    const menuItem = await firstWindow.locator('.topbar .dropdown-content').first().locator('> li').getByText(/^Save$/);
    expect(menuItem).toHaveClass(/disabled/);
  });

  test('Check arrow left close submenu', async () => {
    await firstWindow.locator('.topbar .menu-bar-item').first().click();
    await firstWindow.keyboard.press('ArrowDown');
    await firstWindow.keyboard.press('ArrowDown');
    await firstWindow.keyboard.press('ArrowDown');
    await firstWindow.keyboard.press('ArrowRight');
    const submenu = firstWindow.locator('.topbar .submenu-container');
    await firstWindow.waitForSelector('.topbar .submenu-container > li.focused', { state: 'visible' });
    await firstWindow.keyboard.press('ArrowLeft');
    await submenu.waitFor({ state: 'detached' });

    expect(submenu).toBeAttached({ attached: false });
  });
});

test.describe('Keyboard navigation/focusable list', async () => {
  test('Check arrow down navigation', async () => {
    const groups = firstWindow.locator('.group-item');
    await groups.first().click();
    await firstWindow.keyboard.press('ArrowDown');
    
    expect(groups.nth(1)).toHaveClass(/active/);
  });

  test('Check arrow up navigation', async () => {
    const groups = firstWindow.locator('.group-item');
    await groups.nth(2).click();
    await firstWindow.keyboard.press('ArrowUp');
    
    expect(groups.nth(1)).toHaveClass(/active/);
  });

  test('Check arrow down custom group selection', async () => {
    const groups = firstWindow.locator('.group-item');
    await groups.first().click();
    await firstWindow.keyboard.press('ArrowDown', {delay: 50 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });
    await firstWindow.keyboard.press('ArrowDown', { delay: 50 });

    expect(groups.nth(3)).toHaveClass(/active/);
    expect(await groups.nth(3).innerText()).toBe('General');
  });
});