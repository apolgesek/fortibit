import { createServiceDecorator } from '../di';
import { IIpcEventHandler } from './ipc-event-handler.model';
import { IWindowService } from '../services/window';
import {
	IEncryptionEventWrapper,
	MessageEventType,
} from '../services/encryption';
import { ipcMain } from 'electron';
import { IpcChannel } from '../../shared';

export const IEncryptionIpcEventHandler =
	createServiceDecorator<EncryptionIpcEventHandler>(
		'encryptionIpcEventHandler',
	);

export class EncryptionIpcEventHandler implements IIpcEventHandler {
	constructor(
		@IWindowService private readonly _windowService: IWindowService,
		@IEncryptionEventWrapper
		private readonly _encryptionEventWrapper: IEncryptionEventWrapper,
	) {}

	initialize(): void {
		ipcMain.handle(IpcChannel.EncryptPassword, async (event, password) => {
			const encryptionEvent = {
				type: MessageEventType.EncryptString,
				plain: password,
			};
			const response = (await this._encryptionEventWrapper.processEventAsync(
				encryptionEvent,
				this._windowService.getWindowByWebContentsId(event.sender.id)
					.key as string,
			)) as { encrypted: string };

			return response.encrypted;
		});

		ipcMain.handle(IpcChannel.DecryptPassword, async (event, password) => {
			const encryptionEvent = {
				type: MessageEventType.DecryptString,
				encrypted: password,
			};
			const response = (await this._encryptionEventWrapper.processEventAsync(
				encryptionEvent,
				this._windowService.getWindowByWebContentsId(event.sender.id)
					.key as string,
			)) as { decrypted: string };

			return response.decrypted;
		});
	}
}
