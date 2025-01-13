import { execSync } from 'child_process';
import { INativeApiService } from '../native-api.model';
import { app, systemPreferences } from 'electron';
import { ProcessArgument } from '@root/main/process-argument.enum';

const utf8ToHex = (str) => Buffer.from(str, 'utf8').toString('hex');
const hexToUtf8 = (hex) => Buffer.from(hex, 'hex').toString('utf8');

export class DarwinApiService implements INativeApiService {
	private readonly _isTestMode = Boolean(
		app.commandLine.hasSwitch(ProcessArgument.E2E),
	);

	readRegistryKey(key: string, value: string): string {
		return '';
	}

	async getPassword(windowHandleHex: Buffer, dbPath: string): Promise<string> {
		try {
			if (this._isTestMode) return Promise.resolve('test123');

			await systemPreferences.promptTouchID('test');
			return execSync(`security find-generic-password -a "Fortibit" -s "${utf8ToHex(dbPath)}" -w`).toString('utf-8').trim();
		} catch {
			throw new Error('Could not verify identity with Touch ID.');
		}
	}

	saveCredential(dbPath: string, password: string): void {
		execSync(`security add-generic-password -a "Fortibit" -s "${utf8ToHex(dbPath)}" -w ${password}`);
	}

	removeCredential(dbPath: string): void {
		execSync(`security delete-generic-password -a "Fortibit" -s "${utf8ToHex(dbPath)}"`);
	}

	listCredentials(): Promise<string[]> {
		const credentials = execSync(`security dump-keychain | awk '/"acct"<blob>="Fortibit"/ {found=1} /"svce"<blob>/ && found {print $0; found=0}' | awk -F'=' '/"svce"<blob>/ {gsub(/"/, "", $2); print $2}'`)
			.toString('utf-8').split('\n').filter(x => Boolean(x));

		return Promise.resolve(credentials.map(x => hexToUtf8(x)));
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
