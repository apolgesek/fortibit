import { ProcessArgument } from '@root/main/process-argument.enum';
import { join } from 'path';
import { _electron as electron } from 'playwright-core';
import { authenticate } from '../helpers/auth';
import { setupTestFiles } from '../helpers/file';

export async function beforeEach(auth = true) {
	setupTestFiles();

	const app = await electron.launch({
		args: [join(__dirname, '../../main.js'), `--${ProcessArgument.E2E}`],
		colorScheme: 'no-preference',
		env: { E2E_FILES_PATH: 'C:\\Users\\icema\\fortibit\\e2e\\files' },
	});

	const firstWindow = await app.firstWindow();

	if (auth) {
		await authenticate(firstWindow);
		await firstWindow.getByRole('main').waitFor({ state: 'visible' });
	} else {
		await app.waitForEvent('window');
	}

	return { appInstance: app, windowInstance: firstWindow };
}
