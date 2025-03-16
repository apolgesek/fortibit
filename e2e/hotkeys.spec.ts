/* eslint-disable playwright/valid-describe-callback */
import { expect, test } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright-core';
import { addEntry } from './helpers/add-entry';
import { beforeEach } from './hooks/before-each';
import { afterEach } from './hooks/after-each';

const getZoomFactor = ({ BrowserWindow }) =>
	BrowserWindow.getFocusedWindow().webContents.getZoomFactor();

const resetZoomFactor = (app: ElectronApplication) =>
	app.evaluate(({ BrowserWindow }) =>
		BrowserWindow.getFocusedWindow().webContents.setZoomFactor(1),
	);

test.describe('Hotkeys after auth', async () => {
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

	test('Check should open new entry modal', async () => {
		await appWindow.keyboard.press('Control+N');
		const addEntryModal = appWindow.getByText(/add\s*entry\s*in\s*general/i);

		await expect(addEntryModal).toBeVisible();
	});

	test('Check should open edit entry modal', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.getByRole('main').getByRole('listitem').first().click();
		await appWindow.keyboard.press('Control+E');
		const editEntryModal = appWindow.getByText(/edit\s*entry\s*in\s*general/i);

		await expect(editEntryModal).toBeVisible();
	});

	test('Check should open delete entry modal', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.getByRole('main').getByRole('listitem').first().click();
		await appWindow.keyboard.press('Delete');
		const deleteEntryModal = appWindow
			.getByRole('dialog')
			.getByText(/remove entry/i);

		await expect(deleteEntryModal).toBeVisible();
	});

	test('Check should open add group modal', async () => {
		await appWindow.keyboard.press('Control+O');
		const addGroupModal = appWindow.getByRole('dialog').getByText(/add group/i);

		await expect(addGroupModal).toBeVisible();
	});

	test('Check should open edit group modal', async () => {
		await appWindow
			.getByRole('complementary')
			.getByRole('listitem')
			.filter({ hasText: /banking/i })
			.click();
		await appWindow.keyboard.press('Control+R');
		const addGroupModal = appWindow
			.getByRole('dialog')
			.getByText(/edit group/i);

		await expect(addGroupModal).toBeVisible();
	});

	test('Check should lock database', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.keyboard.press('Control+L');
		const passwordInput = appWindow.getByPlaceholder(/password/i);

		await expect(passwordInput).toBeVisible();
	});

	test('Check should copy username', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.getByRole('main').getByRole('listitem').first().click();
		await appWindow.keyboard.press('Control+Shift+U');
		const notification = await appWindow.getByRole('alert').innerText();

		expect(notification).toMatch(/username copied/i);
	});

	test('Check should copy password', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.getByRole('main').getByRole('listitem').first().click();
		await appWindow.keyboard.press('Control+Shift+P');
		const notification = await appWindow.getByRole('alert').innerText();

		expect(notification).toMatch(/password copied/i);
	});

	test('Check should open history modal', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.getByRole('main').getByRole('listitem').first().click();
		await appWindow.keyboard.press('Control+H');
		const entryHistoryModal = appWindow
			.getByRole('dialog')
			.getByText(/entry history/i);

		await expect(entryHistoryModal).toBeVisible();
	});

	test('Check should select all entries', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await addEntry(appWindow, { config: { close: true } });
		await addEntry(appWindow, { config: { close: true } });

		await appWindow
			.getByText(/username1/i)
			.first()
			.click();
		await appWindow.keyboard.press('Control+A');
		const entries = await appWindow
			.getByRole('main')
			.getByRole('listitem')
			.all();

		for (const entry of entries) {
			await expect(entry).toHaveClass(/selected/i);
		}
	});

	test('Check should move entry', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow
			.getByRole('complementary')
			.getByRole('listitem')
			.filter({ hasText: /general/i })
			.click();
		await appWindow.getByRole('main').getByRole('listitem').first().click();
		await appWindow.keyboard.press('Control+M');

		const moveEntryModal = appWindow
			.getByRole('dialog')
			.getByRole('heading', { name: /move entry to:/i });
		await expect(moveEntryModal).toBeVisible();
	});

	test('Check should save database', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.getByRole('main').getByRole('listitem').first().click();
		await appWindow.keyboard.press('Delete');
		await appWindow
			.getByRole('dialog')
			.getByRole('button', { name: /remove/i })
			.click();
		await appWindow
			.getByRole('complementary')
			.getByRole('listitem')
			.filter({ hasText: /recycle bin/i })
			.click();
		await appWindow.getByRole('main').getByRole('listitem').first().click();
		await appWindow.keyboard.press('Delete');
		await appWindow
			.getByRole('dialog')
			.getByRole('button', { name: /remove/i })
			.click();
		await appWindow.getByRole('dialog').waitFor({ state: 'detached' });

		await appWindow.keyboard.press('Control+S');
		const notification = appWindow.getByRole('alert');

		await expect(notification).toBeVisible();
	});
});

