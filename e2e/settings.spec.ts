/* eslint-disable playwright/valid-describe-callback */
import { expect, test } from '@playwright/test';
import PATH from 'path';
import {
	ElectronApplication,
	Page,
	_electron as electron,
} from 'playwright-core';
import { ProcessArgument } from '../main/process-argument.enum';
import { addEntry } from './helpers/add-entry';
import { authenticate } from './helpers/auth';
import { setupTestFiles } from './helpers/file';
import { getInvoke } from './helpers/ipc';

let app: ElectronApplication;
let firstWindow: Page;

test.beforeEach(async () => {
	setupTestFiles();

	app = await electron.launch({
		args: [PATH.join(__dirname, '../main.js'), `--${ProcessArgument.E2E}`],
		colorScheme: 'no-preference',
		env: { E2E_FILES_PATH: 'C:\\Users\\icema\\fortibit\\e2e\\files' },
	});

	firstWindow = await app.firstWindow();
	const invoke = await getInvoke(firstWindow);
	await invoke.evaluate((invoke) => invoke('app:sendInput', 13));
	await authenticate(firstWindow);
});

test.afterEach(async () => {
	await app.evaluate((process) => process.app.exit());
});

test.describe('Settings', async () => {
	test('Check open settings modal', async () => {
		await firstWindow.getByRole('banner').waitFor({ state: 'visible' });
		await firstWindow.keyboard.press('Control+.');
		const dialogHeader = firstWindow
			.getByRole('dialog')
			.getByRole('heading', { name: 'Settings' });

		await expect(dialogHeader).toBeVisible();
	});

	test('Check clipboard clear time change', async () => {
		await firstWindow.getByRole('banner').waitFor({ state: 'visible' });
		await firstWindow.keyboard.press('Control+.');
		const settingsModal = firstWindow.getByRole('dialog');
		await settingsModal.getByText(/^Settings$/).waitFor({ state: 'visible' });
		const clipboardTimeInput =
			settingsModal.getByLabel(/clipboard auto-clear/i);
		await clipboardTimeInput.clear();
		await clipboardTimeInput.type('5');
		await firstWindow.keyboard.press('Escape');
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.getByText(/•{6}/i).dblclick();
		const notificationSeconds = await firstWindow
			.getByRole('alert')
			.innerText();

		expect(notificationSeconds).toContain('5');
	});

	test('Check auto-type disabled', async () => {
		await firstWindow.getByRole('banner').waitFor({ state: 'visible' });
		await firstWindow.keyboard.press('Control+.');
		await firstWindow
			.getByRole('dialog')
			.getByText(/^Settings$/)
			.waitFor({ state: 'visible' });

		await firstWindow
			.getByRole('dialog')
			.getByText(/enable auto-type/i)
			.click();

		await firstWindow.keyboard.press('Escape');
		const autotypeDisabledStatus = firstWindow.getByText(/(disabled)/i).first();

		await expect(autotypeDisabledStatus).toBeVisible();
	});

	test('Check save vault on idle timeout', async () => {
		test.slow();

		await firstWindow.keyboard.press('Control+.');
		await firstWindow
			.getByRole('dialog')
			.getByText(/enable autosave/i)
			.click();
		await firstWindow.keyboard.press('Escape');
		await addEntry(firstWindow, { config: { close: true } });

		await firstWindow.keyboard.press('Control+.');
		await firstWindow
			.getByRole('dialog')
			.getByLabel(/idle time lock/i)
			.fill('60');
		await firstWindow.waitForTimeout(1000);
		await firstWindow.keyboard.press('Escape');
		await firstWindow.waitForTimeout(61 * 1000);
		await authenticate(firstWindow);

		const entries = firstWindow.getByRole('main').getByRole('listitem');

		await expect(entries).toHaveCount(1);
	});

	test('Check open insecure URL prompt dialog', async () => {
		await addEntry(firstWindow, {
			config: { close: true },
			url: 'http://fortibit.com',
		});
		const entry = firstWindow.getByRole('listitem').getByText(/username1/i);
		await entry.click();
		await firstWindow.getByText(/fortibit.com/i).click();
		const insecureUrlDialog = firstWindow
			.getByRole('dialog')
			.getByRole('heading', { name: /open url/i });

		await expect(insecureUrlDialog).toBeVisible();
	});

	test('Check disable autosave should stop saving changes', async () => {
		await firstWindow.keyboard.press('Control+.');
		const enableAutosaveCheckbox = firstWindow
			.getByRole('dialog')
			.getByText(/enable autosave/i);
		await enableAutosaveCheckbox.click();
		await addEntry(firstWindow, {
			config: { close: true },
		});
		await firstWindow.waitForTimeout(1000);

		await expect(firstWindow.getByLabel('Save')).toBeEnabled();
	});

	test('Check theme toggle should change used theme', async () => {
		await firstWindow.keyboard.press('Control+.');
		const viewTab = firstWindow
			.getByRole('dialog')
			.getByRole('button', { name: /view/i });
		await viewTab.click();
		const themeCheckboxHandle = firstWindow
			.getByRole('dialog')
			.getByText(/dark theme/i);
		await themeCheckboxHandle.click();
		await firstWindow.waitForTimeout(1_000);
		const isThemeSet = await firstWindow.evaluate(
			() =>
				window.matchMedia &&
				window.matchMedia('(prefers-color-scheme: light)').matches,
		);

		expect(isThemeSet).toBe(true);
	});

	test('Check icons display toggle should hide icons', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.keyboard.press('Control+.');
		const viewTab = firstWindow
			.getByRole('dialog')
			.getByRole('button', { name: /view/i });
		await viewTab.click();
		const displayIconsCheckboxHandle = firstWindow
			.getByRole('dialog')
			.getByText(/display entry icons/i);
		await displayIconsCheckboxHandle.click();
		await firstWindow.keyboard.press('Escape');

		await expect(firstWindow.getByTestId('entry-icon')).toHaveCount(0);
	});
});
