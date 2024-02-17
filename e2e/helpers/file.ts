import { copyFileSync } from "fs";

export function setupTestFiles() {
  copyFileSync('./files/templates/test.fbit', './files/test.fbit');
	copyFileSync('./files/templates/test.fbit', './files/test_copy.fbit');
}