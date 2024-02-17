import { expect, test } from '@playwright/test';
import { ElectronApplication, Page, _electron as electron } from 'playwright';
import { ProcessArgument } from '../main/process-argument.enum';
import { addEntry } from './helpers/add-entry';
import { authenticate } from './helpers/auth';
import { getInvoke } from './helpers/ipc';
import { setupTestFiles } from './helpers/file';

const PATH = require('path');

let app: ElectronApplication;
let firstWindow: Page;

async function addGroup() {
	await firstWindow.getByText(/groups/i).hover();
	await firstWindow.getByLabel(/add group/i).waitFor({ state: 'visible' });
	await firstWindow.getByLabel(/add group/i).click();
	await firstWindow.getByPlaceholder(/name/i).waitFor({ state: 'attached' });
	await firstWindow.getByPlaceholder(/name/i).focus();
	await firstWindow.keyboard.insertText('new group');
	await firstWindow
		.getByRole('dialog')
		.getByRole('button', { name: /save/i })
		.click();
	await firstWindow.getByRole('dialog').waitFor({ state: 'detached' });
}

test.beforeEach(async () => {
	setupTestFiles();

	app = await electron.launch({
		args: [PATH.join(__dirname, '../main.js'), `--${ProcessArgument.E2E}`],
		colorScheme: 'dark',
		env: { E2E_FILES_PATH: 'C:\\Users\\icema\\fortibit\\e2e\\files' },
	});
	firstWindow = await app.firstWindow();
	await authenticate(firstWindow);
});

test.afterEach(async () => {
	await app.evaluate((process) => process.app.exit());
});

