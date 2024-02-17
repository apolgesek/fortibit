import { execSync } from 'child_process';
import { INativeApiService } from '../native-api.model';
import { systemPreferences } from 'electron';

export class DarwinApiService implements INativeApiService {
	setWindowAffinity(handle: Buffer, enabled: boolean): void {}

	async getPassword(windowHandleHex: Buffer, dbPath: string): Promise<string> {
		try {
			await systemPreferences.promptTouchID('asd');
			return 'test';
		} catch (err) {
			console.log('Could not verify identity with Touch ID.');
		}
	}

	saveCredential(dbPath: string, password: string): void {
		throw new Error('Method not implemented.');
	}

	removeCredential(dbPath: string): void {
		throw new Error('Method not implemented.');
	}

	listCredentials(): Promise<string[]> {
		throw new Error('Method not implemented.');
	}

	pressPhraseKey(char: string): void {
		try {
			execSync(`osascript SendString.scpt "${char}"`, { cwd: __dirname });
		} catch (error) {
			console.log(error);
		}
	}

	pressKey(key: number): void {
		try {
			execSync(
				`echo "tell application \\"System Events\\" to key code ${key}" | osascript`,
			);
		} catch (error) {
			console.log(error);
		}
	}

	getActiveWindowTitle(): string {
		try {
			const title = execSync('osascript GetActiveWindowTitle.scpt', {
				cwd: __dirname,
			});

			return title.toString('utf-8');
		} catch (error) {
			console.log(error);
		}
	}

	setLivePreviewBitmap(handle: Buffer, path: string): number {
		return 0;
	}

	setThumbnailBitmap(handle: Buffer, path: string): number {
		return 0;
	}

	setIconicBitmap(handle: Buffer): number {
		return 0;
	}

	unsetIconicBitmap(handle: Buffer): number {
		return 0;
	}

	verifySignature(path: string): boolean {
		return true;
	}
}
