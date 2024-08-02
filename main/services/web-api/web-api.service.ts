import { Configuration } from '@root/configuration';
import { IpcChannel, PasswordEntry } from '../../../shared';
import { AsyncQueue } from '../../core/async-queue';
import { IAsyncQueue } from '../../core/async-queue.model';
import { getDomain } from '../../util';
import { IConfigService } from '../config';
import { IWindowService } from '../window';
import { IWebApiService } from './web-api-service.model';

type UrlEntries = {
	windowId: number;
	urls: string[];
};

export class WebApiService implements IWebApiService {
	private readonly _config: Configuration;
	private _urlQueue: IAsyncQueue<UrlEntries>;

	constructor(
		@IConfigService private readonly _configService: IConfigService,
		@IWindowService private readonly _windowService: IWindowService,
	) {
		this._config = this._configService.appConfig;

		this._urlQueue = new AsyncQueue<UrlEntries, string[]>(
			(item) => this.getEntriesStatus(item.urls),
			(item, result) => {
				if (result.length === 0) {
					return;
				}

				this._windowService
					.getWindowByWebContentsId(item.windowId)
					.browserWindow.webContents.send(
						IpcChannel.UpdateSecureProtocolAvailability,
						result,
					);
			},
		);

		this._urlQueue.process();
	}

	checkSecureProtocol(windowId: number, entries: PasswordEntry[]) {
		this._urlQueue.add({
			windowId: windowId,
			urls: entries
				.filter(
					(e) =>
						Boolean(e.url) &&
						!e.url.startsWith('https') &&
						!e.isSecureProtocolAvailable,
				)
				.map((e) => e.url),
		});
	}

	private getEntriesStatus(urls: string[]): Promise<string[]> {
		const queryString = encodeURIComponent(
			urls.map((u) => getDomain(u)).join('|'),
		);

		return fetch(this._config.webApiUrl + '/domain?n=' + queryString, {
			headers: { 'User-Agent': 'Fortibit/1.0.0' },
		}).then((r) => r.json());
	}
}
