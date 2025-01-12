import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { ipcMain } from 'electron';
import { createServiceDecorator } from '../di';
import { IIpcEventHandler } from './ipc-event-handler.model';
import { ITotpService } from '@root/main/services/totp';

export const ITotpIpcEventHandler = createServiceDecorator<TotpIpcEventHandler>(
	'totpIpcEventHandler',
);

export class TotpIpcEventHandler implements IIpcEventHandler {
	constructor(@ITotpService private readonly _totpService: ITotpService) {}

	initialize(): void {
		ipcMain.handle(IpcChannel.ScanQrCode, async (event) => {
			return this._totpService.scanQrCode(event.sender.id);
		});
	}
}
