import { expect, test } from '@playwright/test';
import {
	ElectronApplication,
	Page,
	_electron as electron,
} from 'playwright-core';
import { ProcessArgument } from '../main/process-argument.enum';
import { addEntry } from './helpers/add-entry';
import { authenticate } from './helpers/auth';
import { setupTestFiles } from './helpers/file';

const PATH = require('path');

const getZoomLevelFn = ({ BrowserWindow }) =>
	BrowserWindow.getFocusedWindow().webContents.getZoomLevel();

test.describe('Hotkeys after auth', async () => {
	let app: ElectronApplication;
	let firstWindow: Page;

	test.beforeEach(async () => {
		setupTestFiles();
		
		app = await electron.launch({
			args: [PATH.join(__dirname, '../main.js'), `--${ProcessArgument.E2E}`],
			colorScheme: 'dark',
			env: { E2E_FILES_PATH: 'C:\\Users\\icema\\fortibit\\e2e\\files' },
		});
		firstWindow = await app.firstWindow();
		await app.waitForEvent('window');
		await authenticate(firstWindow);
		await firstWindow.getByRole('main').waitFor({ state: 'visible' });
	});

	test.afterEach(async () => {
		await app.evaluate((process) => process.app.exit());
	});

	test('Check should open new entry modal', async () => {
		await firstWindow.keyboard.press('Control+N');
		const addEntryModal = await firstWindow.getByText(/add entry in general/i);

		await expect(addEntryModal).toBeVisible();
	});

	test('Check should open edit entry modal', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.getByRole('main').getByRole('listitem').first().click();
		await firstWindow.keyboard.press('Control+E');
		const editEntryModal = await firstWindow.getByText(
			/edit entry in general/i,
		);

		await expect(editEntryModal).toBeVisible();
	});

	test('Check should open delete entry modal', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.getByRole('main').getByRole('listitem').first().click();
		await firstWindow.keyboard.press('Delete');
		const deleteEntryModal = await firstWindow
			.getByRole('dialog')
			.getByText(/remove entry/i);

		await expect(deleteEntryModal).toBeVisible();
	});

	test('Check should open add group modal', async () => {
		await firstWindow.keyboard.press('Control+O');
		const addGroupModal = await firstWindow
			.getByRole('dialog')
			.getByText(/add group/i);

		await expect(addGroupModal).toBeVisible();
	});

	test('Check should open edit group modal', async () => {
		await firstWindow
			.getByRole('complementary')
			.getByRole('listitem')
			.filter({ hasText: /banking/i })
			.click();
		await firstWindow.keyboard.press('Control+R');
		const addGroupModal = await firstWindow
			.getByRole('dialog')
			.getByText(/edit group/i);

		await expect(addGroupModal).toBeVisible();
	});

	test('Check should lock database', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.keyboard.press('Control+L');
		const passwordInput = await firstWindow.getByPlaceholder(/password/i);

		await expect(passwordInput).toBeVisible();
	});

	test('Check should copy username', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.getByRole('main').getByRole('listitem').first().click();
		await firstWindow.keyboard.press('Control+Shift+U');
		const notification = await firstWindow.getByRole('alert').innerText();

		expect(notification).toMatch(/username copied/i);
	});

	test('Check should copy password', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.getByRole('main').getByRole('listitem').first().click();
		await firstWindow.keyboard.press('Control+Shift+C');
		const notification = await firstWindow.getByRole('alert').innerText();

		expect(notification).toMatch(/password copied/i);
	});

	test('Check should open history modal', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.getByRole('main').getByRole('listitem').first().click();
		await firstWindow.keyboard.press('Control+H');
		const entryHistoryModal = await firstWindow
			.getByRole('dialog')
			.getByText(/entry history/i);

		await expect(entryHistoryModal).toBeVisible();
	});

	test('Check should select all entries', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await addEntry(firstWindow, { config: { close: true } });
		await addEntry(firstWindow, { config: { close: true } });

		await firstWindow
			.getByText(/username1/i)
			.first()
			.click();
		await firstWindow.keyboard.press('Control+A');
		const entries = await firstWindow
			.getByRole('main')
			.getByRole('listitem')
			.all();

		for (const entry of entries) {
			await expect(entry).toHaveClass(/selected/i);
		}
	});

	test('Check should move entry', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow
			.getByRole('complementary')
			.getByRole('listitem')
			.filter({ hasText: /general/i })
			.click();
		await firstWindow.getByRole('main').getByRole('listitem').first().click();
		await firstWindow.keyboard.press('Control+M');

		const moveEntryModal = firstWindow
			.getByRole('dialog')
			.getByRole('heading', { name: /move entry to:/i });
		await expect(moveEntryModal).toBeVisible();
	});

	test('Check should save database', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.getByRole('main').getByRole('listitem').first().click();
		await firstWindow.keyboard.press('Delete');
		await firstWindow
			.getByRole('dialog')
			.getByRole('button', { name: /remove/i })
			.click();
		await firstWindow
			.getByRole('complementary')
			.getByRole('listitem')
			.filter({ hasText: /recycle bin/i })
			.click();
		await firstWindow.getByRole('main').getByRole('listitem').first().click();
		await firstWindow.keyboard.press('Delete');
		await firstWindow
			.getByRole('dialog')
			.getByRole('button', { name: /remove/i })
			.click();
		await firstWindow.getByRole('dialog').waitFor({ state: 'detached' });

		await firstWindow.keyboard.press('Control+S');
		const notification = await firstWindow.getByRole('alert');

		await expect(notification).toBeVisible();
	});
});

