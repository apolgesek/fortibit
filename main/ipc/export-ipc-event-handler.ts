import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { dialog, ipcMain, IpcMainInvokeEvent } from 'electron';
import { createServiceDecorator } from '../di';
import { IConfigService } from '../services/config';
import { IExportService } from '../services/export';
import { IWindowService } from '../services/window';
import { getDefaultPath, getFileFilter } from '../util';
import { IIpcEventHandler } from './ipc-event-handler.model';

export const IExportIpcEventHandler =
	createServiceDecorator<ExportIpcEventHandler>('exportIpcEventHandler');

export class ExportIpcEventHandler implements IIpcEventHandler {
	constructor(
		@IExportService private readonly _exportService: IExportService,
		@IWindowService private readonly _windowService: IWindowService,
		@IConfigService private readonly _configService: IConfigService,
	) {}

	initialize(): void {
		ipcMain.handle(
			IpcChannel.Export,
			async (event: IpcMainInvokeEvent, database: string) => {
				const window = this._windowService.getWindowByWebContentsId(
					event.sender.id,
				);

				const saveDialogReturnValue = await dialog.showSaveDialog(
					window.browserWindow,
					{
						defaultPath: getDefaultPath(this._configService.appConfig, ''),
						filters: [getFileFilter(this._configService.appConfig, 'csv')],
					},
				);

				if (saveDialogReturnValue.canceled) {
					return false;
				}

				return this._exportService.export(
					window.key as string,
					saveDialogReturnValue.filePath,
					database,
				);
			},
		);
	}
}
