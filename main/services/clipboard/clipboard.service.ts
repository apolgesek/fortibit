import { clipboard } from 'electron';
import { IConfigService } from '../config';
import { IClipboardService } from './clipboard-service.model';

export class ClipboardService implements IClipboardService {
	private _clearClipboardTimeout: NodeJS.Timeout | null;

	constructor(
		@IConfigService private readonly _configService: IConfigService,
	) {}

	clear() {
		clipboard.clear();
		this._clearClipboardTimeout = null;
	}

	async write(content: string): Promise<boolean> {
		if (this._clearClipboardTimeout) {
			clearTimeout(this._clearClipboardTimeout);
		}

		clipboard.writeText(content);

		this._clearClipboardTimeout = setTimeout(() => {
			this.clear();
		}, this._configService.appConfig.clipboardClearTimeMs);

		return true;
	}
}
