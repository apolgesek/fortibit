import { Configuration } from '@root/configuration';
import { PasswordEntry } from '@shared-renderer/index';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { ipcMain, IpcMainEvent } from 'electron';
import { createServiceDecorator } from '../di';
import { IAutotypeService } from '../services/autotype';
import { IWindowService } from '../services/window';
import { IIpcEventHandler } from './ipc-event-handler.model';

export const IAutotypeIpcEventHandler =
	createServiceDecorator<AutotypeIpcEventHandler>('autotypeIpcEventHandler');

export class AutotypeIpcEventHandler implements IIpcEventHandler {
	constructor(
		@IWindowService private readonly _windowService: IWindowService,
		@IAutotypeService private readonly _autotypeService: IAutotypeService,
	) {}

	initialize(): void {
		ipcMain.on(
			IpcChannel.AutotypeEntrySelected,
			(event: IpcMainEvent, entry: PasswordEntry) => {
				const browserWindow = this._windowService.getWindowByWebContentsId(
					event.sender.id,
				).browserWindow;
				browserWindow.blur();
				browserWindow.hide();
				this._autotypeService.typeLoginDetails(entry);
			},
		);

		ipcMain.handle(
			IpcChannel.ChangeEncryptionSettings,
			(_, form: Partial<Configuration>) => {
				this._autotypeService.changeEncryptionSettings(form);
			},
		);
	}
}
