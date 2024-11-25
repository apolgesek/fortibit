import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { createServiceDecorator } from '../di';
import { IExportService } from '../services/export';
import { IWindowService } from '../services/window';
import { IIpcEventHandler } from './ipc-event-handler.model';

export const IExportIpcEventHandler =
	createServiceDecorator<ExportIpcEventHandler>('exportIpcEventHandler');

export class ExportIpcEventHandler implements IIpcEventHandler {
	constructor(
		@IExportService private readonly _exportService: IExportService,
		@IWindowService private readonly _windowService: IWindowService,
	) {}

	initialize(): void {
		ipcMain.handle(
			IpcChannel.Export,
			(event: IpcMainInvokeEvent, database: string) => {
				return this._exportService.export(
					this._windowService.getWindowByWebContentsId(event.sender.id),
					database,
				);
			},
		);
	}
}
