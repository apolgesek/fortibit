/* eslint-disable playwright/valid-describe-callback */
import { expect, test } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright-core';
import { addEntry } from './helpers/add-entry';
import { authenticate } from './helpers/auth';
import { getInvoke } from './helpers/ipc';
import { beforeEach } from './hooks/before-each';
import { afterEach } from './hooks/after-each';

test.describe('Settings', async () => {
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

	test('Check open settings modal', async () => {
		await appWindow.getByRole('banner').waitFor({ state: 'visible' });
		await appWindow.keyboard.press('Control+.');
		const dialogHeader = appWindow
			.getByRole('dialog')
			.getByRole('heading', { name: 'Settings' });

		await expect(dialogHeader).toBeVisible();
	});

	test('Check clipboard clear time change', async () => {
		await appWindow.getByRole('banner').waitFor({ state: 'visible' });
		await appWindow.keyboard.press('Control+.');
		const settingsModal = appWindow.getByRole('dialog');
		await settingsModal.getByText(/^Settings$/).waitFor({ state: 'visible' });
		const clipboardTimeInput =
			settingsModal.getByLabel(/clipboard auto-clear/i);
		await clipboardTimeInput.clear();
		await clipboardTimeInput.type('5');
		await appWindow.keyboard.press('Escape');
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.getByText(/•{6}/i).dblclick();
		const notificationSeconds = appWindow
			.getByRole('alert');

		await expect(notificationSeconds).toHaveText('5');
	});

	test('Check auto-type disabled', async () => {
		await appWindow.getByRole('banner').waitFor({ state: 'visible' });
		await appWindow.keyboard.press('Control+.');
		await appWindow
			.getByRole('dialog')
			.getByText(/^Settings$/)
			.waitFor({ state: 'visible' });

		await appWindow
			.getByRole('dialog')
			.getByText(/enable auto-type/i)
			.click();

		await appWindow.keyboard.press('Escape');
		const autotypeDisabledStatus = appWindow.getByText(/(disabled)/i).first();

		await expect(autotypeDisabledStatus).toBeVisible();
	});

	test('Check save vault on idle timeout', async () => {
		test.slow();

		await appWindow.getByRole('banner').waitFor({ state: 'visible' });
		await appWindow.keyboard.press('Control+.');
		await appWindow
			.getByRole('dialog')
			.getByText(/enable autosave/i)
			.click();
		await appWindow.keyboard.press('Escape');
		await addEntry(appWindow, { config: { close: true } });

		await appWindow.keyboard.press('Control+.');
		await appWindow
			.getByRole('dialog')
			.getByLabel(/idle time lock/i)
			.fill('60');
		await appWindow.waitForTimeout(1000);
		await appWindow.keyboard.press('Escape');
		await appWindow.waitForTimeout(61 * 1000);
		await authenticate(appWindow);

		const entries = appWindow.getByRole('main').getByRole('listitem');

		await expect(entries).toHaveCount(1);
	});

	test('Check open insecure URL prompt dialog', async () => {
		await addEntry(appWindow, {
			config: { close: true },
			url: 'http://fortibit.com',
		});
		const entry = appWindow.getByRole('listitem').getByText(/username1/i);
		await entry.click();
		await appWindow.getByText(/fortibit.com/i).click();
		const insecureUrlDialog = appWindow
			.getByRole('dialog')
			.getByRole('heading', { name: /open url/i });

		await expect(insecureUrlDialog).toBeVisible();
	});

	test('Check disable autosave should stop saving changes', async () => {
		await appWindow.getByRole('banner').waitFor({ state: 'visible' });
		await appWindow.keyboard.press('Control+.');
		const enableAutosaveCheckbox = appWindow
			.getByRole('dialog')
			.getByText(/enable autosave/i);
		await enableAutosaveCheckbox.click();
		await appWindow.keyboard.press('Escape');
		await addEntry(appWindow, {
			config: { close: true },
		});
		await appWindow.waitForTimeout(1000);

		await expect(appWindow.getByLabel('Save')).toBeEnabled();
	});

	test('Check theme toggle should change used theme', async () => {
		await appWindow.getByRole('banner').waitFor({ state: 'visible' });
		await appWindow.keyboard.press('Control+.');
		const viewTab = appWindow
			.getByRole('dialog')
			.getByRole('button', { name: /view/i });
		await viewTab.click();
		const themeCheckboxHandle = appWindow
			.getByRole('dialog')
			.getByText(/dark theme/i);
		await themeCheckboxHandle.click();
		await appWindow.waitForTimeout(1_000);
		const isThemeSet = await appWindow.evaluate(
			() =>
				window.matchMedia &&
				window.matchMedia('(prefers-color-scheme: light)').matches,
		);

		expect(isThemeSet).toBe(true);
	});

	test('Check icons display toggle should hide icons', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.keyboard.press('Control+.');
		const viewTab = appWindow
			.getByRole('dialog')
			.getByRole('button', { name: /view/i });
		await viewTab.click();
		const displayIconsCheckboxHandle = appWindow
			.getByRole('dialog')
			.getByText(/display entry icons/i);
		await displayIconsCheckboxHandle.click();
		await appWindow.keyboard.press('Escape');

		await expect(appWindow.getByTestId('entry-icon')).toHaveCount(0);
	});

	test('Check change encryption settings should generate custom password', async () => {
		await appWindow.getByRole('banner').waitFor({ state: 'visible' });
		await appWindow.keyboard.press('Control+.');
		const encryptionTab = appWindow
			.getByRole('dialog')
			.getByRole('button', { name: /encryption/i });
		await encryptionTab.click();
		await appWindow.getByLabel(/password length/i).fill('10');
		await appWindow.getByText(/lowercase letters/i).click();
		await appWindow.getByText(/special characters/i).click();
		await appWindow.getByText(/numbers/i).click();

		await appWindow.keyboard.press('Escape');
		await addEntry(appWindow, { config: { close: false } });

		await appWindow
			.getByRole('dialog')
			.getByLabel(/show password/i)
			.click();
		const passwordInput = appWindow
			.getByRole('dialog')
			.getByTestId('entry-password');

		await expect(passwordInput).toHaveValue(/[A-Z]/);
	});

	test('Check reset default settings should reset settings', async () => {
		await appWindow.getByRole('banner').waitFor({ state: 'visible' });
		await appWindow.keyboard.press('Control+.');
		await appWindow
			.getByRole('dialog')
			.getByRole('link', { name: /restore default settings/i })
			.click();
		await appWindow.waitForTimeout(1000);
		const invoke = await getInvoke(appWindow);
		await invoke.evaluate((invoke) => invoke('app:sendInput', 13)); //Enter

		await expect(
			appWindow.getByRole('dialog').getByLabel(/idle time/i),
		).toHaveValue('600');
		await expect(
			appWindow.getByRole('dialog').getByLabel(/enable autosave/i),
		).not.toBeChecked();
	});
});

[
	{ value: 'Alt+.', expected: 'Alt+.' },
	{ value: "Control+Alt+'", expected: "Ctrl+Alt+'" },
	{ value: 'Alt+Shift+4', expected: 'Alt+Shift+4' },
].forEach(({ value, expected }) => {
	test.describe('Hotkey input directive', () => {
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

		test(`Check change autotype hotkey with value: ${value}`, async () => {
			await appWindow.getByRole('banner').waitFor({ state: 'visible' });
			await appWindow.keyboard.press('Control+.');

			const autotypeHotkeyInput = appWindow
				.getByRole('dialog')
				.getByLabel(/autotype hotkey/i);
			await autotypeHotkeyInput.focus();
			await appWindow.keyboard.press(value);

			await expect(autotypeHotkeyInput).toHaveValue(expected);
		});
	});
});
