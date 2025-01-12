import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { existsSync } from 'fs';
import { IpcChannel, PasswordEntry } from '../../shared';
import { createServiceDecorator } from '../di';
import { IIconService } from '../services/icon';
import { IWindowService } from '../services/window';
import { IIpcEventHandler } from './ipc-event-handler.model';

export const IIconIpcEventHandler = createServiceDecorator<IconIpcEventHandler>(
	'iconIpcEventHandler',
);

export class IconIpcEventHandler implements IIpcEventHandler {
	constructor(
		@IIconService private readonly _iconService: IIconService,
		@IWindowService private readonly _windowService: IWindowService,
	) {}

	initialize(): void {
		ipcMain.on(
			IpcChannel.TryGetIcon,
			async (event: IpcMainEvent, id: number, url: string) => {
				const iconPath = await this._iconService.tryGetIcon(url);
				this._windowService.sendMessage(
					event.sender.id,
					IpcChannel.UpdateIcon,
					id,
					iconPath,
				);
			},
		);

		ipcMain.on(
			IpcChannel.TryReplaceIcon,
			async (event: IpcMainEvent, id: number, path: string, newUrl: string) => {
				const iconPath = await this._iconService.tryReplaceIcon(path, newUrl);
				this._windowService.sendMessage(
					event.sender.id,
					IpcChannel.UpdateIcon,
					id,
					iconPath,
				);
			},
		);

		ipcMain.on(
			IpcChannel.RemoveIcon,
			async (event: IpcMainEvent, entry: PasswordEntry) => {
				await this._iconService.removeIcon(entry.icon);
				this._windowService.sendMessage(
					event.sender.id,
					IpcChannel.UpdateIcon,
					entry.id,
				);
			},
		);

		ipcMain.handle(
			IpcChannel.CheckIconExists,
			(_: IpcMainInvokeEvent, path: string) => {
				return existsSync(path);
			},
		);
	}
}
