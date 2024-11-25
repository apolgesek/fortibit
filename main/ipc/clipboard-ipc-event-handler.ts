import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { ipcMain } from 'electron';
import { createServiceDecorator } from '../di';
import { IClipboardService } from '../services/clipboard';
import { IIpcEventHandler } from './ipc-event-handler.model';

export const IClipboardIpcEventHandler =
	createServiceDecorator<ClipboardIpcEventHandler>('clipboardIpcEventHandler');

export class ClipboardIpcEventHandler implements IIpcEventHandler {
	constructor(
		@IClipboardService private readonly _clipboardService: IClipboardService,
	) {}

	initialize(): void {
		ipcMain.handle(IpcChannel.CopyCliboard, async (_, value: string) => {
			return this._clipboardService.write(value);
		});
	}
}
