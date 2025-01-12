/* eslint-disable playwright/valid-describe-callback */
import { expect, test } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright-core';
import { beforeEach } from './hooks/before-each';
import { afterEach } from './hooks/after-each';

test.describe('Keyboard navigation/menu', async () => {
	let app: ElectronApplication;
	let appWindow: Page;

	test.beforeEach(async () => {
		const { appInstance, windowInstance } = await beforeEach();

		app = appInstance;
		appWindow = windowInstance;
	});

	test.afterEach(async () => {
		await afterEach(app);
	});

	test('Check arrow down navigation', async () => {
		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		const focusedItem = appWindow
			.getByRole('menubar')
			.getByText(/new file.../i);
		await focusedItem.waitFor({ state: 'visible' });
		await appWindow.waitForTimeout(100);

		await expect(focusedItem).toBeFocused();
	});

	test('Check arrow up navigation should focus first item', async () => {
		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowUp', { delay: 100 });
		const focusedItem = appWindow
			.getByRole('menubar')
			.getByText(/new file.../i);
		await focusedItem.waitFor({ state: 'visible' });

		await expect(focusedItem).toBeFocused();
	});

	test('Check arrow up navigation should focus last item', async () => {
		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow.keyboard.press('ArrowUp', { delay: 100 });
		const focusedItem = appWindow.getByRole('menubar').getByText(/exit/i);
		await focusedItem.waitFor({ state: 'visible' });

		await expect(focusedItem).toBeFocused();
	});

	test('Check arrow right navigation open menu to the right', async () => {
		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowRight', { delay: 100 });
		const focusedItem = appWindow.getByRole('menubar').getByText(/view/i);
		await focusedItem.waitFor({ state: 'visible' });

		await expect(focusedItem).toBeFocused();
	});

	test('Check arrow right navigation open submenu to the right', async () => {
		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowRight', { delay: 100 });
		const focusedItem = appWindow.getByRole('menubar').getByText(/keepass/i);
		await focusedItem.waitFor({ state: 'visible' });

		await expect(focusedItem).toBeFocused();
	});

	test('Check disabled menu item skipped', async () => {
		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		const menuItem = appWindow.getByRole('menubar').getByText(/save/i).first();
		await menuItem.waitFor({ state: 'visible' });

		await expect(menuItem).toBeDisabled();
	});

	test('Check arrow left close submenu', async () => {
		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowRight', { delay: 100 });
		const focusedItem = appWindow.getByRole('menubar').getByText(/keepass/i);
		await focusedItem.waitFor({ state: 'visible' });
		await appWindow.keyboard.press('ArrowLeft', { delay: 100 });

		await expect(focusedItem).toBeHidden();
	});
});

test.describe('Keyboard navigation/focusable list', async () => {
	let app: ElectronApplication;
	let appWindow: Page;

	test.beforeEach(async () => {
		const { appInstance, windowInstance } = await beforeEach();

		app = appInstance;
		appWindow = windowInstance;
	});

	test.afterEach(async () => {
		await afterEach(app);
	});

	test('Check arrow down navigation', async () => {
		const groups = appWindow.getByRole('complementary').getByRole('listitem');
		await groups.first().click();
		await appWindow.keyboard.press('ArrowDown');

		await expect(groups.nth(1)).toHaveClass(/active/i);
	});

	test('Check arrow up navigation', async () => {
		const groups = appWindow.getByRole('complementary').getByRole('listitem');
		await groups.nth(2).click();
		await appWindow.keyboard.press('ArrowUp');

		await expect(groups.nth(1)).toHaveClass(/active/);
	});

	test('Check arrow down custom group selection', async () => {
		const groups = appWindow.getByRole('complementary').getByRole('listitem');
		await groups.first().click();
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });
		await appWindow.keyboard.press('ArrowDown', { delay: 100 });

		await expect(groups.nth(3)).toHaveClass(/active/);
		await expect(groups.nth(3)).toHaveText('General');
	});
});
