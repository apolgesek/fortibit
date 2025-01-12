/* eslint-disable playwright/valid-describe-callback */
import { expect, test } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import { addEntry } from './helpers/add-entry';
import { authenticate } from './helpers/auth';
import { getInvoke } from './helpers/ipc';
import { beforeEach } from './hooks/before-each';
import { afterEach } from './hooks/after-each';

test.describe('Workspace > Entry & group', async () => {
	let app: ElectronApplication;
	let appWindow: Page;

	async function addGroup() {
		await appWindow.getByText(/groups/i).hover();
		await appWindow.getByLabel(/add group/i).waitFor({ state: 'visible' });
		await appWindow.getByLabel(/add group/i).click();
		await appWindow.getByPlaceholder(/name/i).waitFor({ state: 'attached' });
		await appWindow.getByPlaceholder(/name/i).focus();
		await appWindow.keyboard.insertText('new group');
		await appWindow
			.getByRole('dialog')
			.getByRole('button', { name: /save/i })
			.click();
		await appWindow.getByRole('dialog').waitFor({ state: 'detached' });
	}

	test.beforeEach(async () => {
		const { appInstance, windowInstance } = await beforeEach();

		app = appInstance;
		appWindow = windowInstance;
	});

	test.afterEach(async () => {
		await afterEach(app);
	});

	test('Launch electron app', async () => {
		const windowState: {
			isVisible: boolean;
			isDevToolsOpened: boolean;
			isCrashed: boolean;
		} = await app.evaluate(async (process) => {
			const mainWindow = process.BrowserWindow.getAllWindows()[1];

			const getState = () => ({
				isVisible: mainWindow.isVisible(),
				isDevToolsOpened: mainWindow.webContents.isDevToolsOpened(),
				isCrashed: mainWindow.webContents.isCrashed(),
			});

			return new Promise((resolve) => {
				if (mainWindow.isVisible()) {
					setTimeout(() => {
						resolve(getState());
					}, 1000);
				} else {
					mainWindow.once('ready-to-show', () =>
						setTimeout(() => resolve(getState()), 1000),
					);
				}
			});
		});

		expect(windowState.isVisible).toBeTruthy();
		expect(windowState.isDevToolsOpened).toBeFalsy();
		expect(windowState.isCrashed).toBeFalsy();
	});

	test('Check entries table - no entries', async () => {
		const noEntriesText = appWindow.getByText(
			/there are no entries in this group/i,
		);
		await noEntriesText.waitFor({ state: 'visible', timeout: 4000 });

		await expect(noEntriesText).toBeVisible();
	});

	test('Check entry modal opened', async () => {
		await appWindow.getByRole('button', { name: /add entry/i }).click();
		const modalHeader = appWindow.getByText(/add\s*entry\s*in\s*general/i);
		await modalHeader.waitFor({ state: 'visible', timeout: 4000 });

		await expect(modalHeader).toBeVisible();
	});

	test('Check entry added', async () => {
		await addEntry(appWindow, { config: { close: true } });
		const entryTitle = await appWindow.getByText(/title1/i).count();
		const entryUsername = await appWindow.getByText(/username1/i).count();
		const password = await appWindow.getByText(/•{6}/i).count();
		const noEntriesText = await appWindow
			.getByText(/there are no entries in this group/i)
			.count();

		expect(entryTitle).toBe(1);
		expect(entryUsername).toBe(1);
		expect(password).toBe(1);
		expect(noEntriesText).toBe(0);
	});

	test('Check entry edited', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.getByRole('main').getByRole('listitem').first().click();
		await appWindow.keyboard.press('Control+E');
		await appWindow
			.getByText(/edit\s*entry\s*in\s*general/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await appWindow.getByPlaceholder(/title/i).fill('Different title');
		await appWindow.getByText(/confirm/i).click();

		await expect(
			appWindow
				.getByRole('main')
				.getByRole('listitem')
				.filter({ hasText: 'Different title' }),
		).toBeVisible();
		await expect(
			appWindow
				.getByRole('main')
				.getByRole('listitem')
				.filter({ hasText: 'Username1' }),
		).toBeVisible();
	});

	test('Check entry modal closed', async () => {
		await appWindow.getByRole('button', { name: /add entry/i }).click();
		const addEntryModalHeader = appWindow
			.getByRole('dialog')
			.getByText(/add\s*entry\s*in\s*general/i);
		await addEntryModalHeader.waitFor({ state: 'visible' });
		await appWindow.keyboard.press('Escape');

		await expect(addEntryModalHeader).toBeHidden();
	});

	test('Check entry removed', async () => {
		await addEntry(appWindow, { config: { close: true } });
		const newEntry = appWindow.getByText(/username1/i);
		await newEntry.click();
		await appWindow.keyboard.press('Delete');
		const removeBtn = appWindow
			.getByRole('dialog')
			.getByRole('button', { name: /remove/i });
		await removeBtn.click();
		await appWindow
			.getByText(/remove entry/i)
			.waitFor({ state: 'hidden', timeout: 4000 });
		const entryListCount = await appWindow.getByText(/username1/i).count();

		expect(entryListCount).toBe(0);

		await appWindow
			.getByRole('listitem')
			.getByText(/recycle bin/i)
			.click();
		const entry = appWindow.getByRole('listitem').getByText(/username1/i);

		await expect(entry).toBeVisible();
	});

	test('Check entries removed', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await addEntry(appWindow, { config: { close: true } });
		const entries = appWindow.getByText(/username1/i);
		await entries.nth(0).click();
		await entries.nth(1).click({ modifiers: ['Control'] });
		await appWindow.keyboard.press('Delete');
		const removeBtn = appWindow
			.getByRole('dialog')
			.getByRole('button', { name: /remove/i });
		await removeBtn.click();
		await appWindow
			.getByText(/remove entry/i)
			.waitFor({ state: 'hidden', timeout: 4000 });
		const entryListCount = await appWindow.getByText(/username1/i).count();

		expect(entryListCount).toBe(0);

		await appWindow
			.getByRole('listitem')
			.getByText(/recycle bin/i)
			.click();

		await expect(await entries).toHaveCount(2);
	});

	test('Check entry moved', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow
			.getByText(/username1/i)
			.dragTo(appWindow.getByText(/banking/i));
		await appWindow.getByText(/banking/i).click();
		await appWindow.getByText(/username1/i).waitFor({ state: 'visible' });
		const entriesCount = await appWindow.getByText(/username1/i).count();

		expect(entriesCount).toBe(1);
	});

	test('Check entries moved', async () => {
		await appWindow.getByText(/banking/i).click();
		await addEntry(appWindow, { config: { close: true } });
		await addEntry(appWindow, { config: { close: true } });
		const rowEntries = appWindow.getByText(/username1/i);
		await rowEntries.nth(0).click();
		const boundingBoxSource = await rowEntries.nth(1).boundingBox();
		await appWindow.mouse.move(
			boundingBoxSource.x + boundingBoxSource.width / 2,
			boundingBoxSource.y + boundingBoxSource.height / 2,
			{ steps: 5 },
		);
		await appWindow.keyboard.down('Control');
		await appWindow.mouse.down();
		await appWindow.mouse.up();
		await appWindow.keyboard.up('Control');
		await appWindow
			.getByText(/username1/i)
			.nth(0)
			.dragTo(appWindow.getByText(/email/i));
		const entriesCount = await appWindow.getByText(/username1/i).count();

		expect(entriesCount).toBe(0);
	});

	test('Check entry password copied', async () => {
		await addEntry(appWindow, { config: { close: true } });
		const entryPassword = appWindow.getByText(/•{6}/i);
		await entryPassword.dblclick();
		const notification = appWindow.getByRole('alert');

		await expect(notification).toHaveText(/password copied/i);
	});

	test('Check entry added to favorites', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.getByRole('main').getByRole('listitem').first().click();

		await appWindow.getByLabel(/add to favorites/i).click();
		const notification = appWindow.getByRole('alert');

		await expect(notification).toHaveText(/added to favorites/i);

		await appWindow.getByText(/favorites/i).click();
		const entry = appWindow.getByRole('listitem').getByText(/username1/i);

		await expect(entry).toBeVisible();
	});

	test('Check group added', async () => {
		await appWindow.getByText(/groups/i).waitFor({ state: 'visible' });
		const groupCountBefore = await appWindow.getByRole('listitem').count();
		await addGroup();
		const groupCountAfter = await appWindow.getByRole('listitem').count();

		expect(groupCountAfter).toEqual(groupCountBefore + 1);
	});

	test('Check group name changed', async () => {
		await appWindow.getByText(/banking/i).click({ button: 'right' });
		const contextMenu = appWindow.getByTestId('context-menu');
		await contextMenu.getByText(/edit/i).click();
		await appWindow.getByPlaceholder(/name/i).focus();
		await appWindow.keyboard.insertText('example');
		await appWindow
			.getByRole('dialog')
			.getByRole('button', { name: /save/i })
			.click();
		await appWindow.getByRole('dialog').waitFor({ state: 'detached' });
		const changedNameGroup = appWindow.getByText(/example/i);

		await expect(changedNameGroup).toBeVisible();
	});

	test('Check group deleted', async () => {
		await appWindow.getByText(/groups/i).waitFor({ state: 'visible' });
		const groupCountBefore = await appWindow.getByRole('listitem').count();
		await appWindow.getByText(/banking/i).click({ button: 'right' });
		await appWindow.getByText(/delete/i).click();
		await appWindow
			.getByRole('dialog')
			.getByRole('button', { name: /remove/i })
			.click();
		await appWindow.getByRole('dialog').waitFor({ state: 'detached' });
		const groupCountAfter = await appWindow.getByRole('listitem').count();

		expect(groupCountAfter).toEqual(groupCountBefore - 1);
	});

	test('Check add entry button disabled/hidden when built-in group active', async () => {
		const trashGroup = appWindow
			.getByRole('listitem')
			.getByText(/recycle bin/i);
		const emailGroup = appWindow.getByRole('listitem').getByText(/email/i);
		await trashGroup.click();
		const addNewButton = appWindow.getByRole('link', { name: /add entry/i });
		const addEntryBtn = appWindow.getByRole('button', { name: /add entry/i });

		await expect(addNewButton).toBeHidden();
		await expect(addEntryBtn).toHaveAttribute('disabled');

		await emailGroup.click();

		await expect(addNewButton).toBeVisible();
		await expect(addEntryBtn).not.toHaveAttribute('disabled');
	});

	test('Check entry local search', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await addEntry(appWindow, {
			title: 'Aaaa',
			username: 'Bbbb',
			config: { close: true },
		});

		const searchPhrase = 'User';
		await appWindow.getByPlaceholder(/search in group/i).fill(searchPhrase);
		const resultsBadge = appWindow.getByText(/\d found/i);
		const resultsBadgeText = await resultsBadge.innerText();
		const row = appWindow.getByText(/username1/i);
		const rowHTML = await row.innerHTML();

		expect(resultsBadge).toBeDefined();
		expect(resultsBadgeText).toMatch(/1/);
		expect(rowHTML).toMatch(searchPhrase);
	});

	test('Check entry global search', async () => {
		await addEntry(appWindow, { config: { close: true } });
		const group = appWindow.getByRole('listitem').getByText(/email/i);
		await group.click();
		await addEntry(appWindow, { config: { close: true } });
		await appWindow
			.getByRole('button', { name: /search (all|selected) groups?/i })
			.click();
		await appWindow.getByPlaceholder(/search all/i).type('User');
		const resultsBadge = appWindow.getByText(/\d found/i);
		const resultsBadgeText = await resultsBadge.innerText();

		expect(resultsBadgeText).toMatch('2');
	});

	test('Check entry details', async () => {
		await addEntry(appWindow);
		const title = await appWindow.getByPlaceholder(/title/i).inputValue();
		await appWindow
			.getByText(/add\s*entry\s*in\s*general/i)
			.waitFor({ state: 'hidden', timeout: 4000 });
		await appWindow.getByRole('main').getByRole('listitem').first().click();
		const header = await appWindow.getByText(/general\s*title1/i).innerText();

		expect(header).toMatch(title);

		const entryHistoryButton = await appWindow
			.getByText(/show history/i)
			.count();
		const favoriteButton = await appWindow
			.getByRole('button', { name: /add to favorites/i })
			.count();
		const openLinkButton = await appWindow
			.getByRole('button', { name: /add to favorites/i })
			.count();
		const urlSection = await appWindow.getByText(/^url$/i).count();
		const usernameSection = await appWindow.getByText(/^username$/i).count();
		const passwordSection = await appWindow.getByText(/^password$/i).count();
		const notesSection = await appWindow.getByText(/^notes$/i).count();

		expect(entryHistoryButton).toBe(1);
		expect(favoriteButton).toBe(1);
		expect(openLinkButton).toBe(1);
		expect(urlSection).toBe(0);
		expect(usernameSection).toBe(1);
		expect(passwordSection).toBe(1);
		expect(notesSection).toBe(0);
	});

	test('Check weak passwords found', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.getByText(/tools/i).click();
		await appWindow.getByText(/report/i).hover();
		await appWindow.getByText(/weak passwords/i).click();
		await appWindow
			.getByText(/weak passwords report/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await appWindow.getByRole('button', { name: 'Scan' }).click();
		const lastScanDetails = appWindow.getByText('Last scan');

		await expect(lastScanDetails).toBeVisible();
	});

	test('Check entry context menu displayed', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.getByText(/username1/i).click({ button: 'right' });
		const contextMenu = appWindow.getByTestId('context-menu');
		const copyUsernameOption = await contextMenu
			.getByText(/copy username/i)
			.count();
		const copyPasswordOption = await contextMenu
			.getByText(/copy password/i)
			.count();
		const editEntryOption = await contextMenu.getByText(/edit (.*)/i).count();
		const moveEntryOption = await contextMenu
			.getByText(/^\s*move (.*)/i)
			.count();
		const deleteEntryOption = await contextMenu
			.getByText(/remove (.*)/i)
			.count();

		expect(copyUsernameOption).toBe(1);
		expect(copyPasswordOption).toBe(1);
		expect(editEntryOption).toBe(1);
		expect(moveEntryOption).toBe(1);
		expect(deleteEntryOption).toBe(1);
	});

	test('Check group context menu displayed', async () => {
		await appWindow
			.getByRole('listitem')
			.getByText(/email/i)
			.click({ button: 'right' });
		const contextMenu = appWindow.getByTestId('context-menu');
		const editGroupOption = contextMenu.getByText(/edit (.*)/i);
		const removeGroupOption = contextMenu.getByText(/remove (.*)/i);

		expect(await editGroupOption.count()).toBe(1);
		expect(await removeGroupOption.count()).toBe(1);

		await appWindow
			.getByRole('listitem')
			.getByText(/general/i)
			.click({ button: 'right' });

		expect(await removeGroupOption.count()).toBe(0);
		expect(await editGroupOption.count()).toBe(0);
	});

	test('Check sort by creation date', async () => {
		await addEntry(appWindow, {
			config: { close: true },
			title: 'Abbbb',
			username: 'user',
		});
		await addEntry(appWindow, {
			config: { close: true },
			title: 'Zeeee',
			username: 'user2',
		});
		await addEntry(appWindow, { config: { close: true } });

		await appWindow.getByText(/creation date/i).click();
		await appWindow.getByText(/descending/i).click();
		await appWindow.getByText(/ascending/i).click();

		const firstEntry = appWindow
			.getByRole('main')
			.getByRole('listitem')
			.first();
		expect(await firstEntry.innerText()).toMatch(/Abbbb/);

		await appWindow
			.getByText(/creation date/i)
			.nth(1)
			.click();
		await appWindow.getByText('Title', { exact: true }).click();
		await appWindow.getByText(/ascending/i).click();
		await appWindow.getByText(/descending/i).click();

		expect(await firstEntry.innerText()).toMatch(/Zeeee/);
	});

	test('Check password generated on modal open', async () => {
		await appWindow.getByText(/^\s*tools\s*$/i).click();
		await appWindow.getByText(/generator/i).click();
		await appWindow
			.getByRole('dialog')
			.getByText(/generator/i)
			.waitFor({ state: 'visible' });
		const password = await appWindow.getByTestId('password').innerText();

		expect(password).toHaveLength(15);
	});

	test('Check password generated when settings changed', async () => {
		await appWindow.getByText(/^\s*tools\s*$/i).click();
		await appWindow.getByText(/generator/i).click();
		await appWindow
			.getByRole('dialog')
			.getByText(/generator/i)
			.waitFor({ state: 'visible' });
		const sliderTrack = appWindow
			.getByRole('dialog')
			.getByTestId('slider-track');
		await sliderTrack.hover({ force: true, position: { x: 50, y: 0 } });
		await appWindow.mouse.down();
		await appWindow.mouse.up();
		await appWindow.waitForTimeout(250);
		await appWindow
			.getByRole('dialog')
			.getByText(/uppercase letters/i)
			.click();
		const password = await appWindow.getByTestId('password').innerText();

		expect(password).toHaveLength(33);
		expect(password).toMatch(/[^A-Z]*/);
	});

	test('Check leaked passwords scan no results', async () => {
		await appWindow.getByText('Tools', { exact: true }).click();
		await appWindow.getByText(/report/i).click();
		await appWindow.getByText(/leaked passwords/i).click();
		await appWindow
			.getByText(/leaked passwords report/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await appWindow.getByRole('button', { name: 'Scan' }).click();
		const lastScanDetails = appWindow.getByText('Last scan');
		await lastScanDetails.waitFor({ state: 'visible' });
		const dialogContent = await appWindow.getByRole('dialog').innerText();

		expect(dialogContent).toMatch(/you're all good/i);
	});

	test('Check leaked passwords scan detected leaks', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.getByText(/tools/i).click();
		await appWindow.getByText(/report/i).click();
		await appWindow.getByText(/leaked passwords/i).click();
		await appWindow
			.getByText(/leaked passwords report/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await appWindow.getByRole('button', { name: 'Scan' }).click();
		const dialogContent = appWindow.getByRole('dialog');

		await expect(dialogContent).toHaveText(
			/\d+\s*exposed\s*passwords?\s*found/i,
		);

		const editButton = appWindow.getByRole('dialog').getByLabel('Edit');
		await editButton.scrollIntoViewIfNeeded();
		await editButton.click();

		await appWindow
			.getByText(/edit\s*entry\s*in\s*general/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await appWindow.keyboard.press('Escape');
		await appWindow.keyboard.press('Escape');

		await appWindow.getByRole('main').getByRole('listitem').first().click();

		await expect(appWindow.getByTestId('exposed-icon')).toBeVisible();
		await expect(appWindow.getByRole('complementary').nth(1)).toHaveText(
			/This password was detected in a data leak and may be compromised/,
		);
	});

	test('Check maintenance scan should remove entry according to input', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.getByRole('main').getByRole('listitem').first().click();
		await appWindow.keyboard.press('Control+E');
		await appWindow
			.getByText(/edit\s*entry\s*in\s*general/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await appWindow.getByPlaceholder(/title/i).type('Mail');
		await appWindow.getByText(/confirm/i).click();
		await appWindow
			.getByText(/edit\s*entry\s*in\s*general/i)
			.waitFor({ state: 'hidden', timeout: 4000 });

		await appWindow.getByRole('menubar').getByText(/tools/i).click();
		await appWindow
			.getByRole('menubar')
			.getByText(/maintenance/i)
			.click();
		await appWindow.getByRole('button', { name: /delete/i }).click();

		await expect(
			appWindow.getByRole('alert').getByText(/maintenance completed/i),
		).toBeVisible();

		const daysInput = appWindow.getByRole('dialog').getByTestId('history-days');
		await daysInput.fill('0');
		await appWindow.getByRole('button', { name: /delete/i }).click();

		await expect(
			appWindow.getByRole('alert').getByText(/maintenance completed/i),
		).toBeVisible();
	});

	test('Check secure protocol availability should mark entries', async () => {
		await addEntry(appWindow, {
			config: { close: true },
			url: 'http://google.com',
		});
		await appWindow.keyboard.press('Control+S');
		await appWindow.waitForSelector('[role=alert]');
		await appWindow.keyboard.press('Control+L');
		await authenticate(appWindow);
		await appWindow.getByRole('main').waitFor({ state: 'visible' });
		await appWindow.getByText(/username1/i).click();

		await expect(
			appWindow.getByText('https protocol is available'),
		).toBeVisible({
			timeout: 10_000,
		});
	});

	test('Check TOTP is generating when valid secret is saved manually', async () => {
		await addEntry(appWindow, {
			config: { close: true },
			otpAuth: 'JBSWY3DPEHPK3PXP',
		});
		await appWindow.getByRole('main').getByRole('listitem').first().click();

		const secondsLeftProgress = appWindow.getByTestId('otp-s-left');
		await expect(
			appWindow.locator('div', { has: secondsLeftProgress }).last(),
		).toHaveText(/[0-9]{6}/i);
		await expect(secondsLeftProgress).toBeVisible();
		await expect(secondsLeftProgress).toHaveText(/[0-9]{1,2}/i);
	});

	test('Check TOTP scan error message is displayed when there is no valid qr code in the background', async () => {
		await addEntry(appWindow, {
			config: { close: true },
		});

		await appWindow.getByRole('main').getByRole('listitem').first().click();
		await appWindow.getByLabel(/more options/i).click();
		await appWindow
			.getByRole('list')
			.getByText(/scan qr code/i)
			.click();

		const wasDialogOpen = await app.evaluate(
			({ BrowserWindow }) =>
				new Promise<true>((resolve) =>
					BrowserWindow.getFocusedWindow().once('blur', () => resolve(true)),
				),
		);
		expect(wasDialogOpen).toBeTruthy();
	});
});

test.describe('Workspace > Entry history', async () => {
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

	async function addHistoryEntry() {
		await appWindow.getByRole('main').getByRole('listitem').first().click();
		await appWindow.keyboard.press('Control+E');
		await appWindow
			.getByText(/edit\s*entry\s*in\s*general/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await appWindow.getByPlaceholder(/title/i).type('Aaaaa');
		await appWindow
			.getByRole('dialog')
			.getByRole('button', { name: /confirm/i })
			.click();
		await appWindow
			.getByText(/edit\s*entry\s*in\s*general/i)
			.waitFor({ state: 'hidden', timeout: 4000 });
		await appWindow.getByText(/show history/i).click();
		await appWindow
			.getByRole('dialog')
			.getByText(/entry history/i)
			.waitFor({ state: 'visible', timeout: 4000 });
	}

	test('Check history entry added', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await addHistoryEntry();
		const entriesCount = await appWindow
			.getByRole('dialog')
			.getByText(/#\d/i)
			.count();
		const title = await appWindow
			.getByRole('dialog')
			.getByText(/title1/i)
			.count();
		const username = await appWindow
			.getByRole('dialog')
			.getByText(/username1/i)
			.count();

		expect(entriesCount).toBe(1);
		expect(title).toBe(1);
		expect(username).toBe(1);
	});

	test('Check history entry restored', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await addHistoryEntry();
		await appWindow.getByRole('dialog').getByText(/view/i).click();
		await appWindow
			.getByText(/show history/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await appWindow
			.getByRole('dialog')
			.nth(1)
			.getByText(/restore/i)
			.click();
		await appWindow.getByRole('dialog').nth(1).waitFor({ state: 'detached' });
		await appWindow.keyboard.press('Escape');
		await appWindow.getByRole('dialog').waitFor({ state: 'detached' });
		await appWindow.keyboard.press('Control+E');
		const entryTitle = appWindow.getByRole('dialog').getByPlaceholder(/title/i);

		await expect(entryTitle).toHaveValue('Title1');
	});

	test('Check history entry removed', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await addHistoryEntry();
		await appWindow.getByRole('dialog').getByText(/view/i).click();
		await appWindow
			.getByText(/show history/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await appWindow
			.getByRole('dialog')
			.nth(1)
			.getByText(/delete/i)
			.click();
		await appWindow.getByRole('dialog').nth(1).waitFor({ state: 'detached' });
		const text = await appWindow.getByRole('dialog').innerText();

		expect(text).toContain('History is empty.');
	});
});

test.describe('Workspace > File', async () => {
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

	test('New file... option click should go to new vault screen', async () => {
		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow.getByText(/new file.../i).click();

		const dialogHeader = appWindow.getByRole('heading', {
			name: /create new vault/i,
		});
		const passwordInput = appWindow.getByPlaceholder(/new password/i);
		const repeatPasswordInput = appWindow.getByPlaceholder(/repeat password/i);

		await expect(dialogHeader).toBeVisible();
		await expect(passwordInput).toBeVisible();
		await expect(repeatPasswordInput).toBeVisible();
	});

	test('Open file... option click should open different vault master password screen', async () => {
		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow.getByText(/open file.../i).click();
		await appWindow.waitForTimeout(2000);
		const invoke = await getInvoke(appWindow);
		await invoke.evaluate((invoke) =>
			invoke('app:sendInput', 'test_copy.fbit'),
		);
		await invoke.evaluate((invoke) => invoke('app:sendInput', 13));

		await expect(appWindow.getByText(/vault: .*test_copy.fbit/i)).toBeVisible();
	});

	test('Open recent option click should open different vault master password screen', async () => {
		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow.getByText(/open file.../i).click();
		await appWindow.waitForTimeout(2000);
		const invoke = await getInvoke(appWindow);
		await invoke.evaluate((invoke) =>
			invoke('app:sendInput', 'test_copy.fbit'),
		);
		await invoke.evaluate((invoke) => invoke('app:sendInput', 13));
		await appWindow.waitForTimeout(2000);

		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow.getByText(/open recent/i).click();
		const option = await appWindow.getByText(/1:.*\.fbit/i).innerText();
		await appWindow.getByText(option).click();

		await expect(
			appWindow.getByText(
				new RegExp(`vault: .*${option.replace(/\d: /, '')}`, 'i'),
			),
		).toBeVisible();
	});

	test('Save option click should save updated vault', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow
			.getByRole('menubar')
			.getByText(/save ctrl\+s/i)
			.click();

		expect(await appWindow.getByRole('alert').innerText()).toMatch(
			/database saved/i,
		);

		await appWindow.getByRole('alert').click();
		await appWindow.getByRole('alert').waitFor({ state: 'detached' });
		await appWindow.getByRole('main').getByRole('listitem').first().click();
		await appWindow.keyboard.press('Delete');
		await appWindow
			.getByRole('dialog')
			.getByRole('button', { name: /remove/i })
			.click();
		await appWindow.getByRole('dialog').waitFor({ state: 'detached' });

		await appWindow.getByText(/recycle bin/i).click();
		await appWindow.getByRole('main').getByRole('listitem').first().click();
		await appWindow.keyboard.press('Delete');
		await appWindow
			.getByRole('dialog')
			.getByRole('button', { name: /remove/i })
			.click();
		await appWindow.getByRole('dialog').waitFor({ state: 'detached' });

		await appWindow.keyboard.press('Control+S');
		await appWindow.getByRole('alert').waitFor({ state: 'visible' });
	});

	test('Save as... option click should save same vault in new file', async () => {
		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow
			.getByRole('menubar')
			.getByText(/save as.../i)
			.click();
		await appWindow.waitForTimeout(2000);
		const invoke = await getInvoke(appWindow);
		await invoke.evaluate((invoke) =>
			invoke('app:sendInput', `test_${new Date().getTime()}.fbit`),
		);
		await invoke.evaluate((invoke) => invoke('app:sendInput', 13));

		expect(await appWindow.getByRole('alert').innerText()).toMatch(
			/database saved/i,
		);

		await invoke.evaluate((invoke) => invoke('app:testCleanup'));
	});

	test('Import option click should import KeePass entries', async () => {
		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow
			.getByRole('menubar')
			.getByText(/import/i)
			.click();
		await appWindow
			.getByRole('menubar')
			.getByText(/keepass/i)
			.click();
		await appWindow.waitForTimeout(2000);
		const invoke = await getInvoke(appWindow);
		await invoke.evaluate((invoke) => invoke('app:sendInput', 'keepass.xml'));
		await invoke.evaluate((invoke) => invoke('app:sendInput', 13));

		expect(
			await appWindow.getByRole('dialog').getByRole('heading').innerText(),
		).toMatch(/import database/i);
		await appWindow
			.getByRole('dialog')
			.getByRole('button', { name: /confirm/i })
			.click();

		expect(await appWindow.getByRole('alert').innerText()).toMatch(
			/passwords imported/i,
		);
	});

	test('Export option click should export entries', async () => {
		await addEntry(appWindow, { config: { close: true } });
		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow
			.getByRole('menubar')
			.getByText(/export/i)
			.click();
		await appWindow.getByRole('menubar').getByText(/csv/i).click();
		await appWindow.waitForTimeout(2000);
		const invoke = await getInvoke(appWindow);
		await invoke.evaluate((invoke) =>
			invoke('app:sendInput', `test_${new Date().getTime()}`),
		);
		await invoke.evaluate((invoke) => invoke('app:sendInput', 13));

		expect(await appWindow.getByRole('alert').innerText()).toMatch(
			/database exported/i,
		);

		await invoke.evaluate((invoke) => invoke('app:testCleanup'));
	});

	test('Change password option should change vault master password', async () => {
		await appWindow.getByRole('menubar').getByText(/file/i).click();
		await appWindow
			.getByRole('menubar')
			.getByText(/change password/i)
			.click();

		await appWindow.getByPlaceholder(/current password/i).fill('test123');
		const newPasswordFormControls = appWindow.getByPlaceholder(/new password/i);
		await newPasswordFormControls.first().fill('newpass123');
		await newPasswordFormControls.nth(1).fill('newpass123');
		await appWindow
			.getByRole('dialog')
			.getByRole('button', { name: /save/i })
			.click();

		const notification = appWindow.getByRole('alert');
		await expect(notification).toHaveText(/database saved/i);
	});
});
