import { execSync } from 'child_process';
import { INativeApiService } from '../native-api.model';
import { app, systemPreferences } from 'electron';
import { ProcessArgument } from '@root/main/process-argument.enum';

export class DarwinApiService implements INativeApiService {
	private readonly _isTestMode = Boolean(
		app.commandLine.hasSwitch(ProcessArgument.E2E),
	);

	readRegistryKey(key: string, value: string): string {
		return '';
	}

	setWindowAffinity(handle: Buffer, enabled: boolean): void {}

	async getPassword(windowHandleHex: Buffer, dbPath: string): Promise<string> {
		try {
			if (this._isTestMode) return Promise.resolve('test123');

			await systemPreferences.promptTouchID('test');
			return 'test';
		} catch {
			throw new Error('Could not verify identity with Touch ID.');
		}
	}

	saveCredential(dbPath: string, password: string): void {
		throw new Error('Method not implemented.');
	}

	removeCredential(dbPath: string): void {
		throw new Error('Method not implemented.');
	}

	listCredentials(): Promise<string[]> {
		return Promise.resolve([]);
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
		const title = execSync('osascript GetActiveWindowTitle.scpt', {
			cwd: __dirname,
		});

		return title.toString('utf-8');
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