test.describe('Workspace > Entry & group', async () => {
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
		const noEntriesText = firstWindow.getByText(
			/there are no entries in this group/i,
		);
		await noEntriesText.waitFor({ state: 'visible', timeout: 4000 });

		expect(noEntriesText).toBeVisible();
	});

	test('Check entry modal opened', async () => {
		await firstWindow.getByRole('button', { name: /add entry/i }).click();
		const modalHeader = firstWindow.getByText(/add entry in general/i);
		await modalHeader.waitFor({ state: 'visible', timeout: 4000 });

		expect(modalHeader).toBeVisible();
	});

	test('Check entry added', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		const entryTitle = await firstWindow.getByText(/title1/i).count();
		const entryUsername = await firstWindow.getByText(/username1/i).count();
		const password = await firstWindow.getByText(/\•{6}/i).count();
		const noEntriesText = await firstWindow
			.getByText(/there are no entries in this group/i)
			.count();

		expect(entryTitle).toBe(1);
		expect(entryUsername).toBe(1);
		expect(password).toBe(1);
		expect(noEntriesText).toBe(0);
	});

	test('Check entry edited', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.getByRole('main').getByRole('listitem').first().click();
		await firstWindow.keyboard.press('Control+E');
		await firstWindow
			.getByText(/edit entry in general/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await firstWindow.getByPlaceholder(/title/i).fill('Different title');
		await firstWindow.getByText(/confirm/i).click();

		await expect(
			firstWindow
				.getByRole('main')
				.getByRole('listitem')
				.filter({ hasText: 'Different title' }),
		).toBeVisible();
		await expect(
			firstWindow
				.getByRole('main')
				.getByRole('listitem')
				.filter({ hasText: 'Username1' }),
		).toBeVisible();
	});

	test('Check entry modal closed', async () => {
		await firstWindow.getByRole('button', { name: /add entry/i }).click();
		await firstWindow
			.getByText(/add entry in general/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await firstWindow.keyboard.press('Escape');
		await firstWindow
			.getByText(/add entry in general/i)
			.waitFor({ state: 'hidden', timeout: 4000 });
	});

	test('Check entry removed', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		const newEntry = firstWindow.getByText(/username1/i);
		await newEntry.click();
		await firstWindow.keyboard.press('Delete');
		const removeBtn = firstWindow
			.getByRole('dialog')
			.getByRole('button', { name: /remove/i });
		await removeBtn.click();
		await firstWindow
			.getByText(/remove entry/i)
			.waitFor({ state: 'hidden', timeout: 4000 });
		const entryListCount = await firstWindow.getByText(/username1/i).count();

		expect(entryListCount).toBe(0);

		await firstWindow
			.getByRole('listitem')
			.getByText(/recycle bin/i)
			.click();
		const entry = firstWindow.getByRole('listitem').getByText(/username1/i);

		await expect(entry).toBeVisible();
	});

	test('Check entries removed', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await addEntry(firstWindow, { config: { close: true } });
		const entries = firstWindow.getByText(/username1/i);
		const firstEntry = await entries.nth(0);
		const secondEntry = await entries.nth(1);
		await firstEntry.click();
		await secondEntry.click({ modifiers: ['Control'] });
		await firstWindow.keyboard.press('Delete');
		const removeBtn = firstWindow
			.getByRole('dialog')
			.getByRole('button', { name: /remove/i });
		await removeBtn.click();
		await firstWindow
			.getByText(/remove entry/i)
			.waitFor({ state: 'hidden', timeout: 4000 });
		const entryListCount = await firstWindow.getByText(/username1/i).count();

		expect(entryListCount).toBe(0);

		await firstWindow
			.getByRole('listitem')
			.getByText(/recycle bin/i)
			.click();

		await expect(await entries).toHaveCount(2);
	});

	test('Check entry moved', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow
			.getByText(/username1/i)
			.dragTo(firstWindow.getByText(/banking/i));
		await firstWindow.getByText(/banking/i).click();
		await firstWindow.getByText(/username1/i).waitFor({ state: 'visible' });
		const entriesCount = await firstWindow.getByText(/username1/i).count();

		expect(entriesCount).toBe(1);
	});

	test('Check entries moved', async () => {
		await firstWindow.getByText(/banking/i).click();
		await addEntry(firstWindow, { config: { close: true } });
		await addEntry(firstWindow, { config: { close: true } });
		const rowEntries = firstWindow.getByText(/username1/i);
		await rowEntries.nth(0).click();
		const boundingBoxSource = await rowEntries.nth(1).boundingBox();
		await firstWindow.mouse.move(
			boundingBoxSource.x + boundingBoxSource.width / 2,
			boundingBoxSource.y + boundingBoxSource.height / 2,
			{ steps: 5 },
		);
		await firstWindow.keyboard.down('Control');
		await firstWindow.mouse.down();
		await firstWindow.mouse.up();
		await firstWindow.keyboard.up('Control');
		await firstWindow
			.getByText(/username1/i)
			.nth(0)
			.dragTo(firstWindow.getByText(/email/i));
		const entriesCount = await firstWindow.getByText(/username1/i).count();

		expect(entriesCount).toBe(0);
	});

	test('Check entry password copied', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		const entryPassword = firstWindow.getByText(/\•{6}/i);
		await entryPassword.dblclick();
		const notification = firstWindow.getByRole('alert');

		expect(await notification.innerText()).toMatch(/password copied/i);
	});

	test('Check entry added to favorites', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.getByRole('main').getByRole('listitem').first().click();

		await firstWindow.getByLabel(/add to favorites/i).click();
		const notification = await firstWindow.getByRole('alert').innerText();

		expect(notification).toMatch(/added to favorites/i);

		await firstWindow.getByText(/favorites/i).click();
		const entry = firstWindow.getByRole('listitem').getByText(/username1/i);

		await expect(entry).toBeVisible();
	});

	test('Check group added', async () => {
		await firstWindow.getByText(/groups/i).waitFor({ state: 'visible' });
		const groupCountBefore = await firstWindow.getByRole('listitem').count();
		await addGroup();
		const groupCountAfter = await firstWindow.getByRole('listitem').count();

		expect(groupCountAfter).toEqual(groupCountBefore + 1);
	});

	test('Check group name changed', async () => {
		await firstWindow.getByText(/banking/i).click({ button: 'right' });
		const contextMenu = firstWindow.getByTestId('context-menu');
		await contextMenu.getByText(/edit/i).click();
		await firstWindow.getByPlaceholder(/name/i).focus();
		await firstWindow.keyboard.insertText('example');
		await firstWindow
			.getByRole('dialog')
			.getByRole('button', { name: /save/i })
			.click();
		await firstWindow.getByRole('dialog').waitFor({ state: 'detached' });
		const changedNameGroup = firstWindow.getByText(/example/i);

		expect(changedNameGroup).toBeVisible();
	});

	test('Check group deleted', async () => {
		await firstWindow.getByText(/groups/i).waitFor({ state: 'visible' });
		const groupCountBefore = await firstWindow.getByRole('listitem').count();
		await firstWindow.getByText(/banking/i).click({ button: 'right' });
		await firstWindow.getByText(/delete/i).click();
		await firstWindow
			.getByRole('dialog')
			.getByRole('button', { name: /remove/i })
			.click();
		await firstWindow.getByRole('dialog').waitFor({ state: 'detached' });
		const groupCountAfter = await firstWindow.getByRole('listitem').count();

		expect(groupCountAfter).toEqual(groupCountBefore - 1);
	});

	test('Check add entry button disabled/hidden when built-in group active', async () => {
		const trashGroup = firstWindow
			.getByRole('listitem')
			.getByText(/recycle bin/i);
		const emailGroup = firstWindow.getByRole('listitem').getByText(/email/i);
		await trashGroup.click();
		let addNewButton = firstWindow.getByRole('link', { name: /add entry/i });
		const addEntryBtn = firstWindow.getByRole('button', { name: /add entry/i });
		let toolbarAddNewButtonDisabled =
			await addEntryBtn.getAttribute('disabled');

		await expect(addNewButton).not.toBeVisible();
		expect(toolbarAddNewButtonDisabled).toBe('');

		await emailGroup.click();

		await expect(addNewButton).toBeVisible();
		toolbarAddNewButtonDisabled = await addEntryBtn.getAttribute('disabled');
		expect(toolbarAddNewButtonDisabled).toBeNull();
	});

	test('Check entry local search', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await addEntry(firstWindow, {
			title: 'Aaaa',
			username: 'Bbbb',
			config: { close: true },
		});
		await firstWindow.getByPlaceholder(/search in group/i).focus();
		const searchPhrase = 'User';
		await firstWindow.keyboard.insertText(searchPhrase);
		const resultsBadge = firstWindow.getByText(/found \d entr(y|ies)/i);
		const resultsBadgeText = await resultsBadge.innerText();
		const row = firstWindow.getByText(/username1/i);
		const rowHTML = await row.innerHTML();

		expect(resultsBadge).toBeDefined();
		expect(resultsBadgeText).toMatch(/1/);
		expect(rowHTML).toMatch(searchPhrase);
	});

	test('Check entry global search', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		const group = firstWindow.getByRole('listitem').getByText(/email/i);
		await group.click();
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow
			.getByRole('button', { name: /search (all|selected) groups?/i })
			.click();
		await firstWindow.getByPlaceholder(/search all/i).type('User');
		const resultsBadge = firstWindow.getByText(/found \d entr(y|ies)/i);
		const resultsBadgeText = await resultsBadge.innerText();

		expect(resultsBadgeText).toMatch('2');
	});

	test('Check entry details', async () => {
		await addEntry(firstWindow);
		const title = await firstWindow.getByPlaceholder(/title/i).inputValue();
		await firstWindow
			.getByText(/add entry in general/i)
			.waitFor({ state: 'hidden', timeout: 4000 });
		await firstWindow.getByRole('main').getByRole('listitem').first().click();
		const header = await firstWindow.getByText(/general\s*title1/i).innerText();

		expect(header).toMatch(title);

		const entryHistoryButton = await firstWindow
			.getByRole('button', { name: /entry history/i })
			.count();
		const favoriteButton = await firstWindow
			.getByRole('button', { name: /add to favorites/i })
			.count();
		const openLinkButton = await firstWindow
			.getByRole('button', { name: /add to favorites/i })
			.count();
		const urlSection = await firstWindow.getByText(/^url$/i).count();
		const usernameSection = await firstWindow.getByText(/^username$/i).count();
		const passwordSection = await firstWindow.getByText(/^password$/i).count();
		const notesSection = await firstWindow.getByText(/^notes$/i).count();

		expect(entryHistoryButton).toBe(1);
		expect(favoriteButton).toBe(1);
		expect(openLinkButton).toBe(1);
		expect(urlSection).toBe(0);
		expect(usernameSection).toBe(1);
		expect(passwordSection).toBe(1);
		expect(notesSection).toBe(0);
	});

	test('Check weak passwords found', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.getByText(/tools/i).click();
		await firstWindow.getByText(/report/i).hover();
		await firstWindow.getByText(/weak passwords/i).click();
		await firstWindow
			.getByText(/weak passwords report/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await firstWindow.getByRole('button', { name: 'Scan' }).click();
		const lastScanDetails = firstWindow.getByText('Last scan');
		await lastScanDetails.waitFor({ state: 'visible' });
	});

	test('Check entry context menu displayed', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.getByText(/username1/i).click({ button: 'right' });
		const contextMenu = firstWindow.getByTestId('context-menu');
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
		await firstWindow
			.getByRole('listitem')
			.getByText(/email/i)
			.click({ button: 'right' });
		const contextMenu = firstWindow.getByTestId('context-menu');
		const editGroupOption = contextMenu.getByText(/edit (.*)/i);
		const removeGroupOption = contextMenu.getByText(/remove (.*)/i);

		expect(await editGroupOption.count()).toBe(1);
		expect(await removeGroupOption.count()).toBe(1);

		await firstWindow
			.getByRole('listitem')
			.getByText(/general/i)
			.click({ button: 'right' });

		expect(await removeGroupOption.count()).toBe(0);
		expect(await editGroupOption.count()).toBe(0);
	});

	test('Check sort by creation date', async () => {
		await addEntry(firstWindow, {
			config: { close: true },
			title: 'Abbbb',
			username: 'user',
		});
		await addEntry(firstWindow, {
			config: { close: true },
			title: 'Zeeee',
			username: 'user2',
		});
		await addEntry(firstWindow, { config: { close: true } });

		await firstWindow.getByText(/creation date/i).click();
		await firstWindow.getByText(/descending/i).click();
		await firstWindow.getByText(/ascending/i).click();

		const firstEntry = await firstWindow
			.getByRole('main')
			.getByRole('listitem')
			.first();
		expect(await firstEntry.innerText()).toMatch(/Abbbb/);

		await firstWindow
			.getByText(/creation date/i)
			.nth(1)
			.click();
		await firstWindow.getByText('Title', { exact: true }).click();
		await firstWindow.getByText(/ascending/i).click();
		await firstWindow.getByText(/descending/i).click();

		expect(await firstEntry.innerText()).toMatch(/Zeeee/);
	});

	test('Check password generated on modal open', async () => {
		await firstWindow.getByText(/tools/i).click();
		await firstWindow.getByText(/generator/i).click();
		await firstWindow
			.getByRole('dialog')
			.getByText(/generator/i)
			.waitFor({ state: 'visible' });
		const password = await firstWindow.getByTestId('password').innerText();

		expect(password).toHaveLength(15);
	});

	test('Check password generated when settings changed', async () => {
		await firstWindow.getByText(/tools/i).click();
		await firstWindow.getByText(/generator/i).click();
		await firstWindow
			.getByRole('dialog')
			.getByText(/generator/i)
			.waitFor({ state: 'visible' });
		const sliderTrack = firstWindow
			.getByRole('dialog')
			.getByTestId('slider-track');
		await sliderTrack.hover({ force: true, position: { x: 50, y: 0 } });
		await firstWindow.mouse.down();
		await firstWindow.mouse.up();
		await firstWindow.waitForTimeout(250);
		await firstWindow
			.getByRole('dialog')
			.getByText(/uppercase letters/i)
			.click();
		const password = await firstWindow.getByTestId('password').innerText();

		expect(password).toHaveLength(33);
		expect(password).toMatch(/[^A-Z]*/);
	});

	test('Check leaked passwords scan no results', async () => {
		await firstWindow.getByText('Tools', { exact: true }).click();
		await firstWindow.getByText(/report/i).click();
		await firstWindow.getByText(/leaked passwords/i).click();
		await firstWindow
			.getByText(/leaked passwords report/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await firstWindow.getByRole('button', { name: 'Scan' }).click();
		const lastScanDetails = firstWindow.getByText('Last scan');
		await lastScanDetails.waitFor({ state: 'visible' });
		const dialogContent = await firstWindow.getByRole('dialog').innerText();

		expect(dialogContent).toMatch(/you're all good/i);
	});

	test('Check leaked passwords scan detected leaks', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.getByText(/tools/i).click();
		await firstWindow.getByText(/report/i).click();
		await firstWindow.getByText(/leaked passwords/i).click();
		await firstWindow
			.getByText(/leaked passwords report/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await firstWindow.getByRole('button', { name: 'Scan' }).click();
		const lastScanDetails = firstWindow.getByText('Last scan');
		await lastScanDetails.waitFor({ state: 'visible' });
		const dialogContent = firstWindow.getByRole('dialog').innerText();

		expect(await dialogContent).toMatch(/\d+\s*exposed\s*passwords?\s*found/i);

		const editButton = firstWindow.getByRole('dialog').getByLabel('Edit');
		await editButton.scrollIntoViewIfNeeded();
		await editButton.click();

		await firstWindow
			.getByText(/edit entry in general/i)
			.waitFor({ state: 'visible', timeout: 4000 });
	});

	test('Check maintenance scan should remove entry according to input', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.getByRole('main').getByRole('listitem').first().click();
		await firstWindow.keyboard.press('Control+E');
		await firstWindow
			.getByText(/edit entry in general/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await firstWindow.getByPlaceholder(/title/i).type('Mail');
		await firstWindow.getByText(/confirm/i).click();
		await firstWindow
			.getByText(/edit entry in general/i)
			.waitFor({ state: 'hidden', timeout: 4000 });

		await firstWindow.getByRole('menubar').getByText(/tools/i).click();
		await firstWindow
			.getByRole('menubar')
			.getByText(/maintenance/i)
			.click();
		await firstWindow.getByRole('button', { name: /delete/i }).click();

		await expect(
			firstWindow.getByRole('dialog').getByText(/no entry to delete found/i),
		).toBeVisible();

		const daysInput = firstWindow
			.getByRole('dialog')
			.getByLabel(/delete history entries older than/i);
		await daysInput.clear();
		await daysInput.type('0');
		await firstWindow.getByRole('button', { name: /delete/i }).click();

		await expect(
			firstWindow.getByRole('dialog').getByText(/1\s+entry\s+deleted/i),
		).toBeVisible();
	});
});

