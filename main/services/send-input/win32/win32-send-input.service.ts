import { ProcessArgument } from '@root/main/process-argument.enum';
import { IpcMainEvent, app, ipcMain } from 'electron';
import { INativeApiService } from '../../native';
import { ISendInputService } from './../send-input.model';

export class Win32SendInputService implements ISendInputService {
	private readonly _keypressDelayMs = 0;
	private readonly _isTestMode = Boolean(
		app.commandLine.hasSwitch(ProcessArgument.E2E),
	);

	constructor(
		@INativeApiService private readonly _nativeApiService: INativeApiService,
	) {
		if (this._isTestMode) {
			ipcMain.handle(
				'app:sendInput',
				async (_: IpcMainEvent, token: string | number) => {
					if (typeof token === 'string') {
						return await this.typeWord(token);
					} else {
						return await this.pressKey(token);
					}
				},
			);
		}
	}

	async typeWord(word: string) {
		for (const char of word.split('')) {
			this._nativeApiService.pressPhraseKey(char);
			await this.sleep(this._keypressDelayMs);
		}
	}

	pressKey(key: number) {
		this._nativeApiService.pressKey(key);
	}

	sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
