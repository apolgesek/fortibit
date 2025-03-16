/* eslint-disable playwright/valid-describe-callback */
import { expect, test } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright-core';
import { authenticate } from './helpers/auth';
import { getInvoke } from './helpers/ipc';
import { afterEach } from './hooks/after-each';
import { beforeEach } from './hooks/before-each';

test.describe('Master password', async () => {
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

	test('Check no password entered error message', async () => {
		await appWindow.getByPlaceholder(/password/i).focus();
		await appWindow.getByLabel(/unlock/i).click();
		const notification = appWindow.getByRole('alert');

		await expect(notification).toHaveText(/password is required/i);
	});

	test('Check windows hello screen dispayed', async () => {
		await authenticate(appWindow);
		await appWindow.getByRole('main').waitFor({ state: 'visible' });
		await appWindow.keyboard.press('Control+.');
		const dialog = appWindow.getByRole('dialog');
		await dialog.getByRole('button', { name: /integration/i }).click();
		await appWindow
			.getByRole('dialog')
			.getByText(/windows hello/i)
			.click();

		await appWindow
			.getByRole('dialog')
			.getByPlaceholder(/master password/i)
			.fill('test123');

		const addCredentialButton = dialog.getByRole('button', {
			name: /add credential/i,
		});

		// eslint-disable-next-line playwright/no-conditional-in-test
		if (await addCredentialButton.isVisible()) {
			await addCredentialButton.click();
		}

		await appWindow.keyboard.press('Control+L');
		await appWindow.getByRole('link', { name: /windows hello/i }).click();
		const overlay = appWindow.locator('.biometrics-overlay');

		await expect(overlay).toBeVisible();
		expect(await overlay.innerText()).toMatch(/waiting for windows hello/i);
	});

	test('Check wrong password entered error message', async () => {
		await appWindow.getByPlaceholder(/password/i).focus();
		await appWindow.keyboard.insertText('wr0ng_password');
		await appWindow.keyboard.press('Enter');
		await appWindow.waitForTimeout(1 * 1000); // wait to make sure this notification replaces the startup dummy one
		const notification = appWindow.getByRole('alert');

		await expect(notification).toHaveText(/password is incorrect/i);
	});

	test('Check settings modal open when not authenticated', async () => {
		await appWindow.getByRole('button', { name: /settings/i }).click();
		const dialogHeader = appWindow
			.getByRole('dialog')
			.getByRole('heading', { name: /settings/i });

		await expect(dialogHeader).toBeVisible();
	});

	test('Check new vault screen displayed on button click', async () => {
		await appWindow.getByRole('button', { name: /create new/i }).click();
		const dialogHeader = appWindow.getByRole('heading', {
			name: /create new vault/i,
		});
		const passwordInput = appWindow.getByPlaceholder(/new password/i);
		const repeatPasswordInput = appWindow.getByPlaceholder(/repeat password/i);

		await expect(dialogHeader).toBeVisible();
		await expect(passwordInput).toBeVisible();
		await expect(repeatPasswordInput).toBeVisible();
	});

	test('Check new vault created', async () => {
		await appWindow.getByRole('button', { name: /create new/i }).click();
		const passwordInput = appWindow.getByPlaceholder(/new password/i);
		const repeatPasswordInput = appWindow.getByPlaceholder(/repeat password/i);

		const password = 'test_password';
		await passwordInput.type(password);
		await repeatPasswordInput.type(password);

		await appWindow.getByRole('button', { name: /save/i }).click();
		// give electron time to open native window
		await appWindow.waitForTimeout(3_000);
		const invoke = await getInvoke(appWindow);
		await invoke.evaluate((invoke) =>
			invoke('app:sendInput', 'test_' + Date.now()),
		);
		await invoke.evaluate((invoke) => invoke('app:sendInput', 13));

		await expect(appWindow.getByRole('alert')).toHaveText(/database saved/i);
		await expect(appWindow.getByRole('main')).toBeVisible();

		await invoke.evaluate((invoke) => invoke('app:testCleanup'));
	});
});
