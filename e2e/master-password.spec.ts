import { expect, test } from '@playwright/test';
import {
	ElectronApplication,
	Page,
	_electron as electron,
} from 'playwright-core';
import { ProcessArgument } from '../main/process-argument.enum';
import { getInvoke } from './helpers/ipc';
import { authenticate } from './helpers/auth';
import { setupTestFiles } from './helpers/file';

const PATH = require('path');

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
});

test.afterEach(async () => {
	await app.evaluate((process) => process.app.exit());
});

test.describe('Master password', async () => {
	test('Check no password entered error message', async () => {
		await firstWindow.getByPlaceholder(/password/i).focus();
		await firstWindow.getByLabel(/unlock/i).click();
		const notification = firstWindow.getByRole('alert');

		expect(await notification.innerText()).toMatch(/password is required/i);
	});

	test('Check windows hello screen dispayed', async () => {
		await authenticate(firstWindow);
		await firstWindow.getByRole('main').waitFor({ state: 'visible' });
		await firstWindow.keyboard.press('Control+.');
		const dialog = firstWindow.getByRole('dialog');
		await dialog.getByRole('button', { name: /integration/i }).click();
		const biometricsAuthCheckbox = dialog.getByLabel(/windows hello/i);

		if (!(await biometricsAuthCheckbox.isChecked())) {
			await dialog.getByText(/windows hello/i).click();
			const addCredentialButton = dialog.getByRole('button', {
				name: /add credential/i,
			});

			if (await addCredentialButton.isVisible()) {
				await addCredentialButton.click();
			}
		}

		await firstWindow.keyboard.press('Control+L');
		await firstWindow
			.getByRole('button', { name: /unlock with windows hello/i })
			.click();
		const overlay = firstWindow.locator('.biometrics-overlay');

		await expect(overlay).toBeVisible();
		expect(await overlay.innerText()).toMatch(/waiting for windows hello/i);
	});

	test('Check wrong password entered error message', async () => {
		await firstWindow.getByPlaceholder(/password/i).focus();
		await firstWindow.keyboard.insertText('wr0ng_password');
		await firstWindow.keyboard.press('Enter');
		await firstWindow.waitForTimeout(500); // wait to make sure this notification replaces the startup dummy one
		const notification = firstWindow.getByRole('alert');

		expect(await notification.innerText()).toMatch(/password is invalid/i);
	});

	test('Check settings modal open when not authenticated', async () => {
		await firstWindow.getByRole('button', { name: /settings/i }).click();
		const dialogHeader = await firstWindow
			.getByRole('dialog')
			.getByRole('heading', { name: /settings/i });

		await expect(dialogHeader).toBeVisible();
	});

	test('Check new vault screen displayed on button click', async () => {
		await firstWindow.getByRole('button', { name: /create new/i }).click();
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

	test('Check new vault created', async () => {
		await firstWindow.getByRole('button', { name: /create new/i }).click();
		const passwordInput = firstWindow.getByPlaceholder(/new password/i);
		const repeatPasswordInput =
			firstWindow.getByPlaceholder(/repeat password/i);

		const password = 'test_password';
		await passwordInput.type(password);
		await repeatPasswordInput.type(password);

		await firstWindow.getByRole('button', { name: /save/i }).click();
		// give electron time to open native window
		await firstWindow.waitForTimeout(2000);
		const invoke = await getInvoke(firstWindow);
		await invoke.evaluate((invoke) =>
			invoke('app:sendInput', 'test_' + Date.now()),
		);
		await invoke.evaluate((invoke) => invoke('app:sendInput', 13));

		expect(await firstWindow.getByRole('alert').innerText()).toMatch(
			/database saved/i,
		);
		await expect(firstWindow.getByRole('main')).toBeVisible();

		await invoke.evaluate((invoke) => invoke('app:testCleanup'));
	});
});