test.describe('Workspace > Entry history', async () => {
	async function addHistoryEntry() {
		await firstWindow.getByRole('main').getByRole('listitem').first().click();
		await firstWindow.keyboard.press('Control+E');
		await firstWindow
			.getByText(/edit entry in general/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await firstWindow.getByPlaceholder(/title/i).type('Aaaaa');
		await firstWindow
			.getByRole('dialog')
			.getByRole('button', { name: /confirm/i })
			.click();
		await firstWindow
			.getByText(/edit entry in general/i)
			.waitFor({ state: 'hidden', timeout: 4000 });
		await firstWindow.getByLabel(/entry history/i).click();
		await firstWindow
			.getByRole('dialog')
			.getByText(/entry history/i)
			.waitFor({ state: 'visible', timeout: 4000 });
	}

	test('Check history entry added', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await addHistoryEntry();
		const entriesCount = await firstWindow
			.getByRole('dialog')
			.getByText(/#\d/i)
			.count();
		const title = await firstWindow
			.getByRole('dialog')
			.getByText(/title1/i)
			.count();
		const username = await firstWindow
			.getByRole('dialog')
			.getByText(/username1/i)
			.count();

		expect(entriesCount).toBe(1);
		expect(title).toBe(1);
		expect(username).toBe(1);
	});

	test('Check history entry restored', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await addHistoryEntry();
		await firstWindow.getByRole('dialog').getByText(/view/i).click();
		await firstWindow
			.getByText(/entry history/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await firstWindow
			.getByRole('dialog')
			.nth(1)
			.getByText(/restore/i)
			.click();
		await firstWindow.getByRole('dialog').nth(1).waitFor({ state: 'detached' });
		await firstWindow.keyboard.press('Escape');
		await firstWindow.getByRole('dialog').waitFor({ state: 'detached' });
		await firstWindow.keyboard.press('Control+E');
		const entryTitle = await firstWindow
			.getByRole('dialog')
			.getByPlaceholder(/title/i)
			.inputValue();

		expect(entryTitle).toBe('Title1');
	});

	test('Check history entry removed', async () => {
		await addEntry(firstWindow, { config: { close: true } });
		await addHistoryEntry();
		await firstWindow.getByRole('dialog').getByText(/view/i).click();
		await firstWindow
			.getByText(/entry history/i)
			.waitFor({ state: 'visible', timeout: 4000 });
		await firstWindow
			.getByRole('dialog')
			.nth(1)
			.getByText(/delete/i)
			.click();
		await firstWindow.getByRole('dialog').nth(1).waitFor({ state: 'detached' });
		const text = await firstWindow.getByRole('dialog').innerText();

		expect(text).toContain('History is empty.');
	});
});

test.describe('Workspace > File', async () => {
	test('New file... option click should go to new vault screen', async () => {
		await firstWindow.getByRole('menubar').getByText(/file/i).click();
		await firstWindow.getByText(/new file.../i).click();

		const dialogHeader = firstWindow.getByRole('heading', {
			name: /create new vault/i,
		});
		const passwordInput = firstWindow.getByPlaceholder(/new password/i);
		const repeatPasswordInput =
			firstWindow.getByPlaceholder(/repeat password/i);

		await expect(dialogHeader).toBeVisible();
		await expect(passwordInput).toBeVisible();
		await expect(repeatPasswordInput).toBeVisible();
	});

	test('Open file... option click should open different vault master password screen', async () => {
		await firstWindow.getByRole('menubar').getByText(/file/i).click();
		await firstWindow.getByText(/open file.../i).click();
		await firstWindow.waitForTimeout(2000);
		const invoke = await getInvoke(firstWindow);
		await invoke.evaluate((invoke) =>
			invoke('app:sendInput', 'test_copy.fbit'),
		);
		await invoke.evaluate((invoke) => invoke('app:sendInput', 13));

		await expect(
			firstWindow.getByText(/vault: .*test_copy.fbit/i),
		).toBeVisible();
	});

	test('Open recent option click should open different vault master password screen', async () => {
		await firstWindow.getByRole('menubar').getByText(/file/i).click();
		await firstWindow.getByText(/open file.../i).click();
		await firstWindow.waitForTimeout(2000);
		const invoke = await getInvoke(firstWindow);
		await invoke.evaluate((invoke) =>
			invoke('app:sendInput', 'test_copy.fbit'),
		);
		await invoke.evaluate((invoke) => invoke('app:sendInput', 13));
		await firstWindow.waitForTimeout(2000);

		await firstWindow.getByRole('menubar').getByText(/file/i).click();
		await firstWindow.getByText(/open recent/i).click();
		const option = await firstWindow.getByText(/1:.*\.fbit/i).innerText();
		await firstWindow.getByText(option).click();

		await expect(
			firstWindow.getByText(
				new RegExp(`vault: .*${option.replace(/\d: /, '')}`, 'i'),
			),
		).toBeVisible();
	});

	test('Save option click should save updated vault', async () => {
		await authenticate(firstWindow);
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.getByRole('menubar').getByText(/file/i).click();
		await firstWindow.getByRole('menubar').getByText(/save ctrl\+s/i).click();

		expect(await firstWindow.getByRole('alert').innerText()).toMatch(
			/database saved/i,
		);

		await firstWindow.getByRole('alert').click();
		await firstWindow.getByRole('alert').waitFor({ state: 'detached' });
		await firstWindow.getByRole('main').getByRole('listitem').first().click();
		await firstWindow.keyboard.press('Delete');
		await firstWindow
			.getByRole('dialog')
			.getByRole('button', { name: /remove/i })
			.click();
		await firstWindow.getByRole('dialog').waitFor({ state: 'detached' });

		await firstWindow.getByText(/recycle bin/i).click();
		await firstWindow.getByRole('main').getByRole('listitem').first().click();
		await firstWindow.keyboard.press('Delete');
		await firstWindow
			.getByRole('dialog')
			.getByRole('button', { name: /remove/i })
			.click();
		await firstWindow.getByRole('dialog').waitFor({ state: 'detached' });

		await firstWindow.keyboard.press('Control+S');
		await firstWindow.getByRole('alert').waitFor({ state: 'visible' });
	});

	test('Save as... option click should save same vault in new file', async () => {
		await authenticate(firstWindow);
		await firstWindow.getByRole('menubar').getByText(/file/i).click();
		await firstWindow
			.getByRole('menubar')
			.getByText(/save as.../i)
			.click();
		await firstWindow.waitForTimeout(2000);
		const invoke = await getInvoke(firstWindow);
		await invoke.evaluate((invoke) =>
			invoke('app:sendInput', `test_${new Date().getTime()}.fbit`),
		);
		await invoke.evaluate((invoke) => invoke('app:sendInput', 13));

		expect(await firstWindow.getByRole('alert').innerText()).toMatch(
			/database saved/i,
		);

		await invoke.evaluate((invoke) => invoke('app:testCleanup'));
	});

	test('Import option click should import KeePass entries', async () => {
		await authenticate(firstWindow);
		await firstWindow.getByRole('menubar').getByText(/file/i).click();
		await firstWindow
			.getByRole('menubar')
			.getByText(/import/i)
			.click();
		await firstWindow
			.getByRole('menubar')
			.getByText(/keepass/i)
			.click();
		await firstWindow.waitForTimeout(2000);
		const invoke = await getInvoke(firstWindow);
		await invoke.evaluate((invoke) => invoke('app:sendInput', 'keepass.xml'));
		await invoke.evaluate((invoke) => invoke('app:sendInput', 13));

		expect(
			await firstWindow.getByRole('dialog').getByRole('heading').innerText(),
		).toMatch(/import database/i);
		await firstWindow
			.getByRole('dialog')
			.getByRole('button', { name: /confirm/i })
			.click();

		expect(await firstWindow.getByRole('alert').innerText()).toMatch(
			/passwords imported/i,
		);
	});

	test('Export option click should export entries', async () => {
		await authenticate(firstWindow);
		await addEntry(firstWindow, { config: { close: true } });
		await firstWindow.getByRole('menubar').getByText(/file/i).click();
		await firstWindow
			.getByRole('menubar')
			.getByText(/export/i)
			.click();
		await firstWindow.getByRole('menubar').getByText(/csv/i).click();
		await firstWindow.waitForTimeout(2000);
		const invoke = await getInvoke(firstWindow);
		await invoke.evaluate((invoke) =>
			invoke('app:sendInput', `test_${new Date().getTime()}`),
		);
		await invoke.evaluate((invoke) => invoke('app:sendInput', 13));

		expect(await firstWindow.getByRole('alert').innerText()).toMatch(
			/database exported/i,
		);

		await invoke.evaluate((invoke) => invoke('app:testCleanup'));
	});
});
