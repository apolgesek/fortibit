import { IpcChannel } from '@shared-renderer/index';
import { clipboard, ipcMain } from 'electron';
import { IConfigService } from '../config';
import { IClipboardService } from './clipboard-service.model';

export class ClipboardService implements IClipboardService {
	private _clearClipboardTimeout: NodeJS.Timeout;

	constructor(@IConfigService private readonly _configService: IConfigService) {
		ipcMain.handle(IpcChannel.CopyCliboard, async (_, value: string) => {
			return this.write(value);
		});
	}

	clear() {
		clipboard.clear();
		this._clearClipboardTimeout = null;
	}

	async write(content: string): Promise<boolean> {
		clearTimeout(this._clearClipboardTimeout);
		clipboard.writeText(content);

		this._clearClipboardTimeout = setTimeout(() => {
			this.clear();
		}, this._configService.appConfig.clipboardClearTimeMs);

		return true;
	}
}
