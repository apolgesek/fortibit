import { copyFileSync } from 'fs';

export function setupTestFiles() {
	copyFileSync('./e2e/files/templates/test.fbit', './e2e/files/test.fbit');
	copyFileSync('./e2e/files/templates/test.fbit', './e2e/files/test_copy.fbit');
}