test.describe('Hotkeys before auth', async () => {
	let app: ElectronApplication;
	let appWindow: Page;

	test.beforeEach(async () => {
		const { appInstance, windowInstance } = await beforeEach(false);

		app = appInstance;
		appWindow = windowInstance;
	});

	test.afterEach(async () => {
		await afterEach(app);
	});

	test('Check should not open new entry modal', async () => {
		await appWindow.keyboard.press('Control+N');
		const dialog = appWindow.getByRole('dialog');

		await expect(dialog).toBeHidden();
	});

	test('Check should open settings modal', async () => {
		await appWindow.getByLabel(/unlock/i).waitFor({ state: 'visible' });
		await appWindow.keyboard.press('Control+.');
		const dialog = appWindow.getByRole('dialog').getByText(/^Settings$/);

		await expect(dialog).toBeVisible();
	});

	test('Check should open password generator modal', async () => {
		await appWindow.getByLabel(/unlock/i).waitFor({ state: 'visible' });
		await appWindow.keyboard.press('Control+G');
		const dialog = appWindow.getByRole('dialog').getByText(/^Generator$/);

		await expect(dialog).toBeVisible();
	});

	test('Check should toggle fullscreen', async () => {
		await appWindow.getByLabel(/unlock/i).waitFor({ state: 'visible' });
		await appWindow.keyboard.press('F11');
		const isFullscreen = await app.evaluate(({ BrowserWindow }) =>
			BrowserWindow.getFocusedWindow().isFullScreen(),
		);

		expect(isFullscreen).toBe(true);
	});

	test('Check should zoom in', async () => {
		await appWindow.getByLabel(/unlock/i).waitFor({ state: 'visible' });
		const initialZoomLevel = await app.evaluate(getZoomFactor);
		await appWindow.waitForTimeout(1000);
		await appWindow.keyboard.press('Control+=');
		const changedZoomLevel = await app.evaluate(getZoomFactor);

		expect(changedZoomLevel).toBeGreaterThan(initialZoomLevel);
		await resetZoomFactor(app);
	});

	test('Check should zoom out', async () => {
		await appWindow.getByLabel(/unlock/i).waitFor({ state: 'visible' });
		const initialZoomLevel = await app.evaluate(getZoomFactor);
		await appWindow.waitForTimeout(1000);
		await appWindow.keyboard.press('Control+-');
		await appWindow.waitForTimeout(1000);
		const changedZoomLevel = await app.evaluate(getZoomFactor);

		expect(changedZoomLevel).toBeLessThan(initialZoomLevel);
		await resetZoomFactor(app);
	});

	test('Check should reset zoom', async () => {
		await appWindow.getByLabel(/unlock/i).waitFor({ state: 'visible' });
		const initialZoomLevel = await app.evaluate(getZoomFactor);
		await appWindow.waitForTimeout(1000);
		await appWindow.keyboard.press('Control+-');
		await appWindow.waitForTimeout(1000);
		await appWindow.keyboard.press('Control+-');
		await appWindow.waitForTimeout(1000);
		await appWindow.keyboard.press('Control+0');
		await appWindow.waitForTimeout(1000);
		const resetZoomLevel = await app.evaluate(getZoomFactor);

		expect(resetZoomLevel).toBe(initialZoomLevel);
		await resetZoomFactor(app);
	});
});
