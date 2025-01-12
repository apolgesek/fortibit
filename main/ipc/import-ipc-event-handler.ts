import { ImportHandler } from '@shared-renderer/import-handler.enum';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { dialog, ipcMain, IpcMainInvokeEvent } from 'electron';
import { createServiceDecorator } from '../di';
import { IImportService } from '../services/import';
import { IIpcEventHandler } from './ipc-event-handler.model';
import { getDefaultPath, getFileFilter } from '../util';
import { IConfigService } from '../services/config';
import { IWindowService } from '../services/window';

export const IImportIpcEventHandler =
	createServiceDecorator<ImportIpcEventHandler>('importIpcEventHandler');

export class ImportIpcEventHandler implements IIpcEventHandler {
	constructor(
		@IImportService private readonly _importService: IImportService,
		@IConfigService private readonly _configService: IConfigService,
		@IWindowService private readonly _windowService: IWindowService,
	) {}

	initialize(): void {
		ipcMain.handle(
			IpcChannel.GetImportedDatabaseMetadata,
			async (_: IpcMainInvokeEvent, type: ImportHandler) => {
				this._importService.setHandler(type);
				const handler = this._importService.getHandler();
				const fileData = await dialog.showOpenDialog({
					properties: ['openFile'],
					defaultPath: getDefaultPath(this._configService.appConfig, ''),
					filters: [
						getFileFilter(this._configService.appConfig, handler.fileExtension),
					],
				});

				if (fileData.canceled) {
					return;
				}

				return handler.getMetadata(fileData);
			},
		);

		ipcMain.handle(
			IpcChannel.Import,
			(event: IpcMainInvokeEvent, filePath: string, type: ImportHandler) => {
				this._importService.setHandler(type);
				const key = this._windowService.getWindowByWebContentsId(
					event.sender.id,
				).key;

				return this._importService.getHandler().import(key as string, filePath);
			},
		);
	}
}
