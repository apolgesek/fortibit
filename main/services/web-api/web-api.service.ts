import { Configuration } from '@root/configuration';
import { IAsyncScheduler } from '@root/main/core/schedulers/async-scheduler.interface';
import { IpcChannel, PasswordEntry } from '../../../shared';
import { AsyncQueue } from '../../core/async-queue';
import { IAsyncQueue } from '../../core/async-queue.interface';
import { RoundRobinScheduler } from '../../core/schedulers/round-robin-scheduler';
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
	private _secureUrlQueue: IAsyncQueue<UrlEntries>;
	private _tfaQueue: IAsyncQueue<UrlEntries>;
	private _scheduler: IAsyncScheduler;

	constructor(
		@IConfigService private readonly _configService: IConfigService,
		@IWindowService private readonly _windowService: IWindowService,
	) {
		this._config = this._configService.appConfig;

		this._secureUrlQueue = new AsyncQueue<UrlEntries, string[]>(
			(item) => this.getEntriesStatus(item.urls, '/domain'),
			(item, result) => {
				if (result.length === 0) {
					return;
				}

				this._windowService.sendMessage(
					item.windowId,
					IpcChannel.UpdateSecureProtocolAvailability,
					result,
				);
			},
		);

		this._tfaQueue = new AsyncQueue<UrlEntries, string[]>(
			(item) => this.getEntriesStatus(item.urls, '/tfa/totp'),
			(item, result) => {
				if (result.length === 0) {
					return;
				}

				this._windowService.sendMessage(
					item.windowId,
					IpcChannel.UpdateTfaAvailability,
					result,
				);
			},
		);

		this._scheduler = new RoundRobinScheduler(
			[this._secureUrlQueue, this._tfaQueue],
			10,
		);
		this._scheduler.initialize();
	}

	checkSecureProtocol(windowId: number, entries: PasswordEntry[]) {
		// entries = Array.from(Array(500).keys()).map(() => ({ ...entries[0], url: 'http://google.pl', isSecureProtocolAvailable: false }));
		const batches = this.createBatches(entries, 100);

		batches.forEach((batch) => {
			this._secureUrlQueue.add({
				windowId: windowId,
				urls: batch
					.filter(
						(e) =>
							Boolean(e.url) &&
							!e.url!.startsWith('https') &&
							!e.isSecureProtocolAvailable,
					)
					.map((e) => e.url) as string[],
			});
		});
	}

	checkTfa(windowId: number, entries: PasswordEntry[]) {
		// entries = Array.from(Array(600).keys()).map(() => ({ ...entries[0], url: 'http://google.pl', isTfaAvailable: false }));
		const batches = this.createBatches(entries, 100);

		batches.forEach((batch) => {
			this._tfaQueue.add({
				windowId: windowId,
				urls: batch
					.filter((e) => Boolean(e.url) && !e.isTfaAvailable)
					.map((e) => e.url) as string[],
			});
		});
	}

	private async getEntriesStatus(
		urls: string[],
		path: string,
	): Promise<string[]> {
		const queryString = encodeURIComponent(
			urls.map((u) => getDomain(u)).join('|'),
		);

		console.log(this._config.webApiUrl + path, new Date());
		const response = await fetch(
			this._config.webApiUrl + path + '?n=' + queryString,
			{
				headers: { 'User-Agent': 'Fortibit/1.0.0' },
			},
		);

		if (response.ok) {
			return response.json();
		} else {
			return Promise.reject({
				message: `Failed to check domains at ${path}`,
				code: response.status,
			});
		}
	}

	private createBatches<T>(array: T[], size: number): T[][] {
		const batches: T[][] = [];

		for (let i = 0; i < array.length; i += size) {
			const batch: T[] = array.slice(i, i + size);
			batches.push(batch);
		}

		return batches;
	}
}
