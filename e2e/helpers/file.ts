import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export function setupTestFiles() {
	const configPath = join(process.env.APPDATA, 'Electron', 'config');

	if (!existsSync(configPath)) {
		mkdirSync(configPath, { recursive: true });
	}

	copyFileSync('./e2e/files/templates/test.fbit', './e2e/files/test.fbit');
	copyFileSync('./e2e/files/templates/test.fbit', './e2e/files/test_copy.fbit');
	copyFileSync(
		'./e2e/files/templates/product.json',
		join(configPath, 'product.json'),
	);
	copyFileSync(
		'./e2e/files/templates/workspaces.json',
		join(configPath, 'workspaces.json'),
	);
}