test.describe('Hotkeys before auth', async () => {
	let app: ElectronApplication;
	let firstWindow: Page;

	test.beforeEach(async () => {
		app = await electron.launch({
			args: [PATH.join(__dirname, '../main.js'), `--${ProcessArgument.E2E}`],
			colorScheme: 'dark',
		});
		firstWindow = await app.firstWindow();
		await firstWindow
			.getByPlaceholder(/password/i)
			.waitFor({ state: 'visible' });
	});

	test.afterEach(async () => {
		await app.evaluate((process) => process.app.exit());
	});

	test('Check should not open new entry modal', async () => {
		await firstWindow.keyboard.press('Control+N');
		const dialog = firstWindow.getByRole('dialog');

		expect(dialog).not.toBeAttached();
	});

	test('Check should open settings modal', async () => {
		await firstWindow.keyboard.press('Control+.');
		const dialog = firstWindow.getByRole('dialog').getByText(/^Settings$/);

		await expect(dialog).toBeVisible();
	});

	test('Check should open password generator modal', async () => {
		await firstWindow.keyboard.press('Control+G');
		const dialog = firstWindow.getByRole('dialog').getByText(/^Generator$/);

		await expect(dialog).toBeVisible();
	});

	test('Check should toggle fullscreen', async () => {
		await firstWindow.keyboard.press('F11');
		const isFullscreen = await app.evaluate(({ BrowserWindow }) =>
			BrowserWindow.getFocusedWindow().isFullScreen(),
		);

		expect(isFullscreen).toBe(true);
	});

	test('Check should zoom in', async () => {
		const initialZoomLevel = await app.evaluate(getZoomLevelFn);
		await firstWindow.keyboard.press('Control+=');
		const changedZoomLevel = await app.evaluate(getZoomLevelFn);

		expect(changedZoomLevel).toBeGreaterThan(initialZoomLevel);
	});

	test('Check should zoom out', async () => {
		const initialZoomLevel = await app.evaluate(getZoomLevelFn);
		await firstWindow.keyboard.press('Control+-');
		const changedZoomLevel = await app.evaluate(getZoomLevelFn);

		expect(changedZoomLevel).toBeLessThan(initialZoomLevel);
	});

	test('Check should reset zoom', async () => {
		const initialZoomLevel = await app.evaluate(getZoomLevelFn);
		await firstWindow.keyboard.press('Control+-');
		await firstWindow.keyboard.press('Control+-');
		const changedZoomLevel = await app.evaluate(getZoomLevelFn);
		await firstWindow.keyboard.press('Control+0');
		const resetZoomLevel = await app.evaluate(getZoomLevelFn);

		expect(initialZoomLevel).not.toBe(changedZoomLevel);
		expect(initialZoomLevel).toBe(resetZoomLevel);
	});
});
