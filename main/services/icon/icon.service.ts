import { PasswordEntry, IpcChannel } from '@shared-renderer/index';
import { app, ipcMain, IpcMainEvent } from 'electron';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import * as psl from 'psl';
import { IConfigService } from '../config';
import { IFileService } from '../file';
import { IWindowService } from '../window';
import { AsyncQueue } from './async-queue';
import { IAsyncQueue } from './async-queue.model';
import { IIconService } from './icon-service.model';

type Icon = {
	windowId: number;
	id: number;
	url: string;
};

export class IconService implements IIconService {
	private readonly iconDirectory: string;
	private readonly iconQueue: IAsyncQueue<Icon>;

	constructor(
		@IConfigService private readonly _configService: IConfigService,
		@IFileService private readonly _fileService: IFileService,
		@IWindowService private readonly _windowService: IWindowService,
	) {
		this.iconDirectory = join(
			app.getPath('appData'),
			this._configService.appConfig.name.toLowerCase(),
			'icons',
		);
		if (!existsSync(this.iconDirectory)) {
			mkdirSync(this.iconDirectory);
		}

		ipcMain.on(
			IpcChannel.TryGetIcon,
			async (event: IpcMainEvent, id: number, url: string) => {
				const iconPath = await this.tryGetIcon(url);
				const window = this._windowService.getWindowByWebContentsId(
					event.sender.id,
				);
				window.browserWindow.webContents.send(
					IpcChannel.UpdateIcon,
					id,
					iconPath,
				);
			},
		);

		ipcMain.on(
			IpcChannel.TryReplaceIcon,
			async (event: IpcMainEvent, id: number, path: string, newUrl: string) => {
				const iconPath = await this.tryReplaceIcon(path, newUrl);
				const window = this._windowService.getWindowByWebContentsId(
					event.sender.id,
				);
				window.browserWindow.webContents.send(
					IpcChannel.UpdateIcon,
					id,
					iconPath,
				);
			},
		);

		ipcMain.on(
			IpcChannel.RemoveIcon,
			async (event: IpcMainEvent, entry: PasswordEntry) => {
				await this.removeIcon(entry.icon);
				const window = this._windowService.getWindowByWebContentsId(
					event.sender.id,
				);
				window.browserWindow.webContents.send(IpcChannel.UpdateIcon, entry.id);
			},
		);

		ipcMain.handle(
			IpcChannel.CheckIconExists,
			(_: IpcMainEvent, path: string) => {
				return existsSync(path);
			},
		);

		this.iconQueue = new AsyncQueue<Icon, string>(
			(item) => this.getFile(item.url),
			(item, result) => {
				this._windowService
					.getWindowByWebContentsId(item.windowId)
					.browserWindow.webContents.send(
						IpcChannel.UpdateIcon,
						item.id,
						result,
					);
			},
		);
		this.iconQueue.process();
	}

	getIcons(windowId: number, entries: PasswordEntry[]) {
		for (const entry of entries) {
			if (
				entry.url &&
				(!entry.icon || entry.icon.startsWith('data:image/png'))
			) {
				this.iconQueue.add({ windowId, id: entry.id, url: entry.url });
			}
		}
	}

	async tryGetIcon(url: string): Promise<string> {
		return this.getFile(url);
	}

	async tryReplaceIcon(path: string, newUrl: string): Promise<string> {
		await this.removeIcon(path);

		if (newUrl) {
			return this.getFile(newUrl);
		} else {
			return Promise.resolve(null);
		}
	}

	removeIcon(path: string): Promise<boolean> {
		if (path && existsSync(path)) {
			unlinkSync(path);
			return Promise.resolve(true);
		}

		return Promise.resolve(false);
	}

	fixIcon(entry: PasswordEntry): void {
		if (
			entry.icon &&
			!entry.icon.startsWith('data:image/png') &&
			!existsSync(entry.icon)
		) {
			entry.icon = null;
		} else if (entry.url) {
			const filePath =
				join(this.iconDirectory, this.getFileName(entry.url)) + '.png';
			if (existsSync(filePath)) {
				entry.icon = filePath;
			}
		}
	}

	private async getFile(url: string): Promise<string> {
		const formattedHostname = await this.getFileName(url);

		const fileUrl =
			this._configService.appConfig.iconServiceUrl +
			'/icon/' +
			formattedHostname +
			'.png';
		const filePath = join(`${this.iconDirectory}`, `${formattedHostname}.png`);

		if (existsSync(filePath)) {
			return Promise.resolve(filePath);
		}

		return this._fileService.download(fileUrl, filePath);
	}

	private getFileName(url: string): string {
		if (!/^https?:\/\//.test(url)) {
			url = 'https://' + url;
		}

		url = psl.parse(new URL(url).hostname).domain;
		return url;
	}
}
